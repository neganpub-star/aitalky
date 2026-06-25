import { t, replyTimeText } from '../i18n'
import type { MessengerInit } from '../types'

interface Props {
  data: MessengerInit
  lastMessage: string | null
  onEnter: () => void
}

// 信使端版本号(展示在首页底部,对齐参考 img23)
const VERSION = 'V1.0.0'

// 信使首页(对齐参考 img23):粉彩渐变 hero + 问候语 + 团队介绍 + 单个「在这里说点什么吧」入口 + 版本号
// 问候语/团队介绍来自后端信使配置(品牌名由商户自行写入问候语);预计回复时间仅在有坐席在线时展示
export default function Home({ data, onEnter }: Props) {
  const cfg = data.config
  const greeting = cfg?.greeting?.trim()
  const teamIntro = cfg?.teamIntro?.trim()
  const replyTime = replyTimeText(data.agent?.replyTime)

  return (
    <div className="home">
      <div className="home-hero">
        <div className="logo">
          {cfg?.logo ? <img src={cfg.logo} alt="" /> : 'Ai'}
        </div>
        {/* 问候语 + 团队介绍(对齐参考 img19/img23:大号深色文字,品牌名由商户写入问候语) */}
        <h1>{greeting || t('greetingTitle')}</h1>
        <h1 className="home-sub">{teamIntro || t('greetingSub')}</h1>

        {/* 单个发起会话入口(对齐参考 img23:浮于渐变之上):标题 + 预计回复时间 + 蓝色发送箭头 */}
        <div className="home-start" onClick={onEnter}>
          <div className="home-start-text">
            <div className="home-start-title">{t('startInput')}</div>
            {replyTime && <div className="home-start-sub">{replyTime}</div>}
          </div>
          <span className="home-start-send" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </span>
        </div>
      </div>

      <div className="home-version">{VERSION}</div>
    </div>
  )
}
