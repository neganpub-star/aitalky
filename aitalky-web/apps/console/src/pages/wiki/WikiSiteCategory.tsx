import { useEffect, useState } from 'react'
import { Spin, Empty } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { renderWikiIcon } from '../../constants/wikiIcons'
import { publicSiteCategory, type WikiCategoryPublicVO, type WikiPublicArticleCard } from '../../api/wiki'

// 对外站点分类页(对齐参考 img-51):顶栏 + 面包屑 + 分类头卡 + 按分组列出已发布文章卡片(标题/摘要/日期)。
export default function WikiSiteCategory() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { key = '', catId = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [data, setData] = useState<WikiCategoryPublicVO | null>(null)

  useEffect(() => {
    setLoading(true)
    publicSiteCategory(key, catId).then(setData)
      .catch(() => setNotFound(true)).finally(() => setLoading(false))
  }, [key, catId])

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 120 }}><Spin /></div>
  if (notFound || !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('wiki.siteNotFound')} />
    </div>
  }
  const h = data.header
  const theme = h.themeColor || '#2f6bff'
  const fmt = (s: string | null) => (s ? s.replace('T', ' ').slice(0, 19) : '')

  const card = (a: WikiPublicArticleCard, idx: number) => (
    <div key={idx} onClick={() => a.shareCode && nav(`/wiki-article/${a.shareCode}`)} className="wiki-site-card" style={{ cursor: 'pointer' }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: theme, marginBottom: 8 }}>{a.title || t('wiki.untitled')}</div>
      {a.summary && <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 10 }}>{a.summary}</div>}
      <div style={{ fontSize: 12, color: '#bfbfbf' }}>{fmt(a.updateTime)}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa' }}>
      {/* 顶栏(主题色,含搜索回首页入口) */}
      <div style={{ background: theme, color: '#fff', padding: '14px 32px', display: 'flex', alignItems: 'center' }}>
        <div onClick={() => nav(`/wiki-site/${key}`)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginRight: 10, overflow: 'hidden' }}>
            {h.logo ? <img src={h.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Ai'}
          </div>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{h.brandShort || 'aitalky'}</span>
          {h.appName && <span style={{ opacity: 0.7, margin: '0 8px' }}>|</span>}
          {h.appName && <span style={{ opacity: 0.9, fontSize: 15 }}>{h.appName}</span>}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 64px' }}>
        {/* 面包屑 */}
        <div style={{ fontSize: 14, color: '#8c8c8c', margin: '8px 0 20px' }}>
          <span onClick={() => nav(`/wiki-site/${key}`)} style={{ cursor: 'pointer' }}>{h.appName || h.brandShort || t('wiki.home')}</span>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: '#333' }}>{data.name || '-'}</span>
        </div>

        {/* 分类头卡 */}
        <div className="wiki-site-card" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ width: 56, flexShrink: 0, color: '#8c8c8c', display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
            {renderWikiIcon(data.icon, { size: 40 })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{data.name || '-'}</div>
            {data.description && <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>{data.description}</div>}
            <div style={{ fontSize: 13, color: '#bfbfbf' }}>{t('wiki.totalArticles', { count: data.articleCount })}</div>
          </div>
        </div>

        {data.articleCount === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('wiki.categoryEmpty')} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 直接挂分类的文章 */}
            {data.directArticles.map((a, idx) => card(a, idx))}
            {/* 分组 */}
            {data.groups.map((g, gi) => (
              <div key={gi}>
                <div style={{ fontSize: 14, color: '#8c8c8c', fontWeight: 600, margin: '24px 4px 12px' }}>{g.name || '-'}</div>
                {g.articles.map((a, idx) => card(a, idx))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
