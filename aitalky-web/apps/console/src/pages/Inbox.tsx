import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Button, Empty, Input, Popconfirm, Popover, Segmented, Spin, Switch, Tooltip, message, theme } from 'antd'
import {
  SearchOutlined, UserOutlined, AppstoreOutlined,
  UsergroupDeleteOutlined, SmileOutlined, LogoutOutlined, EditOutlined, DownOutlined,
  PictureOutlined, PaperClipOutlined, LinkOutlined, BookOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../auth/perm'
import { useAppStore } from '../store/useAppStore'
import { wsClient, type WsStatus } from '../ws/client'
import {
  claimConversation, closeConversation, getConversation,
  listConversations, listMessages, replyConversation, updateCustomerContact,
} from '../api/conversation'
import { blockCustomer } from '../api/blacklist'
import { listQuickReplies, type QuickReplyVO } from '../api/quickReply'
import type { ConversationDetailVO, ConversationVO, MessageVO } from '../types'

// 视图 → 列表查询的 view 参数
type CategoryKey = 'mine' | 'mention' | 'unassigned' | 'all'
type TabKey = 'open' | 'closed'

// 进行中/已结束 → 后端 status。实测新会话(含未分配)均为 status=1(进行中),0(等待)暂未使用;
// 未分配视图后端已 isNull(assignee).ne(2),此处再限定进行中即可。故统一:进行中=1,已结束=2。
function statusOf(tab: TabKey): number {
  return tab === 'closed' ? 2 : 1
}

// 消息时间:今天只显 HH:mm,非今天显 MM-DD HH:mm,跨年再带年份(对齐 ByteTrack)
function fmtMsgTime(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameDay) return hm
  const md = `${p(d.getMonth() + 1)}-${p(d.getDate())} ${hm}`
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}-${md}`
}

// 客户源语言代码 → 展示名(对齐 ByteTrack)
function langLabel(code: string | null): string {
  if (!code) return '-'
  const map: Record<string, string> = { zh_CN: '简体中文', zh_TW: '繁體中文', en_US: 'English', en: 'English', ja_JP: '日本語', ko_KR: '한국어' }
  return map[code] || code
}

// 合并消息:按 seq 去重(seq 会话内唯一)+ 升序插入。补漏拉回的旧 seq 会落到正确位置,而非追加到底。
function mergeMessages(prev: MessageVO[], incoming: MessageVO[]): MessageVO[] {
  if (incoming.length === 0) return prev
  const bySeq = new Map<number, MessageVO>()
  for (const m of prev) bySeq.set(m.seq, m)
  for (const m of incoming) bySeq.set(m.seq, m)
  return Array.from(bySeq.values()).sort((a, b) => a.seq - b.seq)
}

// 列表时间:今天显示 HH:mm,否则 MM-DD HH:mm
function fmtListTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 收件箱(对齐 ByteTrack 四栏:分类视图 / 会话列表 / 聊天 / 详情面板)。
export default function Inbox() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const isDark = useAppStore((s) => s.themeMode) === 'dark'
  const myMemberId = useAppStore((s) => s.memberId)

  const panelGray = isDark ? token.colorBgLayout : '#f7f7f7'
  const splitBorder = `0.5px solid ${isDark ? token.colorSplit : 'rgba(0,0,0,0.1)'}`

  const [active, setActive] = useState<CategoryKey>('mine')
  const [tab, setTab] = useState<TabKey>('open')
  const [collapsed, setCollapsed] = useState(false)

  const [list, setList] = useState<ConversationVO[]>([])
  const [total, setTotal] = useState(0)
  const [loadingList, setLoadingList] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetailVO | null>(null)
  const [messages, setMessages] = useState<MessageVO[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const [replyTab, setReplyTab] = useState<'reply' | 'internal'>('reply')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [wsStatus, setWsStatus] = useState<WsStatus>(wsClient.getStatus())
  // 详情面板:联系方式/邮箱内联编辑
  const [editField, setEditField] = useState<'contact' | 'email' | null>(null)
  const [editVal, setEditVal] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [bizCollapsed, setBizCollapsed] = useState(false)
  const [autoTranslate, setAutoTranslate] = useState(false) // 翻译为占位(AI翻译模块未做)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReplyVO[]>([])

  const loadQuickReplies = useCallback(() => {
    listQuickReplies().then(setQuickReplies).catch(() => {})
  }, [])

  // selectedId 的最新值给 WS 回调用(避免闭包过期)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedId
  const msgEndRef = useRef<HTMLDivElement>(null)
  // 当前会话「本地已收到的最大 seq」——补漏对账基准(§3 铁律:以实际 max(seq) 前进,容忍空洞)
  const localMaxSeqRef = useRef(0)
  const syncingRef = useRef(false)
  // 给 WS/window 回调引用最新的函数(闭包只注册一次,内部走 ref 取最新)
  const syncCurrentRef = useRef<() => void>(() => {})
  const loadListRef = useRef<() => void>(() => {})

  // 分类(权限控制:未分配/全部需对应功能权限)
  const categories = useMemo(
    () => [
      { key: 'mine' as const, label: t('inbox.mine'), icon: <UserOutlined />, visible: true },
      { key: 'mention' as const, label: t('inbox.mention'), icon: <span style={{ fontWeight: 700 }}>@</span>, visible: true },
      { key: 'unassigned' as const, label: t('inbox.unassigned'), icon: <UsergroupDeleteOutlined />, visible: hasFunction('inbox.viewUnassigned') },
      { key: 'all' as const, label: t('inbox.all'), icon: <AppstoreOutlined />, visible: hasFunction('inbox.viewAll') },
    ].filter((c) => c.visible),
    [t],
  )
  const activeLabel = categories.find((c) => c.key === active)?.label ?? t('inbox.all')

  // 把消息并入当前会话(去重+有序+单调推进 localMaxSeq);空 incoming 不动
  const applyIncoming = useCallback((incoming: MessageVO[]) => {
    if (incoming.length === 0) return
    setMessages((prev) => mergeMessages(prev, incoming))
    const maxIn = incoming.reduce((m, x) => Math.max(m, x.seq), 0)
    if (maxIn > localMaxSeqRef.current) localMaxSeqRef.current = maxIn
  }, [])

  // 补漏:拉 localMaxSeq 之后的消息并入(去重)。并发去抖:同一时刻只跑一次。
  const syncCurrent = useCallback(async () => {
    const cid = selectedRef.current
    if (!cid || syncingRef.current) return
    syncingRef.current = true
    try {
      applyIncoming(await listMessages(cid, localMaxSeqRef.current))
    } finally {
      syncingRef.current = false
    }
  }, [applyIncoming])
  syncCurrentRef.current = syncCurrent

  // ===== 列表加载(切视图/切 tab 时 + 轮询兜底新会话)=====
  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await listConversations({ view: active, status: statusOf(tab), page: 1, size: 50 })
      // 未读以服务端 DB 为权威;但当前打开会话强制显示 0(避免轮询把"边看边来的消息"算成未读)
      const cur = selectedRef.current
      setList(res.records.map((c) => (c.id === cur ? { ...c, unreadCount: 0 } : c)))
      setTotal(res.total)
      // serverLastSeq 对账:当前会话服务端 last_seq 超过本地 → 自动补拉(覆盖"静默期最后一帧丢失")
      const curConv = res.records.find((c) => c.id === cur)
      if (curConv && curConv.lastSeq != null && curConv.lastSeq > localMaxSeqRef.current) {
        syncCurrentRef.current()
      }
    } finally {
      setLoadingList(false)
    }
  }, [active, tab])
  loadListRef.current = loadList

  useEffect(() => {
    loadList()
    // 轮询兜底:WS 只覆盖已打开/已订阅会话,新会话靠轮询进列表
    const timer = setInterval(loadList, 10_000)
    return () => clearInterval(timer)
  }, [loadList])

  // ===== WS 状态订阅 =====
  useEffect(() => wsClient.onStatus(setWsStatus), [])

  // ===== WS 消息分发:命中当前会话→网②gap检测+并入;更新列表预览/未读 =====
  useEffect(() => {
    return wsClient.onMessage((msg) => {
      const isCurrent = selectedRef.current === msg.conversationId
      if (isCurrent) {
        // 网②:seq 跳号(> localMax+1)说明中间漏帧 → 触发补拉;这条本身也并入(去重)
        if (msg.seq > localMaxSeqRef.current + 1) {
          syncCurrentRef.current()
        }
        applyIncoming([msg])
      }
      setList((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessagePreview: msg.content,
                lastMessageAt: new Date(Number(msg.timestamp)).toISOString(),
                // 当前会话已打开 → 不累加未读;仅客户发来的才记未读
                unreadCount: isCurrent || msg.senderType !== 'customer' ? c.unreadCount : c.unreadCount + 1,
              }
            : c,
        ),
      )
    })
  }, [applyIncoming])

  // ===== 网①:WS 重连(含首连)→ 刷列表 + 补当前会话;网③:窗口聚焦/可见 → 补当前会话 =====
  useEffect(() => {
    const offOpen = wsClient.onOpen(() => {
      loadListRef.current()
      if (selectedRef.current) syncCurrentRef.current()
    })
    const onFocus = () => {
      if (selectedRef.current) syncCurrentRef.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && selectedRef.current) syncCurrentRef.current()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      offOpen()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // 新消息滚到底
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ===== 选中会话:订阅 WS + 拉详情/消息 + 清未读 =====
  const selectConversation = useCallback(
    async (conv: ConversationVO) => {
      if (conv.id === selectedId) return
      if (selectedId) wsClient.unsubscribe(selectedId)
      setSelectedId(conv.id)
      setReplyTab('reply')
      setInput('')
      setEditField(null)
      setDetail(null)
      setMessages([])
      localMaxSeqRef.current = 0
      wsClient.subscribe(conv.id)
      // 本地先清未读(后端拉消息时也会 resetUnread)
      setList((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)))
      setLoadingMsgs(true)
      try {
        const [d, msgs] = await Promise.all([getConversation(conv.id), listMessages(conv.id)])
        setDetail(d)
        const sorted = mergeMessages([], msgs)
        setMessages(sorted)
        // localMaxSeq = 首屏最新 seq;首屏只取最近 50 条,更早的是历史(翻页另说),不影响实时补漏基准
        localMaxSeqRef.current = sorted.reduce((m, x) => Math.max(m, x.seq), 0)
      } finally {
        setLoadingMsgs(false)
      }
    },
    [selectedId],
  )

  // 离开收件箱时退订当前会话
  useEffect(() => {
    return () => {
      if (selectedRef.current) wsClient.unsubscribe(selectedRef.current)
    }
  }, [])

  // ===== 发送回复 / 内部消息 =====
  const onSend = useCallback(async () => {
    const content = input.trim()
    if (!content || !selectedId || sending) return
    setSending(true)
    try {
      const internal = replyTab === 'internal'
      const vo = await replyConversation(selectedId, { content, type: 'text', internal })
      setInput('')
      // 立即上屏(WS 回声/补拉按 seq 去重 + 有序插入 + 推进 localMaxSeq)
      applyIncoming([vo])
      setList((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, lastMessagePreview: content, lastMessageAt: new Date(Number(vo.timestamp)).toISOString() }
            : c,
        ),
      )
    } finally {
      setSending(false)
    }
  }, [input, selectedId, sending, replyTab, applyIncoming])

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  // ===== 认领 / 结束 =====
  const onClaim = useCallback(async () => {
    if (!selectedId) return
    await claimConversation(selectedId)
    setDetail(await getConversation(selectedId))
    loadList()
  }, [selectedId, loadList])

  const onClose = useCallback(async () => {
    if (!selectedId) return
    await closeConversation(selectedId)
    setDetail(await getConversation(selectedId))
    loadList()
  }, [selectedId, loadList])

  // ===== 详情:保存联系方式/邮箱(编辑哪个就改哪个,另一个保持原值)=====
  const saveContact = useCallback(async () => {
    if (!selectedId || !detail || !editField) return
    setSavingContact(true)
    try {
      const contact = editField === 'contact' ? editVal.trim() : detail.contact || ''
      const email = editField === 'email' ? editVal.trim() : detail.email || ''
      await updateCustomerContact(selectedId, contact, email)
      setDetail({ ...detail, contact, email })
      setEditField(null)
    } finally {
      setSavingContact(false)
    }
  }, [selectedId, detail, editField, editVal])

  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', height: '100%' },
    col1: { width: 224, flexShrink: 0, background: panelGray, borderRight: splitBorder, display: 'flex', flexDirection: 'column' },
    col2: { width: 300, flexShrink: 0, background: token.colorBgContainer, borderRight: splitBorder, display: 'flex', flexDirection: 'column' },
    col3: { flex: 1, minWidth: 0, background: panelGray, display: 'flex', flexDirection: 'column' },
    col4: { width: 300, flexShrink: 0, background: token.colorBgContainer, borderLeft: splitBorder, display: 'flex', flexDirection: 'column', overflow: 'auto' },
    colHeader: { height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: splitBorder },
    colTitle: { fontWeight: 700, fontSize: 17 },
    groupLabel: { padding: '16px 16px 6px', fontSize: 12, color: token.colorTextSecondary },
    catItem: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 8px', padding: '11px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 15 },
    catActive: { background: token.colorBgContainer, color: token.colorPrimary, boxShadow: token.boxShadowTertiary },
    count: { marginLeft: 'auto', minWidth: 22, height: 20, padding: '0 6px', borderRadius: 6, background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  }

  const renderCat = (c: { key: CategoryKey; label: string; icon: ReactNode }) => {
    const on = c.key === active
    return (
      <div key={c.key} className="at-row" style={{ ...styles.catItem, ...(on ? styles.catActive : {}) }} onClick={() => { setActive(c.key); setSelectedId(null) }}>
        <span style={{ width: 18, textAlign: 'center' }}>{c.icon}</span>
        <span>{c.label}</span>
        {/* 仅当前激活分类显示真实数量;各视图独立计数待后端 counts 接口(避免非激活恒显 0 误导) */}
        {on && <span style={styles.count}>{total}</span>}
      </div>
    )
  }

  // ===== 会话列表项 =====
  const renderConvItem = (c: ConversationVO) => {
    const on = c.id === selectedId
    return (
      <div
        key={c.id}
        className="at-row"
        onClick={() => selectConversation(c)}
        style={{
          display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer',
          background: on ? (isDark ? token.colorFillSecondary : '#eef3ff') : 'transparent',
          borderLeft: `3px solid ${on ? token.colorPrimary : 'transparent'}`,
        }}
      >
        <Avatar size={40} src={c.customerAvatar || undefined} style={{ background: token.colorPrimary, flexShrink: 0 }}>
          {(c.customerName || 'U').charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 15, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.customerName || c.customerId}
            </span>
            <span style={{ fontSize: 12, color: token.colorTextTertiary, flexShrink: 0, marginLeft: 8 }}>{fmtListTime(c.lastMessageAt)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.lastMessagePreview || ''}
            </span>
            {c.unreadCount > 0 && (
              <span style={{ flexShrink: 0, marginLeft: 8, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: token.colorError, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===== 单条消息气泡(坐席右蓝 / 客户左白 / 内部消息黄)=====
  const renderMessage = (m: MessageVO) => {
    const mine = m.senderType === 'agent'
    const internal = !!m.internal
    const bubbleBg = internal ? (isDark ? '#5c4b1f' : '#fff7e6') : mine ? token.colorPrimary : token.colorBgContainer
    const bubbleColor = internal ? token.colorText : mine ? '#fff' : token.colorText
    return (
      <div key={m.msgId} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, marginBottom: 16 }}>
        <Avatar size={32} src={m.senderAvatar || undefined} style={{ background: mine ? token.colorPrimary : token.colorTextQuaternary, flexShrink: 0 }}>
          {(m.senderName || (mine ? 'A' : 'U')).charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ maxWidth: '62%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {internal && <span style={{ fontSize: 11, color: token.colorWarning, marginBottom: 2 }}>{t('inbox.internalNote')}</span>}
          <div style={{ padding: '9px 13px', borderRadius: 10, background: bubbleBg, color: bubbleColor, fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: internal ? `1px solid ${token.colorWarningBorder}` : 'none', boxShadow: !mine && !internal ? token.boxShadowTertiary : 'none' }}>
            {m.content}
          </div>
          <span style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 4 }}>{fmtMsgTime(m.timestamp)}</span>
        </div>
      </div>
    )
  }

  const closed = detail?.status === 2
  const unassigned = detail != null && detail.assigneeMemberId == null

  return (
    <div style={styles.root}>
      {/* 第一栏:分类视图 */}
      {!collapsed && (
        <div style={styles.col1}>
          <div style={styles.colHeader}>
            <span style={styles.colTitle}>{t('inbox.title')}</span>
            <SearchOutlined style={{ fontSize: 16, color: token.colorTextSecondary, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={styles.groupLabel}>{t('inbox.categoryView')}</div>
            {categories.map(renderCat)}
            <div style={styles.groupLabel}>{t('inbox.normalView')}</div>
            <div className="at-row" style={styles.catItem}>
              <span style={{ width: 18, textAlign: 'center' }}><SmileOutlined /></span>
              <span>{t('inbox.finn')}</span>
              <span style={styles.count}>0</span>
            </div>
          </div>
        </div>
      )}

      {/* 第二栏:会话列表 */}
      <div style={styles.col2}>
        <div style={styles.colHeader}>
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            style={{ color: token.colorTextSecondary, cursor: 'pointer' }}
            onClick={() => setCollapsed((c) => !c)}
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="9" cy="7" r="2.4" fill={token.colorBgContainer} />
            <circle cx="15" cy="12" r="2.4" fill={token.colorBgContainer} />
            <circle cx="10" cy="17" r="2.4" fill={token.colorBgContainer} />
          </svg>
          <span style={{ ...styles.colTitle, flex: 1, marginLeft: 10 }}>{activeLabel}</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <Segmented
            block
            value={tab}
            onChange={(v) => { setTab(v as TabKey); setSelectedId(null) }}
            options={[
              { label: `${t('inbox.inProgress')} ${tab === 'open' ? total : ''}`.trim(), value: 'open' },
              { label: t('inbox.closed'), value: 'closed' },
            ]}
          />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loadingList && list.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spin /></div>
          ) : list.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tab === 'open' ? t('inbox.noOngoing') : t('inbox.noClosed')} />
            </div>
          ) : (
            list.map(renderConvItem)
          )}
        </div>
      </div>

      {/* 第三栏:聊天区 */}
      <div style={styles.col3}>
        {!selectedId || !detail ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('inbox.notOpened')} />
          </div>
        ) : (
          <>
            <div style={{ ...styles.colHeader, background: token.colorBgContainer }}>
              <span style={styles.colTitle}>{detail.customerName || detail.customerId}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: token.colorTextTertiary, fontSize: 13 }}>
                {wsStatus !== 'open' && <span style={{ color: token.colorWarning }}>{t('inbox.reconnecting')}</span>}
                {!closed && (
                  <Popconfirm title={t('inbox.closeConfirm')} okText={t('common.confirm')} cancelText={t('common.cancel')} onConfirm={onClose}>
                    <LogoutOutlined style={{ fontSize: 18, cursor: 'pointer', color: token.colorTextSecondary }} title={t('inbox.close')} />
                  </Popconfirm>
                )}
              </span>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spin /></div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40, color: token.colorTextTertiary }}>{t('inbox.noMessages')}</div>
              ) : (
                messages.map(renderMessage)
              )}
              <div ref={msgEndRef} />
            </div>

            {/* 输入区:对齐 ByteTrack(tab+翻译开关 / 加高输入框 / 工具栏 + 翻译·发送)*/}
            <div style={{ flexShrink: 0, background: token.colorBgContainer, borderTop: splitBorder, padding: '8px 16px 12px' }}>
              {/* 第一行:回复/内部消息 tab(左) + 自动翻译开关 + 客户源语言(右) */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 20, flex: 1 }}>
                  {(['reply', 'internal'] as const).map((k) => (
                    <span
                      key={k}
                      onClick={() => setReplyTab(k)}
                      style={{
                        cursor: 'pointer', fontSize: 14, paddingBottom: 4,
                        color: replyTab === k ? token.colorPrimary : token.colorTextSecondary,
                        borderBottom: `2px solid ${replyTab === k ? token.colorPrimary : 'transparent'}`,
                      }}
                    >
                      {t(k === 'reply' ? 'inbox.reply' : 'inbox.internalNote')}
                    </span>
                  ))}
                </div>
                {/* 翻译控件(占位,AI翻译模块未做)*/}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: token.colorTextSecondary }}>
                  <span>{t('inbox.autoTranslate')}</span>
                  <Switch size="small" checked={autoTranslate} onChange={(v) => { setAutoTranslate(v); message.info(t('settings.wip')) }} />
                  <span style={{ color: token.colorTextTertiary }}>{t('inbox.customerLang')}</span>
                  <span>{langLabel(detail.sourceLanguage)}</span>
                </div>
              </div>
              {/* 输入框(加高,对齐参考)*/}
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t(replyTab === 'reply' ? 'inbox.replyPlaceholder' : 'inbox.internalPlaceholder')}
                autoSize={{ minRows: 5, maxRows: 10 }}
                variant="borderless"
                style={{ padding: 0, fontSize: 15 }}
              />
              {/* 底部:工具栏图标(左,占位)+ 认领/翻译/发送(右)*/}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 18, flex: 1, color: token.colorTextTertiary, fontSize: 18 }}>
                  {([
                    { icon: <PictureOutlined />, k: 'inbox.toolImage' },
                    { icon: <PaperClipOutlined />, k: 'inbox.toolFile' },
                    { icon: <LinkOutlined />, k: 'inbox.toolLink' },
                    { icon: <BookOutlined />, k: 'inbox.toolKb' },
                  ] as const).map(({ icon, k }) => (
                    <Tooltip key={k} title={t(k)}>
                      <span style={{ cursor: 'pointer' }} onClick={() => message.info(t('settings.wip'))}>{icon}</span>
                    </Tooltip>
                  ))}
                  {/* 快捷回复:点击弹出列表,选中插入输入框 */}
                  <Popover
                    trigger="click"
                    placement="topLeft"
                    open={quickOpen}
                    onOpenChange={(o) => { setQuickOpen(o); if (o) loadQuickReplies() }}
                    content={
                      <div style={{ width: 280, maxHeight: 320, overflow: 'auto' }}>
                        {quickReplies.length === 0 ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('inbox.quickEmpty')} />
                        ) : (
                          quickReplies.map((q) => (
                            <div
                              key={q.id}
                              className="at-row"
                              style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}
                              onClick={() => { setInput((prev) => (prev ? prev + '\n' : '') + q.content); setQuickOpen(false) }}
                            >
                              {q.title && <div style={{ fontSize: 13, fontWeight: 600 }}>{q.title}</div>}
                              <div style={{ fontSize: 13, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.content}</div>
                            </div>
                          ))
                        )}
                      </div>
                    }
                  >
                    <Tooltip title={t('inbox.toolQuick')}>
                      <span style={{ cursor: 'pointer' }}><ThunderboltOutlined /></span>
                    </Tooltip>
                  </Popover>
                </div>
                {unassigned && !closed && (
                  <Button size="small" style={{ marginRight: 8 }} onClick={onClaim}>{t('inbox.claim')}</Button>
                )}
                <Button style={{ marginRight: 8 }} onClick={() => message.info(t('settings.wip'))}>{t('inbox.translate')}</Button>
                <Button type="primary" loading={sending} disabled={!input.trim()} onClick={onSend}>
                  {t('inbox.send')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 第四栏:详情面板(客户资料)—— 对齐 ByteTrack:标题 + 横排头像 + 分组折叠 + 底部加黑 */}
      {selectedId && detail && (
        <div style={styles.col4}>
          {/* 面板标题 */}
          <div style={{ padding: '16px 16px 14px', fontWeight: 700, fontSize: 18, borderBottom: splitBorder }}>
            {t('inbox.detail.title')}
          </div>

          {/* 头像 + 名字 + 用户/访客标签(左对齐横排) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: splitBorder }}>
            <Avatar size={44} src={detail.customerAvatar || undefined} style={{ background: token.colorPrimary, flexShrink: 0 }}>
              {(detail.customerName || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {detail.customerName || detail.customerId}
              </div>
              <span style={{ display: 'inline-block', marginTop: 4, padding: '1px 8px', borderRadius: 4, background: token.colorPrimaryBg, color: token.colorPrimary, fontSize: 12 }}>
                {detail.customerType === 1 ? t('inbox.detail.visitor') : t('inbox.detail.user')}
              </span>
            </div>
          </div>

          {/* 会话信息(来源渠道/渠道名称数据待专属分配 asn 模块,先占位 --)*/}
          <DetailSection title={t('inbox.detail.convInfo')} token={token} rows={[
            [t('inbox.detail.convId'), detail.id],
            [t('inbox.detail.ip'), detail.ip || t('inbox.detail.empty')],
            [t('inbox.detail.location'), detail.location || t('inbox.detail.empty')],
            [t('inbox.detail.language'), langLabel(detail.sourceLanguage)],
            [t('inbox.detail.assignee'), detail.assigneeName
              || (detail.assigneeMemberId === myMemberId ? t('inbox.mine') : null)
              || t('inbox.detail.unassigned')],
            [t('inbox.detail.source'), t('inbox.detail.empty')],
            [t('inbox.detail.channelName'), t('inbox.detail.empty')],
          ]} />

          {/* 客户信息:UID 只读;联系方式/邮箱可内联编辑(两行式,编辑铅笔在值行右侧)*/}
          <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${token.colorSplit}` }}>
            <SectionHeader title={t('inbox.detail.bizInfo')} collapsed={bizCollapsed} onToggle={() => setBizCollapsed((c) => !c)} token={token} />
            {!bizCollapsed && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 5 }}>{t('inbox.detail.bizUid')}:</div>
                  <div style={{ fontSize: 14, wordBreak: 'break-all' }}>{detail.externalUserId || t('inbox.detail.empty')}</div>
                </div>
                {(['contact', 'email'] as const).map((field) => {
                  const label = t(field === 'contact' ? 'inbox.detail.contact' : 'inbox.detail.email')
                  const val = detail[field]
                  const editing = editField === field
                  return (
                    <div key={field} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 5 }}>{label}:</div>
                      {editing ? (
                        <Input
                          size="small"
                          autoFocus
                          value={editVal}
                          disabled={savingContact}
                          onChange={(e) => setEditVal(e.target.value)}
                          onPressEnter={saveContact}
                          onBlur={saveContact}
                          onKeyDown={(e) => { if (e.key === 'Escape') setEditField(null) }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 14, wordBreak: 'break-all' }}>{val || t('inbox.detail.empty')}</span>
                          <EditOutlined
                            onClick={() => { setEditField(field); setEditVal(val || '') }}
                            style={{ cursor: 'pointer', color: token.colorTextTertiary, marginLeft: 6 }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* 加入黑名单:拉黑该客户(用户=全设备,游客=该设备),拉黑后该身份无法再接入 */}
          <div style={{ padding: '16px' }}>
            <Popconfirm
              title={t('inbox.detail.blacklistConfirm')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={async () => {
                if (!detail.customerId) return
                await blockCustomer(detail.customerId)
                message.success(t('inbox.detail.blacklisted'))
              }}
            >
              <Button block danger>{t('inbox.detail.blacklist')}</Button>
            </Popconfirm>
          </div>
        </div>
      )}
    </div>
  )
}

// 详情分组标题(可折叠,带 ∨ 箭头,对齐 ByteTrack)
function SectionHeader({ title, collapsed, onToggle, token }: { title: string; collapsed: boolean; onToggle: () => void; token: ReturnType<typeof theme.useToken>['token'] }) {
  return (
    <div
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginBottom: collapsed ? 0 : 10 }}
    >
      <span>{title}</span>
      <DownOutlined style={{ fontSize: 12, color: token.colorTextTertiary, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .2s' }} />
    </div>
  )
}

// 详情分组:标题 + 键值行(可折叠)
function DetailSection({ title, rows, token }: { title: string; rows: [string, string][]; token: ReturnType<typeof theme.useToken>['token'] }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${token.colorSplit}` }}>
      <SectionHeader title={title} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} token={token} />
      {!collapsed &&
        rows.map(([k, v]) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 5 }}>{k}:</div>
            <div style={{ fontSize: 14, color: token.colorText, wordBreak: 'break-all' }}>{v}</div>
          </div>
        ))}
    </div>
  )
}
