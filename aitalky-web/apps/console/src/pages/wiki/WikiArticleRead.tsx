import { useEffect, useMemo, useRef, useState } from 'react'
import { Select, Spin, Empty, theme } from 'antd'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { langLabel } from '../../constants/languages'
import { publicArticle, type WikiArticleDetailVO } from '../../api/wiki'
import { sanitizeHtml } from '../../utils/sanitize'
import { parseToc, scrollToHeading, activeHeadingIdx } from '../../utils/toc'

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
  const [active, setActive] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    publicArticle(shareCode).then((r) => {
      setD(r)
      const first = r.i18ns.find((x) => x.lang === 'zh_CN') || r.i18ns[0]
      if (first) setLang(first.lang)
    }).catch(() => setNotFound(true)).finally(() => setLoading(false))
  }, [shareCode])

  const content = d?.i18ns.find((x) => x.lang === lang)?.pubContent || ''
  const toc = useMemo(() => parseToc(content), [content])
  // 滚动高亮当前章节(页面滚 window;阈值留出顶部品牌条高度)
  useEffect(() => {
    const onScroll = () => setActive(activeHeadingIdx(contentRef.current, 120))
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [toc])

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
      {/* 顶部品牌条(固定) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}`, padding: '14px 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: token.colorPrimary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginRight: 10 }}>Ai</div>
        <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>aitalky</span>
        {langOpts.length > 1 && <Select size="small" value={lang} onChange={setLang} options={langOpts} style={{ width: 130 }} />}
      </div>
      {/* 左目录(固定/可点击/高亮) + 右正文 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', maxWidth: 1080, margin: '0 auto', gap: 44, padding: '40px 24px' }}>
        {toc.length > 0 && (
          <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>{t('wiki.toc')}</div>
            {toc.map((it, idx) => (
              <div key={idx} onClick={() => scrollToHeading(contentRef.current, idx)} className="at-row"
                style={{ cursor: 'pointer', fontSize: 14, padding: '8px 0', paddingLeft: (it.level - 1) * 12, color: idx === active ? token.colorPrimary : token.colorTextSecondary, fontWeight: idx === active ? 600 : 400 }}>{it.text}</div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, background: token.colorBgContainer, padding: '40px 40px', borderRadius: 8 }}>
          <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>{i?.pubTitle || t('wiki.untitled')}</div>
          {i?.pubSummary && <div style={{ fontSize: 16, color: token.colorTextSecondary, marginBottom: 24 }}>{i.pubSummary}</div>}
          <div ref={contentRef} className="wiki-article-html" style={{ fontSize: 15, lineHeight: 1.9, color: token.colorText }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(i?.pubContent) }} />
          <div style={{ marginTop: 48, paddingTop: 16, borderTop: `1px solid ${token.colorSplit}`, textAlign: 'center', fontSize: 13, color: token.colorTextTertiary }}>
            {t('wiki.readFooter')}
          </div>
        </div>
      </div>
    </div>
  )
}
