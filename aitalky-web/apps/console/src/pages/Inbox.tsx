import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Badge, Button, ConfigProvider, Empty, Image, Input, Modal, Popconfirm, Popover, Segmented, Select, Spin, Switch, Tooltip, message, theme } from 'antd'
import {
  SearchOutlined, UserOutlined, AppstoreOutlined,
  UsergroupDeleteOutlined, SmileOutlined, LogoutOutlined, EditOutlined, DownOutlined,
  PictureOutlined, PaperClipOutlined, LinkOutlined, BookOutlined, ThunderboltOutlined,
  ExclamationCircleFilled, RollbackOutlined, CopyOutlined, CloseOutlined, CheckOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../auth/perm'
import { useAppStore } from '../store/useAppStore'
import { playBeep, unlockAudio } from '../notify'
import { wsClient, type WsStatus } from '../ws/client'
import {
  assignConversation, claimConversation, closeConversation, getConversation, getConversationCounts,
  listConversations, listMessages, replyConversation, retractConversationMessage,
  searchConversations, sendConversationTyping, updateCustomerContact,
  type ConversationCounts,
} from '../api/conversation'
import { pageMembers } from '../api/member'
import { uploadFile } from '../api/file'
import { blockCustomer, removeBlacklist } from '../api/blacklist'
import { listQuickReplies, listCategories, type QuickReplyVO, type QuickReplyCategoryVO } from '../api/quickReply'
import { contentToPlaceholder, parseReplySegments } from '../utils/quickReply'
import type { ConversationDetailVO, ConversationVO, MemberVO, MessageVO, PendingMsg } from '../types'

// 视图 → 列表查询的 view 参数
type CategoryKey = 'mine' | 'mention' | 'unassigned' | 'all'
type TabKey = 'open' | 'closed'

// 进行中/已结束 → 后端 status。实测新会话(含未分配)均为 status=1(进行中),0(等待)暂未使用;
// 未分配视图后端已 isNull(assignee).ne(2),此处再限定进行中即可。故统一:进行中=1,已结束=2。
function statusOf(tab: TabKey): number {
  return tab === 'closed' ? 2 : 1
}

// 暂存待发附件
type AttKind = 'image' | 'video' | 'file'
interface StagedAtt { localId: string; name: string; size: number; kind: AttKind; previewUrl: string; url?: string }

// 按扩展名判类(与后端 MinioService 白名单一致);非白名单返回 ''
function fileKind(name: string): AttKind | '' {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'].includes(ext)) return 'file'
  return ''
}

// 文件大小友好显示
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// 富文本渲染:把消息文本里的 Markdown 链接 [文本](url) 渲染成可点击链接(新标签打开),其余为纯文本。
// linkColor 由调用方按气泡底色给定(浅底用蓝、深底用浅蓝),保证对比可读。
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
function renderRichText(text: string, linkColor = '#1677ff'): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let mt: RegExpExecArray | null
  LINK_RE.lastIndex = 0
  let i = 0
  while ((mt = LINK_RE.exec(text)) !== null) {
    if (mt.index > last) nodes.push(text.slice(last, mt.index))
    nodes.push(
      <a key={`lk${i++}`} href={mt[2]} target="_blank" rel="noreferrer"
        style={{ color: linkColor, textDecoration: 'underline' }} onClick={(e) => e.stopPropagation()}>
        {mt[1]}
      </a>,
    )
    last = mt.index + mt[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
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

// 可撤回时限:与后端一致(2分钟)
const RETRACT_WINDOW_MS = 2 * 60 * 1000

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
  const setUnreadTotal = useAppStore((s) => s.setUnreadTotal)

  const panelGray = isDark ? token.colorBgLayout : '#f7f7f7'
  const splitBorder = `0.5px solid ${isDark ? token.colorSplit : 'rgba(0,0,0,0.1)'}`

  const [active, setActive] = useState<CategoryKey>('mine')
  const [tab, setTab] = useState<TabKey>('open')
  const [collapsed, setCollapsed] = useState(false)

  // 会话搜索:type=uid 业务系统UID / content 会话内容
  const canSearch = hasFunction('inbox.search')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchType, setSearchType] = useState<'uid' | 'content'>('uid')
  const [searchKw, setSearchKw] = useState('')
  const [searchResults, setSearchResults] = useState<ConversationVO[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const [list, setList] = useState<ConversationVO[]>([])
  const [total, setTotal] = useState(0)
  const [loadingList, setLoadingList] = useState(false)
  const [counts, setCounts] = useState<ConversationCounts>({ mine: 0, unassigned: 0, all: 0, mention: 0, mineUnread: 0, unassignedUnread: 0 })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetailVO | null>(null)
  const [messages, setMessages] = useState<MessageVO[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const [replyTab, setReplyTab] = useState<'reply' | 'internal'>('reply')
  const [input, setInput] = useState('')
  const [staged, setStaged] = useState<StagedAtt | null>(null) // 输入框上方待发附件
  // 插入链接弹框:链接文本 + 链接地址,确定后以 Markdown 形式 [文本](地址) 插入输入框
  const [linkModal, setLinkModal] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  // hover 在自己消息上时显示「撤回」入口(对齐桌面端交互)
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null)
  // 客户正在输入(瞬时,4s 自动消失)
  const [customerTyping, setCustomerTyping] = useState(false)
  // 当前会话客户已读到的 seq(已读回执:自己消息 seq<=此值显示"已读")
  const [customerReadSeq, setCustomerReadSeq] = useState(0)
  const lastTypingRef = useRef(0)
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // 本地待发/失败消息(乐观渲染,按会话隔离);成功后移除并以服务端消息按 seq 入列
  const [pending, setPending] = useState<PendingMsg[]>([])
  const [wsStatus, setWsStatus] = useState<WsStatus>(wsClient.getStatus())
  // 详情面板:联系方式/邮箱内联编辑
  const [editField, setEditField] = useState<'contact' | 'email' | null>(null)
  const [editVal, setEditVal] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [bizCollapsed, setBizCollapsed] = useState(false)
  const [autoTranslate, setAutoTranslate] = useState(false) // 翻译为占位(AI翻译模块未做)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReplyVO[]>([])
  const [quickCats, setQuickCats] = useState<QuickReplyCategoryVO[]>([])
  const [quickKw, setQuickKw] = useState('')           // 快捷回复面板搜索
  const [quickCat, setQuickCat] = useState<string>('__all__') // 快捷回复面板分类筛选

  const loadQuickReplies = useCallback(() => {
    listQuickReplies().then(setQuickReplies).catch(() => {})
    listCategories().then(setQuickCats).catch(() => {})
  }, [])

  // selectedId 的最新值给 WS 回调用(避免闭包过期)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedId
  const activeRef = useRef(active)
  activeRef.current = active
  // 当前列表镜像(WS 处理器里判断"未知会话"用,避免闭包拿到旧 list)
  const listRef = useRef<ConversationVO[]>([])
  const msgEndRef = useRef<HTMLDivElement>(null)
  const msgScrollRef = useRef<HTMLDivElement>(null)   // 消息滚动容器
  const msgContentRef = useRef<HTMLDivElement>(null)  // 消息内容(ResizeObserver 监听其高度变化贴底)
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
  // 请求序号守卫(latest-wins):WS 项目频道会为"未知会话"高频触发 loadList,多个请求并发在飞;
  // setList 是整列表替换,若"新会话创建前发出的旧请求"比新触发的更晚返回,会把新会话覆盖删掉
  // (表现为「我的」里新会话要等下次轮询才出现)。故只采用最新一次请求的响应,旧响应直接丢弃。
  const loadSeqRef = useRef(0)
  const loadList = useCallback(async () => {
    const mySeq = ++loadSeqRef.current
    setLoadingList(true)
    try {
      const res = await listConversations({ view: active, status: statusOf(tab), page: 1, size: 50 })
      if (mySeq !== loadSeqRef.current) return // 已被更新的请求(或切视图)取代 → 丢弃这次旧响应
      // 未读以服务端 DB 为权威;但当前打开会话强制显示 0(避免轮询把"边看边来的消息"算成未读)
      const cur = selectedRef.current
      setList(res.records.map((c) => (c.id === cur ? { ...c, unreadCount: 0 } : c)))
      setTotal(res.total)
      // serverLastSeq 对账:当前会话服务端 last_seq 超过本地 → 自动补拉(覆盖"静默期最后一帧丢失")
      const curConv = res.records.find((c) => c.id === cur)
      if (curConv && curConv.lastSeq != null && curConv.lastSeq > localMaxSeqRef.current) {
        syncCurrentRef.current()
      }
      // 分类徽标:各视图进行中数量
      getConversationCounts().then(setCounts).catch(() => {})
    } finally {
      if (mySeq === loadSeqRef.current) setLoadingList(false)
    }
  }, [active, tab])
  loadListRef.current = loadList

  // 防抖刷新各分类未读数(红点用):非当前会话来消息时调,合并高频避免刷爆
  const countsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const refreshCountsRef = useRef<() => void>(() => {})
  refreshCountsRef.current = () => {
    clearTimeout(countsTimerRef.current)
    countsTimerRef.current = setTimeout(() => {
      getConversationCounts().then(setCounts).catch(() => {})
    }, 600)
  }

  // 防抖拉列表(仅用于 WS 未知会话触发):项目频道广播会为项目内每条消息触发一次,
  // 300ms 合并突发,减少 /conversations 请求量(切视图/轮询/重连仍直接 loadList,即时)。
  const loadListTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const debouncedLoadListRef = useRef<() => void>(() => {})
  debouncedLoadListRef.current = () => {
    clearTimeout(loadListTimerRef.current)
    loadListTimerRef.current = setTimeout(() => loadListRef.current(), 300)
  }

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
        if (msg.senderType === 'customer') setCustomerTyping(false) // 客户发出消息→输入态结束
        applyIncoming([msg])
      }
      // 提示音:客户新消息且(不在该会话 或 标签页失焦)→ 响铃(对齐现网,在看该会话不打扰)
      if (msg.senderType === 'customer' && (!isCurrent || document.hidden)) {
        playBeep()
      }
      // 非当前会话来客户消息 → 刷新各分类未读数(我的/未分配红点跨视图实时,防抖)
      if (msg.senderType === 'customer' && !isCurrent) {
        refreshCountsRef.current()
      }
      // 未知会话(如新会话经项目频道广播来)→ 列表里没有
      const known = listRef.current.some((c) => c.id === msg.conversationId)
      if (!known) {
        // 「分配给我」的系统消息 = 新会话归我的确定信号(低频):立即 loadList(不走防抖),
        // 保证「我的」视图新会话即时出现,不被项目频道广播的防抖合并拖延/饿死。
        if (
          msg.senderType === 'system' && msg.type === 'assign'
          && String(msg.senderId) === String(myMemberId)
        ) {
          loadListRef.current()
          return
        }
        // 「全部」视图 + 客户消息 → 用消息里的客户名/头像/预览本地即时插入,体感即时;
        // 「我的/未分配」依赖分配信息,不本地插(可能不属于该视图),交给 loadList 服务端正确判定
        if (msg.senderType === 'customer' && activeRef.current === 'all') {
          setList((prev) => prev.some((c) => c.id === msg.conversationId) ? prev : [{
            id: msg.conversationId,
            customerId: msg.senderId,
            customerName: msg.senderName || '',
            customerAvatar: msg.senderAvatar,
            customerUid: null,
            assigneeMemberId: null,
            status: 1,
            lastMessagePreview: msg.content,
            lastSenderAvatar: msg.senderAvatar,
            lastSenderName: msg.senderName || '',
            lastMessageAt: new Date(Number(msg.timestamp)).toISOString(),
            unreadCount: isCurrent ? 0 : 1,
            lastSeq: msg.seq,
          }, ...prev])
        }
        // 任何未知会话的消息(分配系统消息/客户消息/坐席代发)都刷新列表,
        // 让新会话在"创建/分配那一刻"(分配系统消息)就出现,不必等客户首条真实消息;
        // 防抖合并广播突发(latest-wins 守卫保证旧响应不会覆盖新会话)
        debouncedLoadListRef.current()
        return
      }
      // 已知会话来新消息:更新预览/时间/未读,并**置顶**(新消息冒泡到列表顶部,对齐现网)。
      // 缺这一步会导致会话不随新消息上浮——尤其新会话刚以"创建时间"排入后,后续消息也不上移。
      setList((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId)
        if (idx < 0) return prev
        const updated = {
          ...prev[idx],
          lastMessagePreview: msg.content,
          // 同步最近发送者头像/昵称,列表小头像即时更新(否则要等下次 loadList 才刷)
          lastSenderAvatar: msg.senderAvatar,
          lastSenderName: msg.senderName || '',
          lastMessageAt: new Date(Number(msg.timestamp)).toISOString(),
          // 当前会话已打开 → 不累加未读;仅客户发来的才记未读
          unreadCount: isCurrent || msg.senderType !== 'customer' ? prev[idx].unreadCount : prev[idx].unreadCount + 1,
        }
        return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)]
      })
    })
  }, [applyIncoming])

  // ===== 网①:WS 重连(含首连)→ 刷列表 + 补当前会话;网③:窗口聚焦/可见 → 补当前会话 =====
  useEffect(() => {
    const offOpen = wsClient.onOpen(() => {
      loadListRef.current()
      // 重连=新连接,旧订阅失效:重新订阅当前会话,否则非负责会话(代看/全部视图)收不到实时推送,退化成轮询
      if (selectedRef.current) {
        wsClient.subscribe(selectedRef.current)
        syncCurrentRef.current()
      }
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

  // ===== typing:仅响应客户(from=customer)且命中当前会话;4s 无新事件自动消失 =====
  useEffect(() => {
    return wsClient.onTyping((e) => {
      if (e.from !== 'customer' || e.conversationId !== selectedRef.current) return
      setCustomerTyping(true)
      clearTimeout(typingClearRef.current)
      typingClearRef.current = setTimeout(() => setCustomerTyping(false), 4000)
    })
  }, [])

  // ===== 已读回执:客户已读位前进 → 更新当前会话已读 seq(自己消息据此显示已读) =====
  useEffect(() => {
    return wsClient.onRead((e) => {
      if (e.conversationId !== selectedRef.current) return
      setCustomerReadSeq((prev) => Math.max(prev, e.readSeq))
    })
  }, [])

  // 切换会话:清除上一个会话残留的输入态
  useEffect(() => {
    setCustomerTyping(false)
    clearTimeout(typingClearRef.current)
  }, [selectedId])

  // 黏底标志:打开会话默认黏底;用户主动往上滚则取消(避免翻历史时被拽回)。
  // 用标志而非"距底阈值":图片/文件晚加载可能撑高很多,阈值法会误判已离底而不贴底。
  const stickRef = useRef(true)
  const bottomNow = useCallback(() => { const el = msgScrollRef.current; if (el) el.scrollTop = el.scrollHeight }, [])
  // 新消息/待发/输入态:黏底时贴底
  useEffect(() => { if (stickRef.current) bottomNow() }, [messages, pending, customerTyping, bottomNow])
  // 切会话:重置黏底并瞬时贴底
  useEffect(() => { stickRef.current = true; bottomNow() }, [selectedId, bottomNow])
  // 内容高度变化(图片/视频/文件晚加载撑高):只要仍黏底就持续贴底,直到真正到底
  useEffect(() => {
    const content = msgContentRef.current
    if (!content || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { if (stickRef.current) bottomNow() })
    ro.observe(content)
    return () => ro.disconnect()
  }, [selectedId, bottomNow])
  // 监听用户滚动:接近底部(<60px)= 黏底,否则取消黏底
  const onMsgScroll = useCallback(() => {
    const el = msgScrollRef.current
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }, [])

  // 当前列表镜像(WS 处理器判断"未知会话"用)
  useEffect(() => { listRef.current = list }, [list])
  // 未读总数(图标栏红点 + 浏览器标签角标)=只算「我的」未读会话数(我个人待处理);
  // 未分配是全员共享池,不顶进个人标签角标(避免所有坐席标签都被同一批未认领积压撑大),
  // 仅在左侧「未分配」分类内单独亮红点。来自后端 counts,跨视图准;离开清零
  useEffect(() => {
    setUnreadTotal(counts.mineUnread)
  }, [counts, setUnreadTotal])
  useEffect(() => () => setUnreadTotal(0), [setUnreadTotal])

  // ===== 选中会话:订阅 WS + 拉详情/消息 + 清未读 =====
  const selectConversation = useCallback(
    async (conv: ConversationVO) => {
      unlockAudio() // 用户手势内解锁音频,后续新消息提示音才能播放
      if (conv.id === selectedId) return
      if (selectedId) wsClient.unsubscribe(selectedId)
      setSelectedId(conv.id)
      setReplyTab('reply')
      setInput('')
      setEditField(null)
      setDetail(null)
      setMessages([])
      setCustomerReadSeq(0)
      localMaxSeqRef.current = 0
      wsClient.subscribe(conv.id)
      // 本地先清未读(后端拉消息时也会 resetUnread)
      setList((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)))
      setLoadingMsgs(true)
      try {
        const [d, msgs] = await Promise.all([getConversation(conv.id), listMessages(conv.id)])
        setDetail(d)
        setCustomerReadSeq(d.customerReadSeq ?? 0)
        const sorted = mergeMessages([], msgs)
        setMessages(sorted)
        // localMaxSeq = 首屏最新 seq;首屏只取最近 50 条,更早的是历史(翻页另说),不影响实时补漏基准
        localMaxSeqRef.current = sorted.reduce((m, x) => Math.max(m, x.seq), 0)
        // 打开会话已清该会话未读 → 刷新分类未读数,我的/未分配红点跟着消
        refreshCountsRef.current()
      } finally {
        setLoadingMsgs(false)
      }
    },
    [selectedId],
  )

  // ===== 会话搜索 =====
  const openSearch = () => { setSearchOpen(true); setSearchKw(''); setSearchResults([]); setSearched(false) }
  const closeSearch = () => { setSearchOpen(false); setSearchKw(''); setSearchResults([]); setSearched(false) }

  const doSearch = useCallback(async () => {
    const kw = searchKw.trim()
    if (!kw) { setSearchResults([]); setSearched(false); return }
    setSearching(true)
    setSearched(true)
    try {
      const r = await searchConversations({ type: searchType, keyword: kw, page: 1, size: 50 })
      setSearchResults(r.records)
    } finally {
      setSearching(false)
    }
  }, [searchKw, searchType])

  // 命中点击:打开该会话并退出搜索
  const openFromSearch = (c: ConversationVO) => { closeSearch(); selectConversation(c) }

  // 离开收件箱时退订当前会话
  useEffect(() => {
    return () => {
      if (selectedRef.current) wsClient.unsubscribe(selectedRef.current)
    }
  }, [])

  // ===== 发送回复 / 内部消息 =====
  // 真正发送:成功→服务端消息入列(去重/有序)并移除本地态+更新列表预览;失败→标红保留可重发
  const trySend = useCallback(
    async (localId: string, content: string, internal: boolean, cid: string) => {
      setPending((p) => p.map((x) => (x.localId === localId ? { ...x, status: 'sending' } : x)))
      try {
        const vo = await replyConversation(cid, { content, type: 'text', internal })
        applyIncoming([vo]) // WS 回声/补拉按 seq 去重 + 有序插入 + 推进 localMaxSeq
        setPending((p) => p.filter((x) => x.localId !== localId))
        setList((prev) =>
          prev.map((c) =>
            c.id === cid
              ? { ...c, lastMessagePreview: content, lastSenderAvatar: vo.senderAvatar, lastSenderName: vo.senderName || '', lastMessageAt: new Date(Number(vo.timestamp)).toISOString() }
              : c,
          ),
        )
      } catch {
        setPending((p) => p.map((x) => (x.localId === localId ? { ...x, status: 'failed' } : x)))
      }
    },
    [applyIncoming],
  )

  // 暂存的待发附件(图片/视频/文档):选后先上传,预览在输入框上方,点发送随文本一起发出
  const imageInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)
  // 选文件:imagesOnly=true 仅接受图片(图片按钮);否则图片/视频/文档(附件按钮)
  const pickFile = useCallback((file: File, imagesOnly: boolean) => {
    const kind = fileKind(file.name)
    if (!kind || (imagesOnly && kind !== 'image')) { message.error(t('inbox.fileUnsupported')); return }
    const max = kind === 'image' ? 10 * 1024 * 1024 : 20 * 1024 * 1024
    if (file.size > max) { message.error(t('inbox.fileTooLarge')); return }
    const localId = `a_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const previewUrl = kind === 'file' ? '' : URL.createObjectURL(file)
    setStaged((prev) => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return { localId, name: file.name, size: file.size, kind, previewUrl } })
    uploadFile(file)
      .then((url) => setStaged((s) => (s && s.localId === localId ? { ...s, url } : s)))
      .catch(() => { message.error(t('inbox.imageFailed')); setStaged((s) => (s && s.localId === localId ? null : s)) })
  }, [t])
  const clearStaged = useCallback(() => {
    setStaged((prev) => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null })
  }, [])
  // 附件按钮:选中即直接发送(不进编辑栏预览、不带文字说明),与图片按钮的"预览后发"区分
  const sendFileDirect = useCallback(async (file: File) => {
    if (!selectedId) return
    const kind = fileKind(file.name)
    if (!kind) { message.error(t('inbox.fileUnsupported')); return }
    const max = kind === 'image' ? 10 * 1024 * 1024 : 20 * 1024 * 1024
    if (file.size > max) { message.error(t('inbox.fileTooLarge')); return }
    const internal = replyTab === 'internal'
    const hide = message.loading(t('inbox.imageUploading'), 0)
    try {
      const url = await uploadFile(file)
      const vo = await replyConversation(selectedId, {
        content: url, type: kind,
        payload: kind === 'file' ? { name: file.name, size: file.size } : undefined,
        internal,
      })
      applyIncoming([vo])
      const prev = kind === 'image' ? t('inbox.imageTag') : kind === 'video' ? t('inbox.videoTag') : t('inbox.fileTag')
      setList((p) => p.map((c) => (c.id === selectedId
        ? { ...c, lastMessagePreview: prev, lastSenderAvatar: vo.senderAvatar, lastSenderName: vo.senderName || '', lastMessageAt: new Date(Number(vo.timestamp)).toISOString() }
        : c)))
    } catch { message.error(t('inbox.imageFailed')) } finally { hide() }
  }, [selectedId, replyTab, applyIncoming, t])

  // 快捷回复-放入回复框:把话术「文本部分」插入输入框(内嵌图片此处略去,可用"直接发送")
  const insertQuickReply = useCallback((q: QuickReplyVO) => {
    const text = parseReplySegments(q.content).filter((s) => s.type === 'text').map((s) => s.type === 'text' ? s.text : '').join('').trim()
    if (text) setInput((prev) => (prev ? prev + '\n' : '') + text)
    setQuickOpen(false)
  }, [])

  // 快捷回复-直接发送:含图则整条作为「一个气泡」的富消息(rich,图文按序);纯文本则普通文本
  const sendQuickReply = useCallback(async (q: QuickReplyVO) => {
    if (!selectedId) return
    setQuickOpen(false)
    const internal = replyTab === 'internal'
    const segs = parseReplySegments(q.content)
    const hasImg = segs.some((s) => s.type === 'image')
    try {
      const body = hasImg
        ? { content: contentToPlaceholder(q.content), type: 'rich', payload: { segments: segs }, internal }
        : { content: q.content.trim(), type: 'text', internal }
      const vo = await replyConversation(selectedId, body)
      applyIncoming([vo])
      const prev = hasImg ? contentToPlaceholder(q.content) : q.content.trim()
      setList((p) => p.map((c) => (c.id === selectedId
        ? { ...c, lastMessagePreview: prev, lastSenderAvatar: vo.senderAvatar, lastSenderName: vo.senderName || '', lastMessageAt: new Date(Number(vo.timestamp)).toISOString() }
        : c)))
    } catch { message.error(t('inbox.imageFailed')) }
  }, [selectedId, replyTab, applyIncoming, t])

  // 快捷回复面板过滤(搜索 + 分类)
  const filteredQuickReplies = useMemo(() => {
    const kw = quickKw.trim().toLowerCase()
    return quickReplies.filter((q) => {
      if (quickCat !== '__all__' && (quickCat === '__none__' ? !!q.categoryId : q.categoryId !== quickCat)) return false
      if (kw && !(`${q.title || ''}`.toLowerCase().includes(kw) || q.content.toLowerCase().includes(kw))) return false
      return true
    })
  }, [quickReplies, quickKw, quickCat])

  // 发送:有暂存附件先发附件(需已上传完成),再发文本(文本走乐观态,失败可重发)
  const onSend = useCallback(async () => {
    if (!selectedId) return
    const content = input.trim()
    const att = staged
    if (!content && !att) return
    const internal = replyTab === 'internal'
    // 有附件:附件 + 文字合并为「一条」消息(文字作 caption,显示在媒体下方);文字被消费,不再单独发
    if (att) {
      if (!att.url) { message.info(t('inbox.imageUploading')); return } // 上传未完成,稍等
      try {
        const vo = await replyConversation(selectedId, {
          content: att.url, type: att.kind,
          payload: {
            ...(att.kind === 'file' ? { name: att.name, size: att.size } : {}),
            ...(content ? { caption: content } : {}),
          },
          internal,
        })
        applyIncoming([vo])
        const prev = att.kind === 'image' ? t('inbox.imageTag') : att.kind === 'video' ? t('inbox.videoTag') : t('inbox.fileTag')
        setList((p) => p.map((c) => (c.id === selectedId
          ? { ...c, lastMessagePreview: prev, lastSenderAvatar: vo.senderAvatar, lastSenderName: vo.senderName || '', lastMessageAt: new Date(Number(vo.timestamp)).toISOString() }
          : c)))
      } catch { message.error(t('inbox.imageFailed')) }
      clearStaged()
      setInput('')
      return
    }
    // 纯文字:走乐观态
    if (content) {
      const localId = `l_${Date.now()}_${Math.random().toString(16).slice(2)}`
      setPending((p) => [...p, { localId, conversationId: selectedId, content, internal, status: 'sending', time: Date.now() }])
      setInput('')
      void trySend(localId, content, internal, selectedId)
    }
  }, [input, selectedId, replyTab, staged, trySend, applyIncoming, clearStaged, t])

  // 点击失败消息的❗重发(用同一本地项,成功后并入正常消息流)
  const onResend = useCallback(
    (localId: string) => {
      const item = pending.find((x) => x.localId === localId)
      if (item) void trySend(localId, item.content, item.internal, item.conversationId)
    },
    [pending, trySend],
  )


  // 复制消息文本到剪贴板
  const copyMsg = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).then(() => message.success(t('inbox.copied'))).catch(() => {})
  }, [t])

  // 输入中:节流 3s 通知客户(瞬时,不落库);失败静默
  const onTypingSend = useCallback(() => {
    if (!selectedId) return
    const now = Date.now()
    if (now - lastTypingRef.current < 3000) return
    lastTypingRef.current = now
    void sendConversationTyping(selectedId).catch(() => {})
  }, [selectedId])

  // 撤回自己发送的消息:成功后用返回的已撤回 VO(isVisible=false)按 seq 替换;WS 回声幂等
  const onRetract = useCallback(
    async (msgId: string) => {
      if (!selectedId) return
      try {
        applyIncoming([await retractConversationMessage(selectedId, msgId)])
      } catch (e) {
        const code = (e as { code?: number })?.code
        message.warning(code === 1026 ? t('inbox.retractExpired') : t('inbox.retractFailed'))
      }
    },
    [selectedId, applyIncoming],
  )

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 输入法候选框打开时(拼音/中文组词中)按回车是"选词"而非"发送":
    // isComposing 或 keyCode 229 表示正在组词,直接放行交给输入法,避免误发+二次发送
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
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

  // ===== 指派会话(头部「未分配/坐席名 ▾」下拉:搜索队友 / 分配给队友 / 不分配)=====
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignKw, setAssignKw] = useState('')
  const [assignMembers, setAssignMembers] = useState<MemberVO[]>([])
  const openAssign = useCallback((o: boolean) => {
    setAssignOpen(o)
    if (o) {
      setAssignKw('')
      pageMembers({ page: 1, size: 500, status: 1 }).then((r) => setAssignMembers(r.records)).catch(() => undefined)
    }
  }, [])
  const doAssign = useCallback(async (memberId: string | null) => {
    if (!selectedId) return
    setAssignOpen(false)
    await assignConversation(selectedId, memberId)
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
    root: { display: 'flex', height: '100%', position: 'relative' },
    col1: { width: 224, flexShrink: 0, background: panelGray, borderRight: splitBorder, display: 'flex', flexDirection: 'column' },
    col2: { width: 300, flexShrink: 0, background: token.colorBgContainer, borderRight: splitBorder, display: 'flex', flexDirection: 'column' },
    col3: { flex: 1, minWidth: 0, background: panelGray, display: 'flex', flexDirection: 'column' },
    col4: { width: 300, flexShrink: 0, background: token.colorBgContainer, borderLeft: splitBorder, display: 'flex', flexDirection: 'column', overflow: 'auto' },
    colHeader: { height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: splitBorder },
    colTitle: { fontWeight: 700, fontSize: 17 },
    groupLabel: { padding: '16px 16px 6px', fontSize: 12, color: token.colorTextSecondary },
    catItem: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 8px', padding: '11px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 15, border: '1px solid transparent' },
    // 选中态用完整 border 简写(勿与 catItem 的 border 简写混 borderColor 单属性,否则 React 切换时旧边框残留)
    catActive: { background: token.colorPrimaryBg, color: token.colorPrimary, fontWeight: 600, border: `1px solid ${token.colorPrimaryBorder}` },
    count: { marginLeft: 'auto', minWidth: 22, height: 20, padding: '0 6px', borderRadius: 6, background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  }

  const renderCat = (c: { key: CategoryKey; label: string; icon: ReactNode }) => {
    const on = c.key === active
    // 红点:仅"该我处理"的分类亮——我的/未分配(来自后端 counts,跨视图准);全部/提及不亮(别人负责的不算我未读)
    const dot = (c.key === 'mine' && counts.mineUnread > 0) || (c.key === 'unassigned' && counts.unassignedUnread > 0)
    return (
      <div key={c.key} className="at-row" style={{ ...styles.catItem, ...(on ? styles.catActive : {}) }} onClick={() => { setActive(c.key); setSelectedId(null) }}>
        <Badge dot count={dot ? 1 : 0} offset={[2, 2]}><span style={{ width: 18, textAlign: 'center', display: 'inline-block' }}>{c.icon}</span></Badge>
        <span>{c.label}</span>
        {/* 各视图进行中会话数(真实计数,来自 /conversations/counts) */}
        <span style={styles.count}>{counts[c.key]}</span>
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
          background: on ? (isDark ? token.colorFillSecondary : token.colorPrimaryBg) : 'transparent',
          borderLeft: `3px solid ${on ? token.colorPrimary : 'transparent'}`,
        }}
      >
        {/* 未读数:角标在客户头像上(红色数字),进入会话清未读才消(对齐现网) */}
        <Badge count={c.unreadCount} size="small" offset={[-4, 4]}>
          <Avatar size={40} src={c.customerAvatar || undefined} style={{ background: token.colorPrimary, flexShrink: 0 }}>
            {(c.customerName || 'U').charAt(0).toUpperCase()}
          </Avatar>
        </Badge>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {/* 对齐参考:有业务系统UID 显示 UID(便于按业务身份识别),游客无 UID 显示昵称 */}
            {c.customerUid || c.customerName || c.customerId}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.lastMessagePreview || ''}
          </div>
        </div>
        {/* 右列:时间(上)+ 最近消息发送者小头像(下),分列避免与未读数挤在一起 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0, marginLeft: 8 }}>
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>{fmtListTime(c.lastMessageAt)}</span>
          {(c.lastSenderAvatar || c.lastSenderName) && (
            <Avatar size={20} src={c.lastSenderAvatar || undefined}
              style={{ fontSize: 10, background: token.colorFillSecondary, color: token.colorTextSecondary }}>
              {(c.lastSenderName || 'U').charAt(0).toUpperCase()}
            </Avatar>
          )}
        </div>
      </div>
    )
  }

  // ===== 单条消息气泡(坐席右蓝 / 客户左白 / 内部消息黄)=====
  const renderMessage = (m: MessageVO) => {
    // 系统消息(分配/移除/超时):居中灰字,仅坐席可见。按 payload.sysType 走界面语言本地化,
    // 无 sysType(旧数据)回退显示后端 content。
    if (m.senderType === 'system') {
      const st = m.payload?.sysType
      const text = st === 'assigned' ? t('inbox.sys.assigned', { name: m.payload?.name || '' })
        : st === 'unassigned' ? t('inbox.sys.unassigned')
          : st === 'timeout' ? t('inbox.sys.timeout')
            : m.content
      return (
        <div key={m.msgId} style={{ textAlign: 'center', margin: '2px 0 16px' }}>
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>{text}</span>
        </div>
      )
    }
    const mine = m.senderType === 'agent'
    // 已撤回(isVisible=false):居中系统行,不显原文。坐席端始终显示(信使端开关只控信使侧)
    if (m.isVisible === false) {
      const txt = m.senderType === 'customer'
        ? t('inbox.retractedByCustomer')
        : String(m.senderId) === String(myMemberId)
          ? t('inbox.retractedByYou')
          : t('inbox.retractedByAgent')
      return (
        <div key={m.msgId} style={{ textAlign: 'center', margin: '2px 0 16px' }}>
          <span style={{ fontSize: 12, color: token.colorTextTertiary, background: token.colorFillTertiary, padding: '3px 12px', borderRadius: 6 }}>{txt}</span>
        </div>
      )
    }
    const internal = !!m.internal
    // 对方气泡:暗色用中灰、浅色用浅灰(都比各自背景明显;原 colorBgContainer 白贴白/黑贴黑都看不清)
    // 坐席自己消息:浅蓝底+深字(原纯蓝底导致蓝色链接看不清);对方:浅灰底。内部消息:暖黄。
    const bubbleBg = internal ? (isDark ? '#5c4b1f' : '#fff7e6') : mine ? (isDark ? '#2b3a55' : '#e7ecff') : (isDark ? '#3a3b42' : '#eceef2')
    const bubbleColor = internal ? token.colorText : token.colorText
    // 链接色:深色主题用浅蓝,浅色主题用标准蓝,保证在各气泡底色上可读
    const linkColor = isDark ? '#69b1ff' : '#1677ff'
    // 自己发的、2分钟内 → 可撤回(hover 显示入口)
    const retractable = mine && String(m.senderId) === String(myMemberId) && Date.now() - m.timestamp < RETRACT_WINDOW_MS
    const iconStyle = { fontSize: 14, color: token.colorTextSecondary, cursor: 'pointer', padding: 4 }
    // hover 工具条:自己消息=复制+撤回(限时,点击直接撤回无需确认);别人消息=复制
    const toolbar = hoverMsgId === m.msgId && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '1px 4px', background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, boxShadow: token.boxShadowTertiary, flexShrink: 0 }}>
        <Tooltip title={t('inbox.copy')}>
          <CopyOutlined style={iconStyle} onClick={() => copyMsg(m.content)} />
        </Tooltip>
        {retractable && (
          <Tooltip title={t('inbox.retract')}>
            <RollbackOutlined style={iconStyle} onClick={() => onRetract(m.msgId)} />
          </Tooltip>
        )}
      </div>
    )
    return (
      <div key={m.msgId}
        style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, marginBottom: 16 }}
        onMouseEnter={() => setHoverMsgId(m.msgId)}
        onMouseLeave={() => setHoverMsgId((cur) => (cur === m.msgId ? null : cur))}
      >
        <Avatar size={32} src={m.senderAvatar || undefined} style={{ background: mine ? token.colorPrimary : token.colorTextQuaternary, flexShrink: 0 }}>
          {(m.senderName || (mine ? 'A' : 'U')).charAt(0).toUpperCase()}
        </Avatar>
        <div style={{ maxWidth: '62%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {internal && <span style={{ fontSize: 11, color: token.colorWarning, marginBottom: 2 }}>{t('inbox.internalNote')}</span>}
          {/* 自己消息:工具条在气泡左侧;别人消息:在气泡右侧(都朝会话中心) */}
          <div style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            {m.type === 'rich' ? (
              // 富消息(快捷回复图文混排):一个气泡内按序渲染文本/图片
              <div style={{ maxWidth: 280, borderRadius: 8, [mine ? 'borderTopRightRadius' : 'borderTopLeftRadius']: 2, background: bubbleBg, color: bubbleColor, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(m.payload?.segments || []).map((seg, i) => (seg.type === 'text'
                  ? <div key={i} style={{ fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{mine ? renderRichText(seg.text || '', linkColor) : (seg.text || '')}</div>
                  : <Image key={i} src={seg.url} style={{ display: 'block', maxWidth: 256, maxHeight: 300, borderRadius: 6 }} />))}
              </div>
            ) : m.type === 'image' || m.type === 'video' || m.type === 'file' ? (
              // 富消息:媒体 +(可选)文字说明在「同一个气泡」里(媒体在上、文字在下)
              <div style={{ width: 'fit-content', maxWidth: 260, borderRadius: 10, overflow: 'hidden', background: m.payload?.caption ? bubbleBg : 'transparent' }}>
                {m.type === 'image' ? (
                  <Image src={m.content} style={{ display: 'block', maxWidth: 260, maxHeight: 300 }} />
                ) : m.type === 'video' ? (
                  <video src={m.content} controls preload="metadata" style={{ display: 'block', maxWidth: 260, maxHeight: 300, background: '#000' }} />
                ) : (
                  <a href={m.content} target="_blank" rel="noreferrer" download
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: m.payload?.caption ? 'transparent' : token.colorBgElevated, border: m.payload?.caption ? 'none' : `1px solid ${token.colorBorderSecondary}`, borderRadius: m.payload?.caption ? 0 : 10, color: m.payload?.caption ? bubbleColor : token.colorText }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>📎</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.payload?.name || m.content.split('/').pop()}</span>
                      {m.payload?.size != null && <span style={{ fontSize: 12, opacity: 0.7 }}>{fmtSize(m.payload.size)}</span>}
                    </span>
                  </a>
                )}
                {m.payload?.caption && (
                  <div style={{ padding: '8px 12px', color: bubbleColor, fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {mine ? renderRichText(m.payload.caption, linkColor) : m.payload.caption}
                  </div>
                )}
              </div>
            ) : (
              // 微信式气泡:贴头像那侧的上角变直成小尖角(自己头像在右→右上直角;对方在左→左上直角)
              <div style={{ padding: '8px 13px', borderRadius: 8, [mine ? 'borderTopRightRadius' : 'borderTopLeftRadius']: 2, background: bubbleBg, color: bubbleColor, fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: internal ? `1px solid ${token.colorWarningBorder}` : 'none', boxShadow: 'none' }}>
                {/* 链接仅对坐席消息解析:客户没有插入链接的入口,其手打 [x](y) 一律纯文本(防伪造钓鱼链接) */}
                {mine ? renderRichText(m.content, linkColor) : m.content}
              </div>
            )}
            {toolbar}
          </div>
          <span style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 4 }}>
            {/* 已读回执:自己(非内部)消息只显示"未读";已读不显示(对齐现网) */}
            {mine && !internal && m.seq > customerReadSeq && (
              <span style={{ marginRight: 5, color: token.colorPrimary }}>
                {t('inbox.unread')}
              </span>
            )}
            {fmtMsgTime(m.timestamp)}
          </span>
        </div>
      </div>
    )
  }

  // 本地待发/失败消息(坐席自己,右侧);失败时气泡左侧红色感叹号,点击重发
  const renderPending = (p: PendingMsg) => {
    // 与已发消息一致:坐席自己浅蓝底深字(内部消息暖黄)
    const bubbleBg = p.internal ? (isDark ? '#5c4b1f' : '#fff7e6') : (isDark ? '#2b3a55' : '#e7ecff')
    const bubbleColor = token.colorText
    return (
      <div key={p.localId} style={{ display: 'flex', flexDirection: 'row-reverse', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Avatar size={32} style={{ background: token.colorPrimary, flexShrink: 0 }}>A</Avatar>
        <div style={{ maxWidth: '62%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {p.internal && <span style={{ fontSize: 11, color: token.colorWarning, marginBottom: 2 }}>{t('inbox.internalNote')}</span>}
          <div style={{ padding: '8px 13px', borderRadius: 8, borderTopRightRadius: 2, background: bubbleBg, color: bubbleColor, fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', border: p.internal ? `1px solid ${token.colorWarningBorder}` : 'none', opacity: p.status === 'sending' ? 0.7 : 1 }}>
            {p.content}
          </div>
          <span style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 4 }}>{fmtMsgTime(p.time)}</span>
        </div>
        {p.status === 'failed' && (
          <Tooltip title={t('inbox.resend')}>
            <ExclamationCircleFilled onClick={() => onResend(p.localId)} style={{ color: token.colorError, fontSize: 18, cursor: 'pointer', flexShrink: 0 }} />
          </Tooltip>
        )}
      </div>
    )
  }

  const closed = detail?.status === 2
  // 当前会话的本地待发/失败消息
  const currentPending = pending.filter((p) => p.conversationId === selectedId)
  const unassigned = detail != null && detail.assigneeMemberId == null

  return (
    <div style={styles.root}>
      {/* 第一栏:分类视图 */}
      {!collapsed && (
        <div style={styles.col1}>
          <div style={styles.colHeader}>
            <span style={styles.colTitle}>{t('inbox.title')}</span>
            {canSearch && (
              <SearchOutlined
                onClick={openSearch}
                style={{ fontSize: 16, color: searchOpen ? token.colorPrimary : token.colorTextSecondary, cursor: 'pointer' }}
              />
            )}
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
          {/* 选中滑块上淡蓝底+主色字(走 token,不硬编码),配合下方加粗,选中更醒目 */}
          <ConfigProvider theme={{ components: { Segmented: { itemSelectedBg: token.colorPrimaryBg, itemSelectedColor: token.colorPrimary } } }}>
            <Segmented
              block
              value={tab}
              onChange={(v) => { setTab(v as TabKey); setSelectedId(null) }}
              options={[
                {
                  value: 'open',
                  label: <span style={{ fontWeight: tab === 'open' ? 600 : 400 }}>
                    {`${t('inbox.inProgress')} ${tab === 'open' ? total : ''}`.trim()}
                  </span>,
                },
                {
                  value: 'closed',
                  label: <span style={{ fontWeight: tab === 'closed' ? 600 : 400 }}>
                    {t('inbox.closed')}
                  </span>,
                },
              ]}
            />
          </ConfigProvider>
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
              {/* 左:客户头像 + 名字 + 在线/离线状态(对齐参考) */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar size={36} src={detail.customerAvatar || undefined} style={{ background: token.colorPrimary, flexShrink: 0 }}>
                  {(detail.customerName || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <span style={{ minWidth: 0 }}>
                  <span style={{ ...styles.colTitle, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {detail.externalUserId || detail.customerName || detail.customerId}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: detail.customerOnline ? token.colorSuccess : token.colorTextTertiary }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: detail.customerOnline ? token.colorSuccess : token.colorTextQuaternary }} />
                    {detail.customerOnline ? t('inbox.online') : t('inbox.offline')}
                  </span>
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, color: token.colorTextTertiary, fontSize: 13 }}>
                {wsStatus !== 'open' && <span style={{ color: token.colorWarning }}>{t('inbox.reconnecting')}</span>}
                {wsStatus !== 'open' && <span style={{ color: token.colorWarning }}>{t('inbox.reconnecting')}</span>}
                {/* 指派下拉(对齐参考:搜索队友/分配给队友/不分配),所有坐席可操作;已结束会话也可重新分配 */}
                {(
                  <Popover
                    trigger="click"
                    placement="bottomRight"
                    open={assignOpen}
                    onOpenChange={openAssign}
                    content={
                      <div style={{ width: 240 }}>
                        <Input
                          size="small" allowClear prefix={<SearchOutlined />} placeholder={t('inbox.assignSearch')}
                          value={assignKw} onChange={(e) => setAssignKw(e.target.value)} style={{ marginBottom: 8 }}
                        />
                        <div style={{ maxHeight: 240, overflow: 'auto' }}>
                          <div style={{ fontSize: 12, color: token.colorTextTertiary, padding: '2px 4px 6px' }}>{t('inbox.assignTo')}</div>
                          {assignMembers
                            .filter((m) => !assignKw.trim() || (m.nickname || '').includes(assignKw.trim()))
                            .map((m) => (
                              <div key={m.id} className="at-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', borderRadius: 6, cursor: 'pointer' }} onClick={() => doAssign(m.id)}>
                                <Avatar size={22} src={m.avatar || undefined}>{(m.nickname || 'U').charAt(0)}</Avatar>
                                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nickname}</span>
                                {m.id === detail.assigneeMemberId && <CheckOutlined style={{ color: token.colorPrimary }} />}
                              </div>
                            ))}
                          <div className="at-row" style={{ padding: '8px 6px', borderRadius: 6, cursor: 'pointer', borderTop: `1px solid ${token.colorBorderSecondary}`, marginTop: 4, fontSize: 13 }} onClick={() => doAssign(null)}>
                            {t('inbox.assignNone')}
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: token.colorTextSecondary }}>
                      {/* 已分配:显示负责坐席头像+名字;未分配:只显示「未分配」 */}
                      {detail.assigneeMemberId != null && (
                        <Avatar size={22} src={detail.assigneeAvatar || undefined} style={{ flexShrink: 0 }}>
                          {(detail.assigneeName || 'A').charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                      {detail.assigneeName || (detail.assigneeMemberId === myMemberId ? t('inbox.mine') : t('inbox.unassignedTag'))}
                      <DownOutlined style={{ fontSize: 10 }} />
                    </span>
                  </Popover>
                )}
                {!closed && (
                  <Popconfirm title={t('inbox.closeConfirm')} okText={t('common.confirm')} cancelText={t('common.cancel')} onConfirm={onClose}>
                    <LogoutOutlined style={{ fontSize: 18, cursor: 'pointer', color: token.colorTextSecondary }} title={t('inbox.close')} />
                  </Popconfirm>
                )}
              </span>
            </div>

            <div ref={msgScrollRef} onScroll={onMsgScroll} style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              <div ref={msgContentRef}>
                {loadingMsgs ? (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spin /></div>
                ) : messages.length === 0 && currentPending.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40, color: token.colorTextTertiary }}>{t('inbox.noMessages')}</div>
                ) : (
                  <>
                    {messages.map(renderMessage)}
                    {currentPending.map(renderPending)}
                  </>
                )}
                {/* 客户正在输入(瞬时;4s 自动消失) */}
                {customerTyping && (
                  <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8 }}>{t('inbox.customerTyping')}</div>
                )}
                <div ref={msgEndRef} />
              </div>
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
                onChange={(e) => {
                  setInput(e.target.value)
                  // 仅"回复"tab(非内部消息)且有内容时通知客户输入中(节流在回调内)
                  if (e.target.value.trim() && replyTab === 'reply') onTypingSend()
                }}
                onKeyDown={onInputKeyDown}
                placeholder={t(replyTab === 'reply' ? 'inbox.replyPlaceholder' : 'inbox.internalPlaceholder')}
                autoSize={{ minRows: 5, maxRows: 10 }}
                variant="borderless"
                style={{ padding: 0, fontSize: 15 }}
              />
              {/* 待发附件预览:图片/视频缩略图 或 文件卡片;未传完显示 spinner,右上角✕移除 */}
              {staged && (
                <div style={{ position: 'relative', display: 'inline-block', marginTop: 8, maxWidth: 200 }}>
                  {staged.kind === 'image' ? (
                    <img src={staged.previewUrl} alt="" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, objectFit: 'cover', display: 'block', opacity: staged.url ? 1 : 0.6 }} />
                  ) : staged.kind === 'video' ? (
                    <video src={staged.previewUrl} style={{ maxWidth: 160, maxHeight: 120, borderRadius: 8, display: 'block', background: '#000', opacity: staged.url ? 1 : 0.6 }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, opacity: staged.url ? 1 : 0.6 }}>
                      <span style={{ fontSize: 20 }}>📎</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staged.name}</div>
                        <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{fmtSize(staged.size)}</div>
                      </div>
                    </div>
                  )}
                  {!staged.url && <Spin size="small" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                  <CloseOutlined onClick={clearStaged}
                    style={{ position: 'absolute', top: -6, right: -6, background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: '50%', padding: 3, fontSize: 11, cursor: 'pointer', boxShadow: token.boxShadowTertiary }} />
                </div>
              )}
              {/* 底部:工具栏图标(左)+ 认领/翻译/发送(右)*/}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 18, flex: 1, color: token.colorTextTertiary, fontSize: 18 }}>
                  {/* 隐藏文件选择器:图片按钮(仅图)/ 附件按钮(图/视频/文档) */}
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f, true); e.target.value = '' }} />
                  <input ref={attachInputRef} type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendFileDirect(f); e.target.value = '' }} />
                  {([
                    { icon: <PictureOutlined />, k: 'inbox.toolImage', onClick: () => imageInputRef.current?.click() },
                    { icon: <PaperClipOutlined />, k: 'inbox.toolFile', onClick: () => attachInputRef.current?.click() },
                    { icon: <LinkOutlined />, k: 'inbox.toolLink', onClick: () => { setLinkText(''); setLinkUrl(''); setLinkModal(true) } },
                    { icon: <BookOutlined />, k: 'inbox.toolKb', onClick: () => message.info(t('settings.wip')) },
                  ] as const).map(({ icon, k, onClick }) => (
                    <Tooltip key={k} title={t(k)}>
                      <span style={{ cursor: 'pointer' }} onClick={onClick}>{icon}</span>
                    </Tooltip>
                  ))}
                  {/* 快捷回复:点击弹出列表,选中插入输入框 */}
                  <Popover
                    trigger="click"
                    placement="topLeft"
                    open={quickOpen}
                    onOpenChange={(o) => { setQuickOpen(o); if (o) loadQuickReplies() }}
                    content={
                      <div style={{ width: 720, maxWidth: '80vw' }}>
                        {/* 头部 */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{t('inbox.toolQuick')}</span>
                          <CloseOutlined style={{ cursor: 'pointer', color: token.colorTextTertiary }} onClick={() => setQuickOpen(false)} />
                        </div>
                        {/* 搜索 + 分类 */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          <Input allowClear prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                            placeholder={t('qr.name')} value={quickKw} onChange={(e) => setQuickKw(e.target.value)} style={{ flex: 1 }} />
                          <Select value={quickCat} onChange={setQuickCat} style={{ width: 160 }}
                            options={[{ value: '__all__', label: t('qr.catAll') }, { value: '__none__', label: t('qr.catNone') },
                              ...quickCats.map((c) => ({ value: c.id, label: c.name }))]} />
                        </div>
                        {/* 表头 */}
                        <div style={{ display: 'flex', padding: '0 8px 8px', fontSize: 13, color: token.colorTextTertiary, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                          <span style={{ width: 130, flexShrink: 0 }}>{t('qr.name')}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>{t('qr.content')}</span>
                          <span style={{ width: 90, flexShrink: 0 }}>{t('qr.category')}</span>
                          <span style={{ width: 150, flexShrink: 0, textAlign: 'right' }}>{t('qr.action')}</span>
                        </div>
                        {/* 列表 */}
                        <div style={{ maxHeight: 320, overflow: 'auto' }}>
                          {filteredQuickReplies.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('inbox.quickEmpty')} style={{ padding: '24px 0' }} />
                          ) : (
                            filteredQuickReplies.map((q) => (
                              <div key={q.id} className="at-row" style={{ display: 'flex', alignItems: 'center', padding: '10px 8px', fontSize: 13 }}>
                                <span style={{ width: 130, flexShrink: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{q.title || '--'}</span>
                                <span style={{ flex: 1, minWidth: 0, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{contentToPlaceholder(q.content)}</span>
                                <span style={{ width: 90, flexShrink: 0, color: token.colorTextTertiary }}>{q.categoryName || t('qr.catNone')}</span>
                                <span style={{ width: 150, flexShrink: 0, textAlign: 'right' }}>
                                  <a onClick={() => insertQuickReply(q)}>{t('inbox.quickInsert')}</a>
                                  <a style={{ marginLeft: 12 }} onClick={() => sendQuickReply(q)}>{t('inbox.quickSend')}</a>
                                </span>
                              </div>
                            ))
                          )}
                        </div>
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
                <Button type="primary" disabled={!input.trim()} onClick={onSend}>
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
                {detail.externalUserId || detail.customerName || detail.customerId}
              </div>
              <span style={{ display: 'inline-block', marginTop: 4, padding: '1px 8px', borderRadius: 4, background: token.colorPrimaryBg, color: token.colorPrimary, fontSize: 12 }}>
                {detail.customerType === 1 ? t('inbox.detail.visitor') : t('inbox.detail.user')}
              </span>
            </div>
          </div>

          {/* 会话信息:来源渠道=有 groupId 为专属分配(渠道名=专属策略名),否则普通分配 */}
          <DetailSection title={t('inbox.detail.convInfo')} token={token} rows={[
            [t('inbox.detail.convId'), detail.id],
            [t('inbox.detail.ip'), detail.ip || t('inbox.detail.empty')],
            [t('inbox.detail.location'), detail.location || t('inbox.detail.empty')],
            [t('inbox.detail.language'), langLabel(detail.sourceLanguage)],
            [t('inbox.detail.assignee'), detail.assigneeName
              || (detail.assigneeMemberId === myMemberId ? t('inbox.mine') : null)
              || t('inbox.detail.unassigned')],
            [t('inbox.detail.source'), detail.groupId
              ? t('inbox.detail.channelExclusive') : t('inbox.detail.channelNormal')],
            [t('inbox.detail.channelName'), detail.channelName || t('inbox.detail.empty')],
          ]} />

          {/* 客户信息:UID 只读;联系方式/邮箱可内联编辑(两行式,编辑铅笔在值行右侧)*/}
          <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${token.colorSplit}` }}>
            <SectionHeader title={t('inbox.detail.bizInfo')} collapsed={bizCollapsed} onToggle={() => setBizCollapsed((c) => !c)} token={token} />
            {!bizCollapsed && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 8 }}>{t('inbox.detail.bizUid')}:</div>
                  <div style={{ fontSize: 15, wordBreak: 'break-all' }}>{detail.externalUserId || t('inbox.detail.empty')}</div>
                </div>
                {(['contact', 'email'] as const).map((field) => {
                  const label = t(field === 'contact' ? 'inbox.detail.contact' : 'inbox.detail.email')
                  const val = detail[field]
                  const editing = editField === field
                  return (
                    <div key={field} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 8 }}>{label}:</div>
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
                          <span style={{ flex: 1, minWidth: 0, fontSize: 15, wordBreak: 'break-all' }}>{val || t('inbox.detail.empty')}</span>
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

          {/* 黑名单按钮:跟在内容后(对齐参考,内容不足时不强行拉到底);按 detail.blocked 切换「加入/移除」 */}
          <div style={{ padding: '16px' }}>
            {detail.blocked ? (
              <Button
                block
                onClick={() => {
                  const bid = detail.blacklistId
                  if (!bid) return
                  Modal.confirm({
                    title: t('inbox.detail.unblock'),
                    icon: <ExclamationCircleFilled style={{ color: '#faad14' }} />,
                    content: t('inbox.detail.unblockConfirm'),
                    okText: t('common.confirm'),
                    cancelText: t('common.cancel'),
                    onOk: async () => {
                      await removeBlacklist(bid)
                      message.success(t('inbox.detail.unblocked'))
                      if (selectedId) setDetail(await getConversation(selectedId))
                    },
                  })
                }}
              >
                {t('inbox.detail.unblock')}
              </Button>
            ) : (
              <Button
                block
                danger
                onClick={() => {
                  const cid = detail.customerId
                  if (!cid) return
                  const isVisitor = detail.customerType === 1
                  const name = detail.customerName || cid
                  Modal.confirm({
                    title: t('inbox.detail.blacklist'),
                    icon: <ExclamationCircleFilled style={{ color: '#faad14' }} />,
                    content: isVisitor
                      ? t('inbox.detail.blacklistDescVisitor', { name })
                      : t('inbox.detail.blacklistDescUser', { name }),
                    okText: t('common.confirm'),
                    cancelText: t('common.cancel'),
                    onOk: async () => {
                      await blockCustomer(cid, detail.id)
                      message.success(t('inbox.detail.blacklisted'))
                      if (selectedId) setDetail(await getConversation(selectedId))
                    },
                  })
                }}
              >
                {t('inbox.detail.blacklist')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 会话搜索:覆盖列表/聊天/详情区(分类视图保留),退出回到原会话 */}
      {searchOpen && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, left: collapsed ? 0 : 224,
          background: token.colorBgContainer, zIndex: 10, display: 'flex', flexDirection: 'column',
        }}>
          <div style={styles.colHeader}>
            <span style={styles.colTitle}>{t('inbox.searchTitle')}</span>
            <CloseOutlined onClick={closeSearch} style={{ cursor: 'pointer', color: token.colorTextSecondary }} />
          </div>
          <div style={{ padding: '16px 24px' }}>
            <Input
              style={{ maxWidth: 560 }}
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              onPressEnter={doSearch}
              allowClear
              placeholder={t('inbox.searchPh')}
              addonBefore={
                <Select<'uid' | 'content'>
                  value={searchType} onChange={setSearchType} style={{ width: 130 }}
                  options={[
                    { value: 'uid', label: t('inbox.searchByUid') },
                    { value: 'content', label: t('inbox.searchByContent') },
                  ]}
                />
              }
              suffix={<SearchOutlined onClick={doSearch} style={{ cursor: 'pointer', color: token.colorTextTertiary }} />}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {searching ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin /></div>
            ) : !searched ? (
              <div style={{ textAlign: 'center', color: token.colorTextTertiary, paddingTop: '16vh' }}>
                <SearchOutlined style={{ fontSize: 26 }} />
                <div style={{ marginTop: 12, lineHeight: 1.9 }}>{t('inbox.searchHint')}</div>
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('inbox.searchNoResult')} />
              </div>
            ) : (
              searchResults.map((c) => (
                <div key={c.id} className="at-row" onClick={() => openFromSearch(c)}
                  style={{ display: 'flex', gap: 10, padding: '12px 24px', cursor: 'pointer' }}>
                  <Avatar size={40} src={c.customerAvatar || undefined} style={{ background: token.colorPrimary, flexShrink: 0 }}>
                    {(c.customerName || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.customerName || c.customerId}</span>
                      {/* 业务系统UID:重名客户靠它区分(名字随机池小易撞名) */}
                      {c.customerUid && (
                        <span style={{ fontSize: 12, color: token.colorTextTertiary, marginLeft: 6, flexShrink: 0 }}>({c.customerUid})</span>
                      )}
                      <span style={{ fontSize: 12, color: token.colorTextTertiary, marginLeft: 'auto', paddingLeft: 8, flexShrink: 0 }}>{fmtListTime(c.lastMessageAt)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>{c.lastMessagePreview || ''}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 插入链接弹框:确定后以 [文本](地址) 形式追加到输入框,渲染为可点蓝链 */}
      <Modal open={linkModal} title={t('inbox.toolLink')} okText={t('common.confirm')} cancelText={t('common.cancel')}
        onCancel={() => setLinkModal(false)}
        onOk={() => {
          const url = linkUrl.trim()
          if (!url) { message.warning(t('inbox.linkUrlRequired')); return }
          const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
          const text = linkText.trim() || fullUrl
          setInput((prev) => (prev ? prev + ' ' : '') + `[${text}](${fullUrl})`)
          setLinkModal(false)
        }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>{t('inbox.linkText')}</div>
          <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder={t('inbox.linkTextPh')} />
        </div>
        <div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>{t('inbox.linkUrl')}</div>
          <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" />
        </div>
      </Modal>
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
          <div key={k} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 8 }}>{k}:</div>
            <div style={{ fontSize: 15, color: token.colorText, wordBreak: 'break-all' }}>{v}</div>
          </div>
        ))}
    </div>
  )
}
