import { useEffect, useState } from 'react'
import { Select, Spin, Empty, theme } from 'antd'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { langLabel } from '../../constants/languages'
import { publicArticle, type WikiArticleDetailVO } from '../../api/wiki'

// 对外文章阅读页(免登录,/wiki-article/:shareCode)。发文章卡片/推荐文章点击打开此页。
// E(完整对外站点)本期未做,此为其最小子集:单篇已发布文章阅读 + 语言切换。
export default function WikiArticleRead() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const { shareCode = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [d, setD] = useState<WikiArticleDetailVO | null>(null)
  const [lang, setLang] = useState('zh_CN')

  useEffect(() => {
    setLoading(true)
    publicArticle(shareCode).then((r) => {
      setD(r)
      const first = r.i18ns.find((x) => x.lang === 'zh_CN') || r.i18ns[0]
      if (first) setLang(first.lang)
    }).catch(() => setNotFound(true)).finally(() => setLoading(false))
  }, [shareCode])

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 120 }}><Spin /></div>
  if (notFound || !d) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('wiki.articleNotFound')} />
    </div>
  }

  const i = d.i18ns.find((x) => x.lang === lang) || d.i18ns[0]
  const langOpts = d.i18ns.map((x) => ({ value: x.lang, label: langLabel(x.lang, i18n.language) }))

  return (
    <div style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      {/* 顶部品牌条 */}
      <div style={{ background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}`, padding: '14px 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: token.colorPrimary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginRight: 10 }}>Ai</div>
        <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>aitalky</span>
        {langOpts.length > 1 && <Select size="small" value={lang} onChange={setLang} options={langOpts} style={{ width: 130 }} />}
      </div>
      {/* 正文 */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px', background: token.colorBgContainer, minHeight: 'calc(100vh - 57px)' }}>
        <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>{i?.pubTitle || t('wiki.untitled')}</div>
        {i?.pubSummary && <div style={{ fontSize: 16, color: token.colorTextSecondary, marginBottom: 24 }}>{i.pubSummary}</div>}
        <div style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap', color: token.colorText }}>{i?.pubContent || ''}</div>
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: `1px solid ${token.colorSplit}`, textAlign: 'center', fontSize: 13, color: token.colorTextTertiary }}>
          {t('wiki.readFooter')}
        </div>
      </div>
    </div>
  )
}
