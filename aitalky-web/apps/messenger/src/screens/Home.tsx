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
  // 团队介绍不在首页 hero 显示(对齐参考:hero 副文案用默认引导语,团队介绍只在聊天头部展示)
  // 回复时间走 agent(后端仅在「有坐席在线」时下发,离线/无人在线为 null)——对齐参考「平衡状态下才告知」
  const agentList = data.agent?.agents ?? []
  const replyTime = replyTimeText(data.agent?.replyTime)

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
        <p>{t('greetingSub')}</p>
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
              <div className="last">{lastMessage || t('noRecent')}</div>
            </div>
            <span style={{ color: 'var(--text-2)' }}>›</span>
          </div>
        </div>

        {/* 开启新的会话:有坐席在线时展示坐席头像 + 预计回复时间(对齐参考 img-64);否则只显示「发起对话」 */}
        <div className="card" onClick={onEnter}>
          {agentList.length > 0 && replyTime ? (
            <div className="recent-row">
              <div className="hc-avatars">
                {agentList.slice(0, 3).map((a, i) => (
                  <span className="hc-avatar" key={i} style={{ zIndex: 3 - i }}>
                    {a.avatar ? <img src={a.avatar} alt="" /> : <span className="hc-avatar-fb" />}
                  </span>
                ))}
              </div>
              <div className="preview">
                <div className="name">{t('startChat')}</div>
                <div className="last">{t('agentReplyTime')} · 🕑 {replyTime}</div>
              </div>
              <span style={{ color: 'var(--brand)' }}>›</span>
            </div>
          ) : (
            <div className="start-row">
              <span>{t('startChat')}</span>
              <span style={{ color: 'var(--brand)' }}>›</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
