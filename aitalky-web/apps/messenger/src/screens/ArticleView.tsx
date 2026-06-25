import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { publicArticle } from '../api'
import type { WikiArticleDetail } from '../types'

// 信使端文章阅读 overlay(自包含,免跨 app URL):点推荐文章/文章卡片 → 拉公开文章 → 全屏覆盖渲染。
export default function ArticleView({ shareCode, onClose }: { shareCode: string; onClose: () => void }) {
  const [d, setD] = useState<WikiArticleDetail | null>(null)
  const [lang, setLang] = useState('zh_CN')
  const [err, setErr] = useState(false)

  useEffect(() => {
    publicArticle(shareCode).then((r) => {
      setD(r)
      const first = r.i18ns.find((x) => x.lang === 'zh_CN') || r.i18ns[0]
      if (first) setLang(first.lang)
    }).catch(() => setErr(true))
  }, [shareCode])

  const i = d?.i18ns.find((x) => x.lang === lang) || d?.i18ns[0]

  return (
    <div className="article-view">
      <div className="article-view-head">
        <span className="article-view-back" onClick={onClose}>‹</span>
        <span className="article-view-title">{t('viewArticle')}</span>
        {d && d.i18ns.length > 1 && (
          <select className="article-view-lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            {d.i18ns.map((x) => <option key={x.lang} value={x.lang}>{x.lang === 'zh_CN' ? '中文' : x.lang === 'en_US' ? 'EN' : x.lang}</option>)}
          </select>
        )}
      </div>
      <div className="article-view-body">
        {err ? (
          <div className="article-view-empty">{t('articleNotFound')}</div>
        ) : !d ? (
          <div className="article-view-empty">…</div>
        ) : (
          <>
            <h1 className="article-view-h1">{i?.pubTitle || ''}</h1>
            {i?.pubSummary && <div className="article-view-summary">{i.pubSummary}</div>}
            <div className="article-view-content">{i?.pubContent || ''}</div>
          </>
        )}
      </div>
    </div>
  )
}
