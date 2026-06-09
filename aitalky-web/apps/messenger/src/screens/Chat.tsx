import type { KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import type { MessageVO, MessengerInit } from '../types'
import type { WsStatus } from '../ws'

interface Props {
  data: MessengerInit
  messages: MessageVO[]
  status: WsStatus
  sending: boolean
  onSend: (text: string) => void
  onBack: () => void
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
export default function Chat({ data, messages, status, sending, onSend, onBack }: Props) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    const text = input.trim()
    if (!text || sending) return
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

      <div className="msg-list">
        {messages.map((m) => {
          const mine = m.senderType === 'customer'
          const initial = (m.senderName || (mine ? 'U' : 'S')).charAt(0).toUpperCase()
          return (
            <div key={m.msgId} className={`msg-row ${mine ? 'mine' : ''}`}>
              {m.senderAvatar ? (
                <img className="avatar" src={m.senderAvatar} alt="" />
              ) : (
                <div className="avatar" style={mine ? undefined : { background: '#ff7a45' }}>
                  {initial}
                </div>
              )}
              <div className="msg-body">
                <div className={`bubble ${mine ? 'mine' : 'agent'}`}>{m.content}</div>
                <div className="msg-time">{fmtTime(m.timestamp)}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          rows={1}
          placeholder={t('inputPlaceholder')}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="send-btn" disabled={!input.trim() || sending} onClick={submit} aria-label={t('send')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </>
  )
}
