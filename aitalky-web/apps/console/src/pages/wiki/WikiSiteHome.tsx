import { useEffect, useMemo, useState } from 'react'
import { Select, Spin, Empty } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { langLabel } from '../../constants/languages'
import { renderWikiIcon } from '../../constants/wikiIcons'
import { publicSite, publicSiteSearch, type WikiSitePublicVO, type WikiPublicArticleCard } from '../../api/wiki'

// 对外站点首页(对齐参考 img-50):顶栏(LOGO+品牌|应用名 / 语言)+ 主题色 hero(标题/描述/搜索框)
// + 各分类区块(图标/名称/描述/前若干篇文章 + 共N篇,查看更多)。免登录,按站点 shareCode 访问。
export default function WikiSiteHome() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { key = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [data, setData] = useState<WikiSitePublicVO | null>(null)
  const [lang, setLang] = useState<string>()
  // 搜索
  const [kw, setKw] = useState('')
  const [results, setResults] = useState<WikiPublicArticleCard[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    setLoading(true)
    publicSite(key, lang).then((d) => { setData(d); setLang(d.header.lang) })
      .catch(() => setNotFound(true)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang])

  const theme = data?.header.themeColor || '#2f6bff'
  const langOpts = useMemo(() => (data?.header.langs || []).map((l) => ({ value: l, label: langLabel(l, i18n.language) })), [data, i18n.language])

  const openArticle = (shareCode: string | null) => { if (shareCode) nav(`/wiki-article/${shareCode}`) }
  const openCategory = (id: string) => nav(`/wiki-site/${key}/category/${id}`)
  const doSearch = async () => {
    const q = kw.trim()
    if (!q) { setResults(null); return }
    setSearching(true)
    try { setResults(await publicSiteSearch(key, q, lang)) } catch { /* 拦截器已提示 */ } finally { setSearching(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 120 }}><Spin /></div>
  if (notFound || !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('wiki.siteNotFound')} />
    </div>
  }
  const h = data.header

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa' }}>
      {/* 顶栏 */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,.06)', padding: '14px 32px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: theme, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginRight: 10, overflow: 'hidden' }}>
          {h.logo ? <img src={h.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Ai'}
        </div>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{h.brandShort || 'aitalky'}</span>
        {h.appName && <span style={{ color: '#8c8c8c', fontSize: 15, margin: '0 8px' }}>|</span>}
        {h.appName && <span style={{ color: '#595959', fontSize: 15 }}>{h.appName}</span>}
        <div style={{ flex: 1 }} />
        {langOpts.length > 1 && <Select size="small" value={lang} onChange={setLang} options={langOpts} style={{ width: 130 }} />}
      </div>

      {/* hero(主题色) */}
      <div style={{ background: theme, color: '#fff', padding: '56px 24px 64px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 14 }}>{h.title || h.appName || t('wiki.untitled')}</div>
        {h.description && <div style={{ fontSize: 15, opacity: 0.92, marginBottom: 28, maxWidth: 720, margin: '0 auto 28px' }}>{h.description}</div>}
        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
          <SearchOutlined style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: '#8c8c8c', fontSize: 18 }} />
          <input value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }}
            placeholder={t('wiki.homeSearchPh')}
            style={{ width: '100%', height: 54, borderRadius: 28, border: 'none', outline: 'none', padding: '0 24px 0 52px', fontSize: 15, boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* 内容:搜索结果 或 分类区块 */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 64px' }}>
        {results !== null ? (
          <div>
            <div style={{ fontSize: 15, color: '#8c8c8c', marginBottom: 16 }}>
              {t('wiki.searchResultCount', { count: results.length })}
              <span onClick={() => { setResults(null); setKw('') }} style={{ color: theme, cursor: 'pointer', marginLeft: 12 }}>{t('wiki.backToHome')}</span>
            </div>
            {searching ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              : results.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('wiki.searchEmpty')} />
                : results.map((a, idx) => (
                  <div key={idx} onClick={() => openArticle(a.shareCode)} className="wiki-site-card" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: theme, marginBottom: 6 }}>{a.title || t('wiki.untitled')}</div>
                    {a.summary && <div style={{ fontSize: 14, color: '#8c8c8c' }}>{a.summary}</div>}
                  </div>
                ))}
          </div>
        ) : data.categories.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('wiki.siteEmpty')} />
        ) : (
          data.categories.map((c) => (
            <div key={c.id} className="wiki-site-card" style={{ display: 'flex', gap: 24 }}>
              <div style={{ width: 56, flexShrink: 0, color: '#8c8c8c', display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                {renderWikiIcon(c.icon, { size: 40 })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{c.name || '-'}</div>
                {c.description && <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 14 }}>{c.description}</div>}
                {c.topArticles.map((a, idx) => (
                  <div key={idx} onClick={() => openArticle(a.shareCode)}
                    style={{ fontSize: 15, color: '#333', padding: '7px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} className="wiki-site-link">
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bbb', flexShrink: 0 }} />{a.title || t('wiki.untitled')}
                  </div>
                ))}
                <div onClick={() => openCategory(c.id)} style={{ fontSize: 13, color: '#8c8c8c', marginTop: 12, cursor: 'pointer' }}>
                  {t('wiki.categoryMore', { count: c.articleCount })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
