import { useCallback, useEffect, useRef, useState } from 'react'
import { setLang, t } from './i18n'
import { init, retractMessage, sendMessage, setToken, syncMessages } from './api'
import { messengerWs, type WsStatus } from './ws'
import type { AccessParams, MessageVO, MessengerInit, PendingMsg } from './types'
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
function mergeMessages(prev: MessageVO[], incoming: MessageVO[]): MessageVO[] {
  if (incoming.length === 0) return prev
  const bySeq = new Map<number, MessageVO>()
  for (const m of prev) bySeq.set(m.seq, m)
  for (const m of incoming) bySeq.set(m.seq, m)
  return Array.from(bySeq.values()).sort((a, b) => a.seq - b.seq)
}

// 周期对账兜底:信使端没有"列表 lastSeq"可对账,用 12s 轮询 sync 覆盖"静默期最后一帧丢失"
const SYNC_POLL = 12_000

export default function App() {
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [screen, setScreen] = useState<'home' | 'chat'>('home')
  const [data, setData] = useState<MessengerInit | null>(null)
  const [messages, setMessages] = useState<MessageVO[]>([])
  const [status, setStatus] = useState<WsStatus>('closed')
  // 本地待发/失败消息(乐观渲染,未落库);成功后移除并以服务端消息按 seq 入列
  const [pending, setPending] = useState<PendingMsg[]>([])

  // 补漏对账基准:本地已收到的最大 seq(以实际 max(seq) 前进,容忍空洞)
  const localMaxSeqRef = useRef(0)
  const syncingRef = useRef(false)
  const convIdRef = useRef<string>('')

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

  // ===== 启动:解析参数 → init → 连 WS → 拉历史 =====
  useEffect(() => {
    const access = parseAccess()
    if (!access) {
      setPhase('error')
      return
    }
    setLang(access.lang)
    let alive = true
    ;(async () => {
      try {
        const d = await init(access)
        if (!alive) return
        setToken(d.token)
        convIdRef.current = d.conversationId
        localMaxSeqRef.current = 0
        // 生效语言:后端按"URL ?lang= 优先,否则信使设置默认语言"算出 config.lang,前端据此切换
        setLang(d.config?.lang || access.lang)
        setData(d)
        setPhase('ready')
        // 自定义网站标题(URL 接入,浏览器标签页)
        if (d.config?.webTitle?.trim()) document.title = d.config.webTitle
        messengerWs.connect(d.token)
        // 拉历史(最近 50);localMaxSeq = 最新 seq
        const history = await syncMessages(d.conversationId)
        if (!alive) return
        const sorted = mergeMessages([], history)
        setMessages(sorted)
        localMaxSeqRef.current = sorted.reduce((m, x) => Math.max(m, x.seq), 0)
      } catch {
        if (alive) setPhase('error')
      }
    })()
    return () => {
      alive = false
      messengerWs.close()
    }
  }, [])

  // ===== WS 监听:状态 + 消息(网②gap 检测)=====
  useEffect(() => {
    const offStatus = messengerWs.onStatus(setStatus)
    const offMsg = messengerWs.onMessage((msg) => {
      if (msg.conversationId !== convIdRef.current) return
      if (msg.seq > localMaxSeqRef.current + 1) syncRef.current() // 跳号→漏帧→补拉
      applyIncoming([msg])
    })
    // 网①重连补漏 + 网③周期对账/聚焦补漏
    const offOpen = messengerWs.onOpen(() => syncRef.current())
    const poll = setInterval(() => syncRef.current(), SYNC_POLL)
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncRef.current()
    }
    window.addEventListener('focus', () => syncRef.current())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      offStatus()
      offMsg()
      offOpen()
      clearInterval(poll)
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

  // 点击失败消息的感叹号重发(对齐参考系统:重发用同一本地项,成功后并入正常消息流)
  const onResend = useCallback(
    (localId: string) => {
      const item = pending.find((x) => x.localId === localId)
      if (item) void trySend(localId, item.content)
    },
    [pending, trySend],
  )

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
        onEnter={() => setScreen('chat')}
      />
    )
  }
  return (
    <Chat
      data={data}
      messages={messages}
      status={status}
      pending={pending}
      onSend={onSend}
      onResend={onResend}
      onRetract={onRetract}
      onBack={() => setScreen('home')}
    />
  )
}
