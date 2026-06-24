import { t, replyTimeText } from '../i18n'
import type { MessengerInit } from '../types'

interface Props {
  data: MessengerInit
  lastMessage: string | null
  onEnter: () => void
}

// 信使首页问候卡片(对齐 aitalky 20-url-zh / img-83):渐变头图 + 品牌欢迎语 + 紧急通知 + 最近对话 + 发起对话
// 品牌名/LOGO/问候语/团队介绍/紧急通知/回复时间 来自后端信使配置(init 带出);缺省回退默认文案
export default function Home({ data, lastMessage, onEnter }: Props) {
  const cfg = data.config
  const initial = (data.customerName || 'U').charAt(0).toUpperCase()
  const brand = cfg?.brandName?.trim()
  const greeting = cfg?.greeting?.trim()
  const teamIntro = cfg?.teamIntro?.trim()
  const replyTime = replyTimeText(cfg?.replyTime)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div className="home-hero">
        <div className="logo">
          {cfg?.logo ? (
            <img src={cfg.logo} alt="" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
          ) : (
            'Ai'
          )}
        </div>
        {/* 品牌名 + 问候语(任一缺省时回退默认问候,避免空标题) */}
        {brand && <h1>{brand}</h1>}
        {(greeting || !brand) && <h1>{greeting || t('greetingTitle')}</h1>}
        <p>{teamIntro || t('greetingSub')}</p>
      </div>

      <div className="home-cards">
        {/* 紧急通知不在首页展示,仅在聊天窗顶部红条提示(对齐参考系统) */}
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
              <div className="last">{lastMessage || replyTime || t('noRecent')}</div>
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
