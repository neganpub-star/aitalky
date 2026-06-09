import { t } from '../i18n'
import type { MessengerInit } from '../types'

interface Props {
  data: MessengerInit
  lastMessage: string | null
  onEnter: () => void
}

// 信使首页问候卡片(对齐 ByteTrack 20-url-zh):渐变头图 + 最近对话卡 + 发起对话
export default function Home({ data, lastMessage, onEnter }: Props) {
  const initial = (data.customerName || 'U').charAt(0).toUpperCase()
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div className="home-hero">
        <div className="logo">Ai</div>
        <h1>{t('greetingTitle')}</h1>
        <p>{t('greetingSub')}</p>
      </div>

      <div className="home-cards">
        <div className="card" onClick={onEnter}>
          <div className="card-label">{t('recent')}</div>
          <div className="recent-row">
            {data.customerAvatar ? (
              <img className="avatar" src={data.customerAvatar} alt="" />
            ) : (
              <div className="avatar">{initial}</div>
            )}
            <div className="preview">
              <div className="name">{data.customerName}</div>
              <div className="last">{lastMessage || t('noRecent')}</div>
            </div>
            <span style={{ color: 'var(--text-2)' }}>›</span>
          </div>
        </div>

        <div className="card" onClick={onEnter}>
          <div className="start-row">
            <span>{t('startChat')}</span>
            <span style={{ color: 'var(--brand)' }}>›</span>
          </div>
        </div>
      </div>
    </div>
  )
}
