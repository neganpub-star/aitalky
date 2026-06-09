import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Button, Empty, Input, Popconfirm, Segmented, Spin, theme } from 'antd'
import {
  SearchOutlined, UserOutlined, AppstoreOutlined,
  UsergroupDeleteOutlined, SmileOutlined, LogoutOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../auth/perm'
import { useAppStore } from '../store/useAppStore'
import { wsClient, type WsStatus } from '../ws/client'
import {
  claimConversation, closeConversation, getConversation,
  listConversations, listMessages, replyConversation,
} from '../api/conversation'
import type { ConversationDetailVO, ConversationVO, MessageVO } from '../types'

// 视图 → 列表查询的 view 参数
type CategoryKey = 'mine' | 'mention' | 'unassigned' | 'all'
type TabKey = 'open' | 'closed'

// 进行中/已结束 → 后端 status(0等待 1进行中 2已结束)。
// 未分配的进行中为「等待(0)」,其余视图进行中为「进行中(1)」;已结束统一 2。
function statusOf(view: CategoryKey, tab: TabKey): number {
  if (tab === 'closed') return 2
  return view === 'unassigned' ? 0 : 1
}

function fmtMsgTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
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

  // selectedId 的最新值给 WS 回调用(避免闭包过期)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedId
  const msgEndRef = useRef<HTMLDivElement>(null)

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

  // ===== 列表加载(切视图/切 tab 时 + 轮询兜底新会话)=====
  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await listConversations({ view: active, status: statusOf(active, tab), page: 1, size: 50 })
      setList(res.records)
      setTotal(res.total)
    } finally {
      setLoadingList(false)
    }
  }, [active, tab])

  useEffect(() => {
    loadList()
    // 轮询兜底:WS 只覆盖已打开/已订阅会话,新会话靠轮询进列表
    const timer = setInterval(loadList, 10_000)
    return () => clearInterval(timer)
  }, [loadList])

  // ===== WS 状态订阅 =====
  useEffect(() => wsClient.onStatus(setWsStatus), [])

  // ===== WS 消息分发:更新列表预览/未读;命中当前会话则追加 =====
  useEffect(() => {
    return wsClient.onMessage((msg) => {
      const isCurrent = selectedRef.current === msg.conversationId
      if (isCurrent) {
        setMessages((prev) => (prev.some((m) => m.msgId === msg.msgId) ? prev : [...prev, msg]))
      }
      setList((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessagePreview: msg.content,
                lastMessageAt: new Date(msg.timestamp).toISOString(),
                // 当前会话已打开 → 不累加未读;仅客户发来的才记未读
                unreadCount: isCurrent || msg.senderType !== 'customer' ? c.unreadCount : c.unreadCount + 1,
              }
            : c,
        ),
      )
    })
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
      setDetail(null)
      setMessages([])
      wsClient.subscribe(conv.id)
      // 本地先清未读(后端拉消息时也会 resetUnread)
      setList((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)))
      setLoadingMsgs(true)
      try {
        const [d, msgs] = await Promise.all([getConversation(conv.id), listMessages(conv.id)])
        setDetail(d)
        setMessages(msgs)
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
      // 立即上屏(WS 回声按 msgId 去重)
      setMessages((prev) => (prev.some((m) => m.msgId === vo.msgId) ? prev : [...prev, vo]))
      setList((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, lastMessagePreview: content, lastMessageAt: new Date(vo.timestamp).toISOString() }
            : c,
        ),
      )
    } finally {
      setSending(false)
    }
  }, [input, selectedId, sending, replyTab])

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
        <span style={styles.count}>{on ? total : 0}</span>
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

            {/* 输入区:回复 / 内部消息 */}
            <div style={{ flexShrink: 0, background: token.colorBgContainer, borderTop: splitBorder, padding: '8px 16px 12px' }}>
              <div style={{ display: 'flex', gap: 20, marginBottom: 6 }}>
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
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t(replyTab === 'reply' ? 'inbox.replyPlaceholder' : 'inbox.internalPlaceholder')}
                autoSize={{ minRows: 2, maxRows: 6 }}
                variant="borderless"
                style={{ padding: 0, fontSize: 15 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                <span style={{ flex: 1, fontSize: 12, color: token.colorTextTertiary }}>{t('inbox.sendHint')}</span>
                {unassigned && !closed && (
                  <Button size="small" style={{ marginRight: 8 }} onClick={onClaim}>{t('inbox.claim')}</Button>
                )}
                <Button type="primary" loading={sending} disabled={!input.trim()} onClick={onSend}>
                  {t('inbox.send')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 第四栏:详情面板(客户资料) */}
      {selectedId && detail && (
        <div style={styles.col4}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 20px', borderBottom: splitBorder }}>
            <Avatar size={64} src={detail.customerAvatar || undefined} style={{ background: token.colorPrimary }}>
              {(detail.customerName || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 10 }}>{detail.customerName || detail.customerId}</div>
            <span style={{ marginTop: 6, padding: '1px 10px', borderRadius: 4, background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: 12 }}>
              {t('inbox.detail.userTag')}
            </span>
          </div>

          <DetailSection title={t('inbox.detail.convInfo')} token={token} rows={[
            [t('inbox.detail.convId'), detail.id],
            [t('inbox.detail.ip'), detail.ip || t('inbox.detail.empty')],
            [t('inbox.detail.location'), detail.location || t('inbox.detail.empty')],
            [t('inbox.detail.assignee'), detail.assigneeMemberId
              ? (detail.assigneeMemberId === myMemberId ? t('inbox.mine') : detail.assigneeMemberId)
              : t('inbox.detail.unassigned')],
          ]} />

          <DetailSection title={t('inbox.detail.bizInfo')} token={token} rows={[
            [t('inbox.detail.bizUid'), detail.externalUserId || detail.customerName || t('inbox.detail.empty')],
            [t('inbox.detail.contact'), detail.contact || t('inbox.detail.empty')],
            [t('inbox.detail.email'), detail.email || t('inbox.detail.empty')],
          ]} />
        </div>
      )}
    </div>
  )
}

// 详情分组:标题 + 键值行
function DetailSection({ title, rows, token }: { title: string; rows: [string, string][]; token: ReturnType<typeof theme.useToken>['token'] }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${token.colorSplit}` }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', fontSize: 13, marginBottom: 8 }}>
          <span style={{ width: 92, flexShrink: 0, color: token.colorTextTertiary }}>{k}</span>
          <span style={{ flex: 1, minWidth: 0, color: token.colorText, wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}
