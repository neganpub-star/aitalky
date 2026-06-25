import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { t } from '../i18n'
import { publicArticle } from '../api'
import type { WikiArticleDetail } from '../types'

interface TocItem { level: number; text: string }
// 从正文 HTML 解析标题(h1/h2/h3)生成目录(过滤空标题,保证下标与正文标题对齐)
function parseToc(html: string): TocItem[] {
  if (!html) return []
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return Array.from(doc.querySelectorAll('h1,h2,h3')).map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: el.textContent?.trim() || '',
    })).filter((x) => x.text)
  } catch { return [] }
}

// 信使端文章阅读 overlay(自包含,免跨 app URL):点推荐文章/文章卡片 → 拉公开文章 → 全屏覆盖渲染。
// 右下悬浮「目录」按钮 → 底部弹层列目录 → 点击滚动到对应章节(对齐参考 H5)。
export default function ArticleView({ shareCode, onClose }: { shareCode: string; onClose: () => void }) {
  const [d, setD] = useState<WikiArticleDetail | null>(null)
  const [lang, setLang] = useState('zh_CN')
  const [err, setErr] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    publicArticle(shareCode).then((r) => {
      setD(r)
      const first = r.i18ns.find((x) => x.lang === 'zh_CN') || r.i18ns[0]
      if (first) setLang(first.lang)
    }).catch(() => setErr(true))
  }, [shareCode])

  const i = d?.i18ns.find((x) => x.lang === lang) || d?.i18ns[0]
  const toc = useMemo(() => parseToc(i?.pubContent || ''), [i?.pubContent])

  // 点击目录项:容器内第 idx 个非空标题滚动到可见,并关闭弹层
  const go = (idx: number) => {
    const root = contentRef.current
    const hs = Array.from(root?.querySelectorAll('h1,h2,h3') || []).filter((h) => h.textContent?.trim())
    ;(hs[idx] as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTocOpen(false)
  }

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
            <div ref={contentRef} className="article-view-content wiki-article-html"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(i?.pubContent || '') }} />
          </>
        )}
      </div>

      {/* 右下悬浮「目录」按钮(仅有标题时出现) */}
      {toc.length > 0 && (
        <button className="article-toc-fab" onClick={() => setTocOpen(true)} aria-label={t('toc')}>
          <span className="article-toc-fab-icon">☰</span>
          <span className="article-toc-fab-text">{t('toc')}</span>
        </button>
      )}

      {/* 底部目录弹层 */}
      {tocOpen && (
        <div className="article-toc-mask" onClick={() => setTocOpen(false)}>
          <div className="article-toc-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="article-toc-sheet-title">{t('toc')}</div>
            <div className="article-toc-sheet-list">
              {toc.map((it, idx) => (
                <div key={idx} className="article-toc-sheet-item" style={{ paddingLeft: 4 + (it.level - 1) * 14 }} onClick={() => go(idx)}>{it.text}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
