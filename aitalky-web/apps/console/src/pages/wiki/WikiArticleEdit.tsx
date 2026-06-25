import { useEffect, useMemo, useState } from 'react'
import { Button, Input, theme, Spin, message } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { getArticle, saveArticleDraft, publishArticle, type WikiArticleDetailVO } from '../../api/wiki'

// 文章支持中英两种语言(对齐参考)
const LANGS = [{ code: 'zh_CN', label: '中文' }, { code: 'en_US', label: '英文' }]

interface LangDraft { title: string; summary: string; content: string }

// 文章全屏编辑器(对齐参考 img-05):语言 tab + 文章名/描述/正文,保存/发布/实时预览/关闭。
export default function WikiArticleEdit() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const canPublish = hasFunction('wiki.article.publish')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState('zh_CN')
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

  // 目录:从正文 markdown 标题(# / ## / ###)提取
  const toc = useMemo(() => {
    return (cur.content || '').split('\n')
      .map((l) => l.match(/^(#{1,3})\s+(.+)/))
      .filter(Boolean)
      .map((m) => ({ level: m![1].length, text: m![2].trim() }))
  }, [cur.content])

  // 保存所有有内容的语言草稿
  const saveAll = async () => {
    for (const l of LANGS) {
      const d = drafts[l.code]
      if (d.title || d.summary || d.content) {
        await saveArticleDraft(id, { lang: l.code, title: d.title, summary: d.summary, content: d.content })
      }
    }
  }

  const onSave = async () => {
    setSaving(true)
    try { await saveAll(); message.success(t('profile.saved')) } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const onPreview = async () => {
    setSaving(true)
    try { await saveAll(); message.info(t('wiki.previewWip')) } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const onPublish = async () => {
    setSaving(true)
    try {
      await saveAll()
      await publishArticle(id)
      message.success(t('wiki.published'))
      nav(`/wiki/articles/${id}`)
    } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 120 }}><Spin /></div>

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: token.colorBgContainer }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: `1px solid ${token.colorSplit}` }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{t('wiki.editing')}</div>
        <div style={{ flex: 1 }} />
        <span style={{ color: token.colorError, fontSize: 13, marginRight: 16 }}>{t('wiki.autoSaveNote')}</span>
        <Button icon={<PlayCircleOutlined />} onClick={onPreview} style={{ marginRight: 8 }}>{t('wiki.preview')}</Button>
        <Button onClick={() => nav(`/wiki/articles/${id}`)} style={{ marginRight: 8 }}>{t('common.close')}</Button>
        <Button type="primary" loading={saving} onClick={onSave} style={{ marginRight: 8 }}>{t('common.save')}</Button>
        {canPublish && <Button loading={saving} onClick={onPublish} style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}>{t('wiki.publish')}</Button>}
      </div>

      {/* 语言 tab */}
      <div style={{ padding: '12px 24px 0' }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 3 }}>
          {LANGS.map((l) => (
            <div key={l.code} onClick={() => setLang(l.code)}
              style={{
                padding: '4px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
                background: lang === l.code ? token.colorPrimaryBg : 'transparent',
                color: lang === l.code ? token.colorPrimary : token.colorText,
              }}>{l.label}</div>
          ))}
        </div>
      </div>

      {/* 正文区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${token.colorSplit}`, padding: '20px 24px', overflow: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{t('wiki.toc')}</div>
          {toc.length === 0
            ? <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>{t('wiki.tocEmpty')}</div>
            : toc.map((it, i) => (
              <div key={i} style={{ fontSize: 13, color: token.colorTextSecondary, padding: '4px 0', paddingLeft: (it.level - 1) * 12 }}>{it.text}</div>
            ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 48px', maxWidth: 920 }}>
          <Input variant="borderless" value={cur.title} onChange={(e) => setField('title', e.target.value)}
            placeholder={t('wiki.articleName')} style={{ fontSize: 30, fontWeight: 700, padding: 0, marginBottom: 8 }} />
          <Input variant="borderless" value={cur.summary} onChange={(e) => setField('summary', e.target.value)}
            placeholder={t('wiki.articleDesc')} style={{ fontSize: 16, color: token.colorTextSecondary, padding: 0, marginBottom: 16 }} />
          <Input.TextArea variant="borderless" value={cur.content} onChange={(e) => setField('content', e.target.value)}
            placeholder={t('wiki.articleBodyPh')} autoSize={{ minRows: 16 }} style={{ fontSize: 15, padding: 0, lineHeight: 1.9 }} />
        </div>
      </div>
    </div>
  )
}
