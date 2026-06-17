import { useCallback, useEffect, useRef, useState } from 'react'
import { setLang, t } from './i18n'
import { getAgent, init, retractMessage, sendMessage, sendRead, sendTyping, setOnUnauthorized, setToken, syncMessages, uploadFile } from './api'
import { messengerWs, type WsStatus } from './ws'
import { ensureNotifyPermission, playBeep, setTitleUnread, showPopup, unlockAudio } from './notify'
import type { AccessParams, MessageVO, MessengerAgent, MessengerInit, PendingMsg } from './types'
import Home from './screens/Home'
import Chat from './screens/Chat'

// 游客身份:无 userId/visitorId 时按 appId 维度生成并持久化匿名 visitorId
// (匿名标识、非敏感凭证;否则游客每次刷新都新建会话/客户)
function getOrCreateVisitorId(appId: string): string {
  const key = `aitalky_visitor_${appId}`
  let vid = localStorage.getItem(key)
  if (!vid) {
    const rand =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    vid = `v_${rand}`
    localStorage.setItem(key, vid)
  }
  return vid
}

// 解析 URL 接入参数(对齐参考系统):?appId=&groupId=(游客);带 &userId= 则为实名业务用户。
// appId=项目级接入标识;groupId=专属分配策略标识(决定分到哪组队友,asn 模块未做时后端忽略)。
function parseAccess(): AccessParams | null {
  const q = new URLSearchParams(location.search)
  const appId = q.get('appId') || ''
  if (!appId) return null
  const userId = q.get('userId') || undefined
  let visitorId = q.get('visitorId') || undefined
  // 无业务 userId(也无显式 visitorId)→ 游客接入,用持久化匿名身份兜底
  if (!userId && !visitorId) visitorId = getOrCreateVisitorId(appId)
  return {
    appId,
    groupId: q.get('groupId') || undefined,
    userId,
    visitorId,
    // URL 不指定 lang 时留空,由后端按信使设置默认语言决定(init 返回 config.lang)
    lang: q.get('lang') || '',
    source: q.get('source') || 'web',
  }
}

// 合并消息:按 seq 去重 + 升序插入(补漏拉回的旧 seq 落到正确位置,而非追加到底)
// 兜底过滤内部消息(internal=true,如"分配给X"/"会话超时结束"等坐席专属系统消息):
// 后端 REST/WS 本就不向客户下发,但前端不能信任来源唯一,在消息进 state 的唯一入口再拦一道,
// 避免任何路径(sync 对账/异常下发)把仅坐席可见的系统消息漏给终端客户。
function mergeMessages(prev: MessageVO[], incoming: MessageVO[]): MessageVO[] {
  const visible = incoming.filter((m) => m.internal !== true)
  if (visible.length === 0) return prev
  const bySeq = new Map<number, MessageVO>()
  for (const m of prev) bySeq.set(m.seq, m)
  for (const m of visible) bySeq.set(m.seq, m)
  return Array.from(bySeq.values()).sort((a, b) => a.seq - b.seq)
}

// 周期对账兜底:信使端没有"列表 lastSeq"可对账,用 12s 轮询 sync 覆盖"静默期最后一帧丢失"
const SYNC_POLL = 12_000

