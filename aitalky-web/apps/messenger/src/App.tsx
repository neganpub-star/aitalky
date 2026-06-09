import { useCallback, useEffect, useRef, useState } from 'react'
import { setLang, t } from './i18n'
import { init, sendMessage, setToken, syncMessages } from './api'
import { messengerWs, type WsStatus } from './ws'
import type { AccessParams, MessageVO, MessengerInit } from './types'
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
    lang: q.get('lang') || 'zh_CN',
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
  const [sending, setSending] = useState(false)

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
        setData(d)
        setPhase('ready')
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

  const onSend = useCallback(
    async (text: string) => {
      const content = text.trim()
      const cid = convIdRef.current
      if (!content || !cid || sending) return
      setSending(true)
      try {
        const vo = await sendMessage(cid, content)
        applyIncoming([vo]) // 立即上屏(WS 回声/补拉按 seq 去重)
      } finally {
        setSending(false)
      }
    },
    [sending, applyIncoming],
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
      sending={sending}
      onSend={onSend}
      onBack={() => setScreen('home')}
    />
  )
}
