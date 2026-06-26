import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Tooltip, Drawer, Avatar, theme, Spin, message } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { getArticle, saveArticleDraft, publishArticle, type WikiArticleDetailVO } from '../../api/wiki'
import { sanitizeHtml } from '../../utils/sanitize'
import { useAppStore } from '../../store/useAppStore'
import { parseToc, scrollToHeading, activeHeadingIdx } from '../../utils/toc'
import RichEditor from './RichEditor'

// 文章支持中英两种语言(对齐参考)
const LANGS = [{ code: 'zh_CN', label: '中文' }, { code: 'en_US', label: '英文' }]

interface LangDraft { title: string; summary: string; content: string }

// 文章编辑器(对齐参考最新版):wiki 布局内,「正在编辑」+ 语言 tab + 目录 + 文章名/描述 + 富文本正文
// (wangEditor:图片/链接/表格 + hoverbar)。保存/发布/实时预览/关闭。
export default function WikiArticleEdit() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const canPublish = hasFunction('wiki.article.publish')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState('zh_CN')
  // 实时预览(右侧 Drawer,渲染当前草稿)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLang, setPreviewLang] = useState('zh_CN')
  const [previewTime, setPreviewTime] = useState('')
  const nickname = useAppStore((s) => s.nickname)
  const avatar = useAppStore((s) => s.avatar)
  const [drafts, setDrafts] = useState<Record<string, LangDraft>>({
    zh_CN: { title: '', summary: '', content: '' },
    en_US: { title: '', summary: '', content: '' },
  })

  useEffect(() => {
    setLoading(true)
    getArticle(id).then((d: WikiArticleDetailVO) => {
      const next: Record<string, LangDraft> = {
        zh_CN: { title: '', summary: '', content: '' },
        en_US: { title: '', summary: '', content: '' },
      }
      d.i18ns.forEach((r) => {
        if (next[r.lang]) next[r.lang] = { title: r.title || '', summary: r.summary || '', content: r.content || '' }
      })
      setDrafts(next)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const cur = drafts[lang]
  const setField = (k: keyof LangDraft, v: string) => setDrafts((p) => ({ ...p, [lang]: { ...p[lang], [k]: v } }))
  const toc = useMemo(() => parseToc(cur.content), [cur.content])
  // 实时预览:滚动容器 + 当前高亮章节(预览内目录固定,正文滚动时高亮跟随)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const [previewActive, setPreviewActive] = useState(0)
  const onPreviewScroll = () => setPreviewActive(activeHeadingIdx(document.getElementById('wiki-preview-html'), 120))

  const saveAll = async () => {
    for (const l of LANGS) {
      const dft = drafts[l.code]
      if (dft.title || dft.summary || dft.content) {
        await saveArticleDraft(id, { lang: l.code, title: dft.title, summary: dft.summary, content: dft.content })
      }
    }
  }
  const onSave = async () => { setSaving(true); try { await saveAll(); message.success(t('profile.saved')) } catch { /* 拦截器已提示 */ } finally { setSaving(false) } }
  // 实时预览:先保存草稿(对齐参考),再右侧滑出预览当前语言草稿
  const onPreview = async () => {
    setSaving(true)
    try {
      await saveAll()
      setPreviewLang(lang)
      setPreviewTime(new Date().toLocaleString())
      setPreviewActive(0)
      setPreviewOpen(true)
    } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const onPublish = async () => {
    setSaving(true)
    try { await saveAll(); await publishArticle(id); message.success(t('wiki.published')); nav(`/wiki/articles/${id}`) }
    catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 120 }}><Spin /></div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: token.colorBgContainer }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: `1px solid ${token.colorSplit}` }}>
        <div style={{ fontWeight: 600, fontSize: 16, borderBottom: `2px solid ${token.colorPrimary}`, paddingBottom: 12, marginBottom: -13 }}>{t('wiki.editing')}</div>
        <div style={{ flex: 1 }} />
        <span style={{ color: token.colorError, fontSize: 13, marginRight: 16 }}>{t('wiki.autoSaveNote')}</span>
        <Tooltip title={t('wiki.preview')}><Button icon={<PlayCircleOutlined />} onClick={onPreview} style={{ marginRight: 8 }} /></Tooltip>
        <Button onClick={() => nav(`/wiki/articles/${id}`)} style={{ marginRight: 8 }}>{t('common.close')}</Button>
        <Button type="primary" loading={saving} onClick={onSave} style={{ marginRight: 8 }}>{t('common.save')}</Button>
        {canPublish && <Button loading={saving} onClick={onPublish} style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}>{t('wiki.publish')}</Button>}
      </div>

      {/* 语言 tab */}
      <div style={{ padding: '12px 24px 0' }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 3 }}>
          {LANGS.map((l) => (
            <div key={l.code} onClick={() => setLang(l.code)}
              style={{ padding: '4px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 14, background: lang === l.code ? token.colorPrimaryBg : 'transparent', color: lang === l.code ? token.colorPrimary : token.colorText }}>{l.label}</div>
          ))}
        </div>
      </div>

      {/* 正文区:左目录 + 右编辑 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${token.colorSplit}`, padding: '20px 24px', overflow: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{t('wiki.toc')}</div>
          {toc.length === 0
            ? <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>{t('wiki.tocEmpty')}</div>
            : toc.map((it, idx) => <div key={idx} onClick={() => scrollToHeading(document.querySelector('.wiki-rich-editor [data-slate-editor]'), idx)}
                style={{ fontSize: 15, fontWeight: 500, color: token.colorText, padding: '7px 0', paddingLeft: (it.level - 1) * 12, cursor: 'pointer' }}
                className="at-row">{it.text}</div>)}
        </div>

        {/* 右侧:标题/描述固定顶部,正文独立滚动;配色跟随主题 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: token.colorBgContainer }}>
          <div style={{ flexShrink: 0, padding: '24px 48px 0' }}>
            <Input variant="borderless" value={cur.title} onChange={(e) => setField('title', e.target.value)}
              placeholder={t('wiki.articleName')} style={{ fontSize: 30, fontWeight: 700, padding: 0, marginBottom: 8, color: token.colorText }} />
            <Input variant="borderless" value={cur.summary} onChange={(e) => setField('summary', e.target.value)}
              placeholder={t('wiki.articleDesc')} style={{ fontSize: 16, color: token.colorTextSecondary, padding: 0, marginBottom: 4 }} />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 48px 24px' }}>
            {/* 富文本正文(key=lang:语言切换重挂载注入对应内容) */}
            <RichEditor key={lang} value={cur.content} onChange={(v) => setField('content', v)} placeholder={t('wiki.articleBodyPh')} />
          </div>
        </div>
      </div>

      {/* 实时预览 Drawer(右侧滑出,渲染当前草稿;对齐参考) */}
      <Drawer open={previewOpen} onClose={() => setPreviewOpen(false)} width="58%" closable={false} styles={{ body: { padding: 0 } }}>
        {(() => {
          const p = drafts[previewLang] || { title: '', summary: '', content: '' }
          const ptoc = parseToc(p.content)
          return (
            <div ref={previewScrollRef} onScroll={onPreviewScroll} style={{ height: '100%', overflow: 'auto', background: token.colorBgContainer }}>
              {/* 顶部品牌 + 语言切换(固定在预览顶部) */}
              <div style={{ position: 'sticky', top: 0, zIndex: 3, display: 'flex', alignItems: 'center', padding: '18px 28px', borderBottom: `1px solid ${token.colorSplit}`, background: token.colorBgContainer }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: token.colorPrimary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginRight: 10 }}>Ai</div>
                <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>aitalky</span>
                <div style={{ display: 'inline-flex', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 3 }}>
                  {LANGS.map((l) => (
                    <div key={l.code} onClick={() => setPreviewLang(l.code)} style={{ padding: '2px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: previewLang === l.code ? token.colorPrimaryBg : 'transparent', color: previewLang === l.code ? token.colorPrimary : token.colorText }}>{l.label}</div>
                  ))}
                </div>
              </div>
              {/* 正文区:左目录(固定) + 右正文(滚动)(对齐参考实时预览的两栏布局) */}
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '32px 36px', gap: 28 }}>
                {/* 左目录:sticky 固定在品牌条下方,正文滚动时不动并高亮当前章节 */}
                <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${token.colorSplit}`, paddingRight: 20, position: 'sticky', top: 92, alignSelf: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{t('wiki.toc')}</div>
                  {ptoc.length === 0
                    ? <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>{t('wiki.tocEmpty')}</div>
                    : ptoc.map((it, idx) => <div key={idx} onClick={() => scrollToHeading(document.getElementById('wiki-preview-html'), idx)}
                        style={{ fontSize: 14, color: idx === previewActive ? token.colorPrimary : token.colorTextSecondary, fontWeight: idx === previewActive ? 600 : 400, padding: '6px 0', paddingLeft: (it.level - 1) * 12, cursor: 'pointer' }}
                        className="at-row">{it.text}</div>)}
                </div>
                {/* 右正文 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>{p.title || t('wiki.untitled')}</div>
                  {p.summary && <div style={{ fontSize: 15, color: token.colorTextSecondary, marginBottom: 18 }}>{p.summary}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <Avatar size={32} src={avatar || undefined} style={{ background: token.colorPrimary }}>{(nickname || 'U').charAt(0).toUpperCase()}</Avatar>
                    <div style={{ lineHeight: 1.3 }}>
                      <div style={{ fontSize: 14 }}>{nickname || '-'}</div>
                      <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{previewTime}</div>
                    </div>
                  </div>
                  {p.content
                    ? <div id="wiki-preview-html" className="wiki-article-html" style={{ fontSize: 15, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.content) }} />
                    : <div style={{ color: token.colorTextTertiary }}>{t('wiki.noContent')}</div>}
                  <div style={{ marginTop: 48, padding: '14px', background: token.colorFillQuaternary, borderRadius: 8, textAlign: 'center', fontSize: 13, color: token.colorTextTertiary }}>
                    {t('wiki.readFooter')}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </Drawer>
    </div>
  )
}