export default function App() {
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [screen, setScreen] = useState<'home' | 'chat'>('home')
  const [data, setData] = useState<MessengerInit | null>(null)
  const [agent, setAgent] = useState<MessengerAgent | null>(null) // 服务坐席头部(随上下线/认领刷新)
  const [messages, setMessages] = useState<MessageVO[]>([])
  // WS 状态:头部不再展示连接态(对齐参考),仅保留 setter 驱动重连补漏
  const [, setStatus] = useState<WsStatus>('closed')
  // 本地待发/失败消息(乐观渲染,未落库);成功后移除并以服务端消息按 seq 入列
  const [pending, setPending] = useState<PendingMsg[]>([])
  // 对方(客服)正在输入(瞬时,4s 无新事件自动消失;受 sysMsgTyping 开关控制)
  const [peerTyping, setPeerTyping] = useState(false)
  // 未读分割:进入聊天时的"已读到 seq",界后首条画"以下为未读消息"(受 sysMsgUnread 控制)
  const [unreadAfterSeq, setUnreadAfterSeq] = useState<number | null>(null)

  // 补漏对账基准:本地已收到的最大 seq(以实际 max(seq) 前进,容忍空洞)
  const localMaxSeqRef = useRef(0)
  const syncingRef = useRef(false)
  const convIdRef = useRef<string>('')
  // typing:节流发送时间戳 + 显示自动清除定时器 + sysMsgTyping 开关(避免 WS 监听依赖 data 重订阅)
  const lastTypingRef = useRef(0)
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sysTypingRef = useRef(true)
  // 已读水位:离开聊天时推进到当时最大 seq;进入聊天据此算未读分割线
  const lastReadSeqRef = useRef(0)
  // 已读上报(静默):上次上报给后端的已读 seq(单调前进,去重)
  const lastReadReportRef = useRef(0)
  // 弹窗提醒开关 + 品牌名(失焦时新消息通知用);避免 WS 监听依赖 data 重订阅
  const popupRef = useRef(true)
  const brandRef = useRef('')
  // 失焦期间累计未读(标签页标题 "(N)" 提醒;聚焦清零)
  const hiddenUnreadRef = useRef(0)
  // 轻量 toast:文件超限/类型不支持/上传失败等即时提示(信使端原无 toast 体系,补一个最小实现);2.6s 自动消失
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const applyIncoming = useCallback((incoming: MessageVO[]) => {
    if (incoming.length === 0) return
    setMessages((prev) => mergeMessages(prev, incoming))
    const maxIn = incoming.reduce((m, x) => Math.max(m, x.seq), 0)
    if (maxIn > localMaxSeqRef.current) localMaxSeqRef.current = maxIn
  }, [])

  // 补漏:拉 localMaxSeq 之后的消息并入(并发去抖)
  const syncNow = useCallback(async () => {
    const cid = convIdRef.current
    if (!cid || syncingRef.current) return
    syncingRef.current = true
    try {
      applyIncoming(await syncMessages(cid, localMaxSeqRef.current))
    } catch {
      // 拉取失败(网络)忽略,下次对账/重连再补
    } finally {
      syncingRef.current = false
    }
  }, [applyIncoming])
  const syncRef = useRef(syncNow)
  syncRef.current = syncNow

  // 已读上报(静默,无 UI):仅"在聊天界面 + 标签页可见"时,把当前已读位推给后端(坐席端显示"已读")
  const reportReadRef = useRef<() => void>(() => {})
  reportReadRef.current = () => {
    const cid = convIdRef.current
    const seq = localMaxSeqRef.current
    if (!cid || screen !== 'chat' || document.hidden || seq <= lastReadReportRef.current) return
    lastReadReportRef.current = seq
    void sendRead(cid, seq).catch(() => {})
  }
  // 进聊天 / 新消息到达(在看时)→ 上报已读
  useEffect(() => { reportReadRef.current() }, [messages, screen])

  // 刷新服务坐席头部(坐席上下线/会话被认领时)
  const refreshAgentRef = useRef<() => void>(() => {})
  refreshAgentRef.current = () => {
    const cid = convIdRef.current
    if (!cid) return
    getAgent(cid).then(setAgent).catch(() => {})
  }

  // ===== 启动:解析参数 → init → 连 WS → 拉历史 =====
  // 初始化/重新初始化会话:首次挂载调用;客户令牌过期(401)时也调用,静默换新令牌+会话+重连 WS。
  // reinit=true 表示是过期后的静默重建,失败不翻成 error 页(保持当前聊天,避免误把可用会话变报错)。
  const reinitingRef = useRef(false)
  const everReadyRef = useRef(false)
  const doInit = useCallback(async (reinit = false) => {
    if (reinitingRef.current) return // 并发去抖:多个请求同时 401 只重建一次
    reinitingRef.current = true
    const access = parseAccess()
    if (!access) {
      setPhase('error')
      reinitingRef.current = false
      return
    }
    setLang(access.lang)
    try {
      const d = await init(access)
      setToken(d.token)
      convIdRef.current = d.conversationId
      localMaxSeqRef.current = 0
      sysTypingRef.current = d.config?.sysMsgTyping ?? true
      popupRef.current = d.config?.popupEnabled ?? true
      brandRef.current = d.config?.brandName || d.customerName || ''
      // 生效语言:后端按"URL ?lang= 优先,否则信使设置默认语言"算出 config.lang,前端据此切换
      setLang(d.config?.lang || access.lang)
      setData(d)
      setAgent(d.agent)
      setPhase('ready')
      everReadyRef.current = true
      // 自定义网站标题(URL 接入,浏览器标签页)
      if (d.config?.webTitle?.trim()) document.title = d.config.webTitle
      messengerWs.close() // 重建时先断旧连接(旧令牌已失效),再用新令牌连
      messengerWs.connect(d.token)
      // 拉历史(最近 50);localMaxSeq = 最新 seq
      const history = await syncMessages(d.conversationId)
      const sorted = mergeMessages([], history)
      setMessages(sorted)
      localMaxSeqRef.current = sorted.reduce((m, x) => Math.max(m, x.seq), 0)
      // 历史视为已读:首次进聊天不显未读分割线(只标"离开后新来的")
      lastReadSeqRef.current = localMaxSeqRef.current
    } catch {
      // 首次 init 失败 → 错误页;过期重建失败 → 保持现状(下次请求/轮询再触发)
      if (!reinit && !everReadyRef.current) setPhase('error')
    } finally {
      reinitingRef.current = false
    }
  }, [])

  useEffect(() => {
    void doInit()
    // 注册 401 处理:令牌过期时静默重建(setOnUnauthorized 见 api.ts)
    setOnUnauthorized(() => { void doInit(true) })
    return () => {
      setOnUnauthorized(null)
      messengerWs.close()
    }
  }, [doInit])

  // ===== WS 监听:状态 + 消息(网②gap 检测)=====
  useEffect(() => {
    const offStatus = messengerWs.onStatus(setStatus)
    const offMsg = messengerWs.onMessage((msg) => {
      if (msg.conversationId !== convIdRef.current) return
      if (msg.seq > localMaxSeqRef.current + 1) syncRef.current() // 跳号→漏帧→补拉
      if (msg.senderType === 'agent') {
        setPeerTyping(false) // 客服发出消息→输入态结束
        refreshAgentRef.current() // 坐席回复常意味着会话被认领/分配变化,刷新头部坐席
        // 失焦时新消息提醒:声效恒开,弹窗受 popupEnabled 控制(撤回的空消息不提醒)
        if (document.hidden && msg.isVisible !== false) {
          playBeep()
          hiddenUnreadRef.current += 1
          setTitleUnread(hiddenUnreadRef.current)
          if (popupRef.current) showPopup(brandRef.current || msg.senderName || '', msg.content || '')
        }
      }
      applyIncoming([msg])
    })
    // typing:仅响应客服(from=agent)且开关开启;4s 无新事件自动消失
    const offTyping = messengerWs.onTyping((e) => {
      if (e.from !== 'agent' || e.conversationId !== convIdRef.current || !sysTypingRef.current) return
      setPeerTyping(true)
      clearTimeout(typingClearRef.current)
      typingClearRef.current = setTimeout(() => setPeerTyping(false), 4000)
    })
    // 网①重连补漏 + 网③周期对账/聚焦补漏(顺带刷新坐席头部)
    const offOpen = messengerWs.onOpen(() => { syncRef.current(); refreshAgentRef.current() })
    const poll = setInterval(() => syncRef.current(), SYNC_POLL)
    // 聚焦/可见:清标题未读数 + 对账补漏 + 刷新坐席在线状态
    const clearTitle = () => { hiddenUnreadRef.current = 0; setTitleUnread(0) }
    const onVisible = () => {
      if (document.visibilityState === 'visible') { clearTitle(); syncRef.current(); reportReadRef.current(); refreshAgentRef.current() }
    }
    const onFocus = () => { clearTitle(); syncRef.current(); reportReadRef.current(); refreshAgentRef.current() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      offStatus()
      offMsg()
      offTyping()
      offOpen()
      clearInterval(poll)
      clearTimeout(typingClearRef.current)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [applyIncoming])

  // 真正发送:成功→服务端消息按 seq 入列并移除本地态;失败→标红保留(带错误码供本地化提示)
  const trySend = useCallback(
    async (localId: string, content: string) => {
      const cid = convIdRef.current
      if (!cid) return
      setPending((p) => p.map((x) => (x.localId === localId ? { ...x, status: 'sending', errorCode: undefined } : x)))
      try {
        const vo = await sendMessage(cid, content)
        applyIncoming([vo]) // WS 回声/补拉按 seq 去重,不会重复
        setPending((p) => p.filter((x) => x.localId !== localId))
      } catch (e) {
        const code = (e as { code?: number })?.code
        setPending((p) => p.map((x) => (x.localId === localId ? { ...x, status: 'failed', errorCode: code } : x)))
      }
    },
    [applyIncoming],
  )

  // 乐观发送:先上屏 pending(sending),再异步发;不阻塞连发
  const onSend = useCallback(
    (text: string) => {
      const content = text.trim()
      if (!content || !convIdRef.current) return
      const localId = `l_${Date.now()}_${Math.random().toString(16).slice(2)}`
      setPending((p) => [...p, { localId, content, status: 'sending', time: Date.now() }])
      void trySend(localId, content)
    },
    [trySend],
  )

  // 发送文件(图片/视频/文档):按扩展名判类 + 限大小 → 上传 → 发对应类型消息;发完由 applyIncoming 入列
  const onSendFile = useCallback(async (file: File) => {
    const cid = convIdRef.current
    if (!cid) return
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const kind = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) ? 'image'
      : ['mp4', 'webm', 'mov'].includes(ext) ? 'video'
        : ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'].includes(ext) ? 'file'
          : ''
    if (!kind) { showToast(t('fileUnsupported')); return } // 不支持的类型
    const max = kind === 'image' ? 10 * 1024 * 1024 : 20 * 1024 * 1024
    // 超限提示带上限值(MB),与后端 MinioService 分类上限一致;t() 无插值,大小在外拼接
    if (file.size > max) { showToast(`${t('fileTooLarge')}(≤${Math.round(max / 1024 / 1024)}MB)`); return }
    try {
      const url = await uploadFile(file)
      const payload = kind === 'file' ? { name: file.name, size: file.size } : undefined
      applyIncoming([await sendMessage(cid, url, kind, payload)])
    } catch {
      showToast(t('sendFileFailed'))
    }
  }, [applyIncoming, showToast])

  // 点击失败消息的感叹号重发(对齐参考系统:重发用同一本地项,成功后并入正常消息流)
  const onResend = useCallback(
    (localId: string) => {
      const item = pending.find((x) => x.localId === localId)
      if (item) void trySend(localId, item.content)
    },
    [pending, trySend],
  )

  // 输入中:节流 3s 通知坐席(瞬时,不落库);失败静默
  const onTyping = useCallback(() => {
    const cid = convIdRef.current
    if (!cid) return
    const now = Date.now()
    if (now - lastTypingRef.current < 3000) return
    lastTypingRef.current = now
    void sendTyping(cid).catch(() => {})
  }, [])

  // 撤回自己的消息:成功后用返回的已撤回 VO(isVisible=false)按 seq 替换原消息;WS 回声同样幂等
  const onRetract = useCallback(
    (msgId: string) => {
      const cid = convIdRef.current
      if (!cid) return
      void (async () => {
        try {
          applyIncoming([await retractMessage(cid, msgId)])
        } catch {
          // 撤回失败(超时/权限/网络)静默:信使端无 toast 体系,过期/无权点击无效即可
        }
      })()
    },
    [applyIncoming],
  )

  if (phase === 'loading') {
    return <div className="center-tip">{t('connecting')}</div>
  }
  if (phase === 'error' || !data) {
    return <div className="center-tip">{t('loadFail')}</div>
  }

  if (screen === 'home') {
    const last = messages[messages.length - 1]
    return (
      <Home
        data={data}
        lastMessage={last ? last.content : null}
        onEnter={() => {
          // 用户手势内:解锁音频 + 申请通知权限(失焦新消息提醒用)
          unlockAudio()
          if (popupRef.current) ensureNotifyPermission()
          // 进入聊天:以"上次离开的已读水位"为未读分割界
          setUnreadAfterSeq(lastReadSeqRef.current)
          setScreen('chat')
        }}
      />
    )
  }
  return (
    <Chat
      data={data}
      agent={agent}
      messages={messages}
      pending={pending}
      unreadAfterSeq={unreadAfterSeq}
      toast={toast}
      onSend={onSend}
      onSendFile={onSendFile}
      onResend={onResend}
      onRetract={onRetract}
      onTyping={onTyping}
      peerTyping={peerTyping}
      onBack={() => {
        // 离开聊天:推进已读水位,清除分割线
        lastReadSeqRef.current = localMaxSeqRef.current
        setUnreadAfterSeq(null)
        setScreen('home')
      }}
    />
  )
}
