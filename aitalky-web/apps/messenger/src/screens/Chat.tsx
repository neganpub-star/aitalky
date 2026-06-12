import type { KeyboardEvent } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import type { MessageVO, MessengerInit, PendingMsg } from '../types'
import type { WsStatus } from '../ws'

interface Props {
  data: MessengerInit
  messages: MessageVO[]
  status: WsStatus
  pending: PendingMsg[]
  unreadAfterSeq: number | null
  onSend: (text: string) => void
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

// 消息时间:今天只显 HH:mm,非今天显 MM-DD HH:mm,跨年再带年份(对齐 ByteTrack)
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

// 信使聊天窗(对齐 ByteTrack 23-userid):返回+标题、客服左灰气泡/客户右蓝气泡、底部输入+发送
export default function Chat({ data, messages, status, pending, unreadAfterSeq, onSend, onResend, onRetract, onTyping, peerTyping, onBack }: Props) {
  const [input, setInput] = useState('')
  const [urgentClosed, setUrgentClosed] = useState(false)
  // 点开"撤回"操作的目标消息(点自己气泡展开,再点撤回执行;点别处收起)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // 客户撤回权限(信使设置开关下发);关则不显示撤回入口
  const canCustomerRetract = data.config?.customerRetractEnabled ?? true
  // 坐席撤回是否显示系统消息(关则静默移除该气泡)
  const showAgentRetract = data.config?.sysMsgMemberRetract ?? true

  // 未读分割线:界(unreadAfterSeq)之后首条消息上方画线。开关关、无界、或未读里无客服消息→不画
  const showUnread = (data.config?.sysMsgUnread ?? true) && unreadAfterSeq != null
  let firstUnreadId: string | null = null
  if (showUnread) {
    const unread = messages.filter((m) => m.seq > (unreadAfterSeq as number) && m.isVisible !== false)
    if (unread.some((m) => m.senderType === 'agent')) firstUnreadId = unread[0]?.msgId ?? null
  }

  // 紧急通知(后管配置,init 按客户语言带出);客户可关闭
  const urgent = data.config?.urgentEnabled && data.config.urgentNotice?.trim() ? data.config.urgentNotice : null

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
        <div className="title">
          {data.customerName}
          {status !== 'open' && <span className="chat-status">  {t('offline')}</span>}
        </div>
      </div>

      {/* 紧急通知红条(对齐 ByteTrack:标题栏下方,可关闭) */}
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
          // 已撤回(isVisible=false):渲染居中系统行,不显气泡内容
          if (m.isVisible === false) {
            // 客服撤回且开关关闭→静默移除(不渲染任何行)
            if (!mine && !showAgentRetract) return null
            return (
              <div key={m.msgId} className="msg-system">
                {mine ? t('retractedByYou') : t('retractedByAgent')}
              </div>
            )
          }
          // 客户自己消息 + 权限开 + 2分钟内 → 可撤回
          const retractable = mine && canCustomerRetract && Date.now() - m.timestamp < RETRACT_WINDOW_MS
          return (
            <Fragment key={m.msgId}>
            {m.msgId === firstUnreadId && <div className="msg-unread-divider">{t('unreadDivider')}</div>}
            <div className={`msg-row ${mine ? 'mine' : ''}`}>
              {/* 对齐 ByteTrack:客户(自己)消息不显头像,仅客服侧显头像 */}
              {!mine &&
                (m.senderAvatar ? (
                  <img className="avatar" src={m.senderAvatar} alt="" />
                ) : (
                  <div className="avatar" style={{ background: '#ff7a45' }}>
                    {initial}
                  </div>
                ))}
              <div className="msg-body">
                {/* 对齐 ByteTrack:客服消息在气泡上方显示发送者昵称 */}
                {!mine && m.senderName && <div className="msg-name">{m.senderName}</div>}
                <div className="bubble-wrap">
                  <div className={`bubble ${mine ? 'mine' : 'agent'}`}>{m.content}</div>
                  {/* 自己消息:气泡旁 ··· 触发复制/撤回菜单(对齐 ByteTrack:菜单冒泡在 ··· 正上方,带小三角) */}
                  {mine && (
                    <span
                      className="msg-more"
                      onClick={(e) => { e.stopPropagation(); setMenuFor((cur) => (cur === m.msgId ? null : m.msgId)) }}
                    >
                      ···
                      {menuFor === m.msgId && (
                        <div className="msg-menu" onClick={(e) => e.stopPropagation()}>
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
        <button className="send-btn" disabled={!input.trim()} onClick={submit} aria-label={t('send')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </>
  )
}
