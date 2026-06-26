import { useEffect, useState } from 'react'
import { t, replyTimeText } from '../i18n'
import type { MessengerInit, WikiRecommend } from '../types'
import { recommendedArticles } from '../api'
import ArticleView from './ArticleView'

interface Props {
  data: MessengerInit
  appId: string
  lastMessage: string | null
  onEnter: () => void
}

// 信使端版本号(展示在首页底部,对齐参考 img23)
const VERSION = 'V1.0.0'

// 信使首页(对齐参考 img23):粉彩渐变 hero + 问候语 + 团队介绍 + 单个「在这里说点什么吧」入口 + 版本号
// 问候语/团队介绍来自后端信使配置(品牌名由商户自行写入问候语);预计回复时间仅在有坐席在线时展示
export default function Home({ data, appId, onEnter }: Props) {
  const cfg = data.config
  const greeting = cfg?.greeting?.trim()
  const teamIntro = cfg?.teamIntro?.trim()
  const replyTime = replyTimeText(data.agent?.replyTime)
  // 推荐文章(已发布+推荐,最多5篇);点击在 overlay 内阅读
  const [recommends, setRecommends] = useState<WikiRecommend[]>([])
  const [readCode, setReadCode] = useState<string | null>(null)

  useEffect(() => {
    if (appId) recommendedArticles(appId, cfg?.lang || undefined).then(setRecommends).catch(() => {})
  }, [appId, cfg?.lang])

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

      {/* 推荐文章(对齐参考 img14:发起入口下方列表,点击阅读) */}
      {recommends.length > 0 && (
        <div className="home-recommends">
          <div className="home-recommends-title">{t('recommendTitle')}</div>
          {recommends.map((a) => (
            <div key={a.id} className="home-recommend-item" onClick={() => a.shareCode && setReadCode(a.shareCode)}>
              <span className="home-recommend-ico">📖</span>
              <span className="home-recommend-name">{a.title || ''}</span>
              <span className="home-recommend-arrow">›</span>
            </div>
          ))}
        </div>
      )}

      <div className="home-version">{VERSION}</div>

      {readCode && <ArticleView shareCode={readCode} brandName={cfg?.brandName || data.customerName || ''} logo={cfg?.logo} onClose={() => setReadCode(null)} />}
    </div>
  )
}
