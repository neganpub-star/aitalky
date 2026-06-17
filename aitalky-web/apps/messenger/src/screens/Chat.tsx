import type { KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import type { MessageVO, MessengerAgent, MessengerInit, PendingMsg } from '../types'

interface Props {
  data: MessengerInit
  agent: MessengerAgent | null
  messages: MessageVO[]
  pending: PendingMsg[]
  unreadAfterSeq: number | null
  onSend: (text: string) => void
  onSendFile: (file: File) => void
  onResend: (localId: string) => void
  onRetract: (msgId: string) => void
  onTyping: () => void
  peerTyping: boolean
  onBack: () => void
}

// 黑名单错误码:发消息被拦时,失败气泡上方加一条「会话暂不可用」系统提示(文案随信使语言)
const CONVERSATION_BLOCKED = 1024
// 可撤回时限:与后端一致(2分钟)
const RETRACT_WINDOW_MS = 2 * 60 * 1000

// 复制文本到剪贴板(降级忽略异常)
function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

// 消息时间:今天只显 HH:mm,非今天显 MM-DD HH:mm,跨年再带年份(对齐 aitalky)
// 富文本:把消息文本里的 Markdown 链接 [文本](url) 渲染成可点蓝链,其余为纯文本。
// onLink:点击链接的回调(信使端在页内弹窗打开,不跳走)
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
function renderRichText(text: string, onLink: (url: string) => void): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let mt: RegExpExecArray | null
  LINK_RE.lastIndex = 0
  let i = 0
  while ((mt = LINK_RE.exec(text)) !== null) {
    if (mt.index > last) nodes.push(text.slice(last, mt.index))
    const url = mt[2]
    nodes.push(<a key={`lk${i++}`} className="msg-link" href={url}
      onClick={(e) => { e.preventDefault(); onLink(url) }}>{mt[1]}</a>)
    last = mt.index + mt[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

// 文件大小友好显示
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtTime(ms: number): string {
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

// 信使聊天窗(对齐 aitalky 23-userid):返回+标题、客服左灰气泡/客户右蓝气泡、底部输入+发送
export default function Chat({ data, agent, messages, pending, unreadAfterSeq, onSend, onSendFile, onResend, onRetract, onTyping, peerTyping, onBack }: Props) {
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<string | null>(null) // 图片全屏预览(lightbox)的图源 url
  const [webview, setWebview] = useState<string | null>(null) // 点链接:页内弹窗打开网页(不跳走)
  const fileInputRef = useRef<HTMLInputElement>(null) // 回形针:触发图片选择
  const [urgentClosed, setUrgentClosed] = useState(false)
  // 头部默认折叠(只显项目名);点击项目名展开服务坐席(对齐参考)
  const [headerOpen, setHeaderOpen] = useState(false)
  // 点开"撤回"操作的目标消息(点自己气泡展开,再点撤回执行;点别处收起)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  // 菜单弹出方向:顶部消息上方空间不足(会被公告/头部遮挡)时翻转向下弹
  const [menuDown, setMenuDown] = useState(false)
  // 点 ··· 切换菜单:测量上方剩余空间决定向上/向下弹
  const toggleMenu = (e: ReactMouseEvent<HTMLElement>, msgId: string) => {
    e.stopPropagation()
    if (menuFor === msgId) { setMenuFor(null); return }
    const more = e.currentTarget
    const listTop = more.closest('.msg-list')?.getBoundingClientRect().top ?? 0
    // 上方可用空间 < 菜单高度(约96px)→ 向下弹,避免顶出滚动区被遮
    setMenuDown(more.getBoundingClientRect().top - listTop < 96)
    setMenuFor(msgId)
  }
  const endRef = useRef<HTMLDivElement>(null)

  // 客户撤回权限(信使设置开关下发);关则不显示撤回入口
  const canCustomerRetract = data.config?.customerRetractEnabled ?? true

  // 未读分割线:界(unreadAfterSeq)之后首条消息上方画线。开关关、无界、或未读里无客服消息→不画
  const showUnread = (data.config?.sysMsgUnread ?? true) && unreadAfterSeq != null
  let firstUnreadId: string | null = null
  if (showUnread) {
    const unread = messages.filter((m) => m.seq > (unreadAfterSeq as number) && m.isVisible !== false)
    if (unread.some((m) => m.senderType === 'agent')) firstUnreadId = unread[0]?.msgId ?? null
  }

  // 紧急通知(后管配置,init 按客户语言带出);客户可关闭
  const urgent = data.config?.urgentEnabled && data.config.urgentNotice?.trim() ? data.config.urgentNotice : null

  // ===== 头部:标题=项目名;点击展开服务坐席(4 态,见 MessengerAgentVO)=====
  const brandName = data.config?.brandName || data.customerName || ''
  const assigned = agent?.mode === 'ASSIGNED_ONLINE' || agent?.mode === 'ASSIGNED_OFFLINE'
  const agentName = assigned ? agent?.agents?.[0]?.name ?? null : null
  const showOnlineDot = agent?.mode === 'ASSIGNED_ONLINE' // 已分配·在线:头像带绿点

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending, peerTyping])

  const submit = () => {
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 输入法候选框打开时(拼音/中文组词中)按回车是"选词"而非"发送":
    // isComposing 或 keyCode 229 表示正在组词,直接放行交给输入法,避免误发+二次发送
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <>
      <div className="chat-header">
        <div className="back" onClick={onBack}>
          ‹
        </div>
        {/* 标题=项目名;专属渠道接入时品牌名下展示一行渠道名。点击展开/收起服务坐席 */}
        <div className="title" style={{ cursor: 'pointer' }} onClick={() => setHeaderOpen((v) => !v)}>
          {brandName}
          {data.channelName && <div className="chat-channel">{data.channelName}</div>}
        </div>
      </div>

      {/* 展开:服务坐席头像 + 名称 + 在线状态 */}
      {headerOpen && agent && agent.agents.length > 0 && (
        <div className="hc-expand">
          <div className="hc-agent">
            <div className="hc-avatars">
              {agent.agents.slice(0, 3).map((a, i) => (
                <span className="hc-avatar" key={i} style={{ zIndex: 3 - i }}>
                  {a.avatar ? <img src={a.avatar} alt="" /> : <span className="hc-avatar-fb" />}
                  {showOnlineDot && i === 0 && <span className="hc-dot" />}
                </span>
              ))}
            </div>
            <div className="hc-info">
              {agentName && <div className="hc-name">{agentName}</div>}
              {agent.mode === 'POOL_BUSY' ? (
                <>
                  <div className="hc-status">{t('agentBusyTitle')}</div>
                  <div className="hc-status-sub">{t('agentBusyDesc')}</div>
                </>
              ) : agent.mode === 'ASSIGNED_OFFLINE' ? (
                <div className="hc-status">{t('agentOffline')}</div>
              ) : agent.mode === 'ASSIGNED_ONLINE' ? (
                <div className="hc-status">{t('agentOnline')}</div>
              ) : (
                <>
                  <div className="hc-status">{t('agentReplyTime')}</div>
                  {agent.replyTime && <div className="hc-status-sub">🕑 {agent.replyTime}</div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 紧急通知红条(对齐 aitalky:标题栏下方,可关闭) */}
      {urgent && !urgentClosed && (
        <div style={{ background: '#fff1f0', color: '#cf1322', padding: '12px 16px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 线性喇叭图标(对齐参考系统,等同 antd SoundOutlined) */}
            <svg width="16" height="16" viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M625.9 115c-5.9 0-11.9 1.6-17.4 5.3L254 352H90c-8.8 0-16 7.2-16 16v288c0 8.8 7.2 16 16 16h164l354.5 231.7c5.5 3.6 11.6 5.3 17.4 5.3 16.7 0 32.1-13.3 32.1-32.1V147.1c0-18.8-15.4-32.1-32.1-32.1zM586 803L293.4 611.7l-18-11.7H146V424h129.4l17.9-11.7L586 221v582zm348-327H806c-8.8 0-16 7.2-16 16v40c0 8.8 7.2 16 16 16h128c8.8 0 16-7.2 16-16v-40c0-8.8-7.2-16-16-16zm-41.9 261.8l-110.3-63.7a15.9 15.9 0 00-21.7 5.9l-19.9 34.5c-4.4 7.6-1.8 17.4 5.8 21.8L856.3 800a15.9 15.9 0 0021.7-5.9l19.9-34.5c4.4-7.6 1.7-17.4-5.8-21.8zM760 344a15.9 15.9 0 0021.7 5.9L892 286.2c7.6-4.4 10.2-14.2 5.8-21.8L878 230a15.9 15.9 0 00-21.7-5.9L746 287.8a15.99 15.99 0 00-5.8 21.8L760 344z" />
            </svg>
            {urgent}
          </span>
          <span style={{ cursor: 'pointer', opacity: 0.6, flexShrink: 0 }} onClick={() => setUrgentClosed(true)}>✕</span>
        </div>
      )}

      <div className="msg-list" onClick={() => menuFor && setMenuFor(null)}>
        {messages.map((m) => {
          const mine = m.senderType === 'customer'
          const initial = (m.senderName || 'S').charAt(0).toUpperCase()
          // 已撤回(isVisible=false):客户自己撤回→显示居中系统行;客服撤回→对客户永远静默移除
          // (客服撤回属坐席内部动作,不向终端客户暴露;客户只看到该气泡消失)
          if (m.isVisible === false) {
            if (!mine) return null
            return (
              <div key={m.msgId} className="msg-system">
                {t('retractedByYou')}
              </div>
            )
          }
          // 客户自己消息 + 权限开 + 2分钟内 → 可撤回
          const retractable = mine && canCustomerRetract && Date.now() - m.timestamp < RETRACT_WINDOW_MS
          return (
            <Fragment key={m.msgId}>
            {m.msgId === firstUnreadId && <div className="msg-unread-divider">{t('unreadDivider')}</div>}
            <div className={`msg-row ${mine ? 'mine' : ''}`}>
              {/* 对齐 aitalky:客户(自己)消息不显头像,仅客服侧显头像 */}
              {!mine &&
                (m.senderAvatar ? (
                  <img className="avatar" src={m.senderAvatar} alt="" />
                ) : (
                  <div className="avatar" style={{ background: '#ff7a45' }}>
                    {initial}
                  </div>
                ))}
              <div className="msg-body">
                {/* 对齐 aitalky:客服消息在气泡上方显示发送者昵称 */}
                {!mine && m.senderName && <div className="msg-name">{m.senderName}</div>}
                <div className="bubble-wrap">
                  {m.type === 'rich' ? (
                    // 富消息(图文混排):一个气泡内按序渲染文本/图片
                    <div className={`bubble ${mine ? 'mine' : 'agent'} rich-bubble`}>
                      {(m.payload?.segments || []).map((seg, i) => (seg.type === 'text'
                        ? <div key={i} className="rich-text">{mine ? (seg.text || '') : renderRichText(seg.text || '', setWebview)}</div>
                        : <img key={i} className="rich-img" src={seg.url} alt="" onClick={() => seg.url && setPreview(seg.url)} />))}
                    </div>
                  ) : m.type === 'image' || m.type === 'video' || m.type === 'file' ? (
                    // 富消息:媒体 +(可选)文字说明在「同一个气泡」里
                    <div className={`media-bubble ${mine ? 'mine' : 'agent'} ${m.payload?.caption ? 'has-cap' : ''}`}>
                      {m.type === 'image' ? (
                        <img className="media-img" src={m.content} alt="" onClick={() => setPreview(m.content)} />
                      ) : m.type === 'video' ? (
                        <video className="media-video" src={m.content} controls preload="metadata" />
                      ) : (
                        <a className="media-file" href={m.content} target="_blank" rel="noreferrer" download>
                          <span className="bubble-file-ico">📎</span>
                          <span className="bubble-file-meta">
                            <span className="bubble-file-name">{m.payload?.name || m.content.split('/').pop()}</span>
                            {m.payload?.size != null && <span className="bubble-file-size">{fmtSize(m.payload.size)}</span>}
                          </span>
                        </a>
                      )}
                      {m.payload?.caption && <div className="media-caption">{mine ? m.payload.caption : renderRichText(m.payload.caption, setWebview)}</div>}
                    </div>
                  ) : (
                    /* 链接仅对客服消息解析:客户自己没有插入链接的入口,其手打 [x](y) 一律纯文本(防伪造钓鱼链接) */
                    <div className={`bubble ${mine ? 'mine' : 'agent'}`}>{mine ? m.content : renderRichText(m.content, setWebview)}</div>
                  )}
                  {/* 自己消息:气泡旁 ··· 触发复制/撤回菜单(对齐 aitalky:菜单冒泡在 ··· 正上方,带小三角) */}
                  {mine && (
                    <span
                      className="msg-more"
                      onClick={(e) => toggleMenu(e, m.msgId)}
                    >
                      ···
                      {menuFor === m.msgId && (
                        <div className={`msg-menu ${menuDown ? 'down' : ''}`} onClick={(e) => e.stopPropagation()}>
                          <div className="msg-menu-item" onClick={() => { copyText(m.content); setMenuFor(null) }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                            <span>{t('copy')}</span>
                          </div>
                          {retractable && (
                            <div className="msg-menu-item" onClick={() => { setMenuFor(null); onRetract(m.msgId) }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-2" /></svg>
                              <span>{t('retract')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </span>
                  )}
                </div>
                <div className="msg-time">{fmtTime(m.timestamp)}</div>
              </div>
            </div>
            </Fragment>
          )
        })}

        {/* 本地待发/失败消息(乐观渲染,均为客户自己消息→右侧蓝气泡) */}
        {pending.map((p) => (
          <Fragment key={p.localId}>
            {/* 黑名单等业务失败:气泡上方加一条居中系统提示(文案随信使语言,带错误码) */}
            {p.status === 'failed' && p.errorCode === CONVERSATION_BLOCKED && (
              <div className="msg-system">{`${t('blocked')}(${p.errorCode})`}</div>
            )}
            <div className="msg-row mine">
              <div className="msg-body">
                <div className="bubble mine">{p.content}</div>
                <div className="msg-time">{fmtTime(p.time)}</div>
              </div>
              {/* 失败:气泡左侧红色感叹号,点击重发(对齐参考系统) */}
              {p.status === 'failed' && (
                <span className="msg-fail" title={t('resend')} onClick={() => onResend(p.localId)}>
                  !
                </span>
              )}
            </div>
          </Fragment>
        ))}

        {/* 对方(客服)正在输入(瞬时;受 sysMsgTyping 开关控制,App 已过滤) */}
        {peerTyping && <div className="msg-typing">{t('peerTyping')}</div>}
        <div ref={endRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          rows={1}
          placeholder={t('inputPlaceholder')}
          onChange={(e) => {
            setInput(e.target.value)
            if (e.target.value.trim()) onTyping() // 节流在 App 层
          }}
          onKeyDown={onKeyDown}
        />
        {/* 回形针:发送图片/视频/文档(隐藏 input 触发) */}
        <input ref={fileInputRef} type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onSendFile(f); e.target.value = '' }} />
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()} aria-label={t('send')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button className="send-btn" disabled={!input.trim()} onClick={submit} aria-label={t('send')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* 图片全屏预览(lightbox):缩放/旋转工具栏,对齐参考系统 */}
      {preview && <ImageViewer src={preview} onClose={() => setPreview(null)} />}

      {/* 点链接:页内弹窗内嵌网页(不跳走),✕ 关闭。部分站点禁止 iframe 内嵌时显示空白,提供「新窗打开」兜底 */}
      {webview && (
        <div className="webview-mask" onClick={() => setWebview(null)}>
          <div className="webview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="webview-head">
              <span className="webview-url" title={webview}>{webview}</span>
              <a className="webview-open" href={webview} target="_blank" rel="noreferrer">↗</a>
              <span className="webview-close" onClick={() => setWebview(null)}>✕</span>
            </div>
            <iframe className="webview-frame" src={webview} title="webview" />
          </div>
        </div>
      )}
    </>
  )
}

// 轻量图片预览:遮罩 + 居中大图 + 底部工具栏(缩小/放大/左转/右转/重置),点遮罩或✕关闭
function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const zoom = (d: number) => setScale((s) => Math.min(4, Math.max(0.5, +(s + d).toFixed(2))))
  const stop = (e: ReactMouseEvent) => e.stopPropagation()
  const Btn = ({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) => (
    <button className="iv-btn" onClick={(e) => { stop(e); onClick() }} aria-label={label}>{children}</button>
  )
  return (
    <div className="image-viewer" onClick={onClose}>
      <span className="iv-close" onClick={onClose}>✕</span>
      <img className="iv-img" src={src} alt="" onClick={stop}
        style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }} />
      <div className="iv-bar" onClick={stop}>
        <Btn onClick={() => zoom(-0.25)} label="zoom out">−</Btn>
        <Btn onClick={() => zoom(0.25)} label="zoom in">+</Btn>
        <Btn onClick={() => setRotate((r) => r - 90)} label="rotate left">⟲</Btn>
        <Btn onClick={() => setRotate((r) => r + 90)} label="rotate right">⟳</Btn>
        <Btn onClick={() => { setScale(1); setRotate(0) }} label="reset">⤢</Btn>
      </div>
    </div>
  )
}
