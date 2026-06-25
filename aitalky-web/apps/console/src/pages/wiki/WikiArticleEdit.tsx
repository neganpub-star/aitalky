import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Upload, Tooltip, theme, Spin, message } from 'antd'
import { PlayCircleOutlined, PictureOutlined, LinkOutlined, TableOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { uploadFile } from '../../api/file'
import { getArticle, saveArticleDraft, publishArticle, type WikiArticleDetailVO } from '../../api/wiki'

// 文章支持中英两种语言(对齐参考)
const LANGS = [{ code: 'zh_CN', label: '中文' }, { code: 'en_US', label: '英文' }]

interface LangDraft { title: string; summary: string; content: string }

// 文章编辑器(对齐参考最新版 img_1):wiki 布局内(保留侧栏),「正在编辑」+ 语言 tab +
// 目录 + 文章名/描述/正文,底部插入工具条(图片/链接/表格)。保存/发布/实时预览/关闭。
export default function WikiArticleEdit() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const canPublish = hasFunction('wiki.article.publish')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

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

  // 在正文光标处插入文本
  const insertAtCursor = (text: string) => {
    const ta = bodyRef.current
    const content = cur.content
    const pos = ta ? ta.selectionStart : content.length
    setField('content', content.slice(0, pos) + text + content.slice(pos))
  }

  const toc = useMemo(() => (cur.content || '').split('\n')
    .map((l) => l.match(/^(#{1,3})\s+(.+)/)).filter(Boolean)
    .map((m) => ({ level: m![1].length, text: m![2].trim() })), [cur.content])

  const saveAll = async () => {
    for (const l of LANGS) {
      const dft = drafts[l.code]
      if (dft.title || dft.summary || dft.content) {
        await saveArticleDraft(id, { lang: l.code, title: dft.title, summary: dft.summary, content: dft.content })
      }
    }
  }
  const onSave = async () => { setSaving(true); try { await saveAll(); message.success(t('profile.saved')) } catch { /* 拦截器已提示 */ } finally { setSaving(false) } }
  const onPreview = async () => { setSaving(true); try { await saveAll(); message.info(t('wiki.previewWip')) } catch { /* 拦截器已提示 */ } finally { setSaving(false) } }
  const onPublish = async () => {
    setSaving(true)
    try { await saveAll(); await publishArticle(id); message.success(t('wiki.published')); nav(`/wiki/articles/${id}`) }
    catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const onInsertImage = async (file: File) => {
    try { const url = await uploadFile(file); insertAtCursor(`\n![](${url})\n`) } catch { /* 拦截器已提示 */ }
    return false
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
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${token.colorSplit}`, padding: '20px 24px', overflow: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{t('wiki.toc')}</div>
          {toc.length === 0
            ? <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>{t('wiki.tocEmpty')}</div>
            : toc.map((it, idx) => <div key={idx} style={{ fontSize: 13, color: token.colorTextSecondary, padding: '4px 0', paddingLeft: (it.level - 1) * 12 }}>{it.text}</div>)}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 48px 100px', maxWidth: 920 }}>
          <Input variant="borderless" value={cur.title} onChange={(e) => setField('title', e.target.value)}
            placeholder={t('wiki.articleName')} style={{ fontSize: 30, fontWeight: 700, padding: 0, marginBottom: 8 }} />
          <Input variant="borderless" value={cur.summary} onChange={(e) => setField('summary', e.target.value)}
            placeholder={t('wiki.articleDesc')} style={{ fontSize: 16, color: token.colorTextSecondary, padding: 0, marginBottom: 16 }} />
          <Input.TextArea ref={bodyRef} variant="borderless" value={cur.content} onChange={(e) => setField('content', e.target.value)}
            placeholder={t('wiki.articleBodyPh')} autoSize={{ minRows: 16 }} style={{ fontSize: 15, padding: 0, lineHeight: 1.9 }} />
        </div>

        {/* 底部插入工具条(对齐参考 img_1) */}
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 4, padding: '8px 14px', borderRadius: 10,
          background: token.colorBgElevated, boxShadow: token.boxShadowSecondary, border: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <Upload showUploadList={false} accept=".png,.jpg,.jpeg,.gif" beforeUpload={onInsertImage}>
            <Tooltip title={t('wiki.insertImage')}><Button type="text" icon={<PictureOutlined />} /></Tooltip>
          </Upload>
          <Tooltip title={t('wiki.insertLink')}><Button type="text" icon={<LinkOutlined />} onClick={() => insertAtCursor('[文本](https://)')} /></Tooltip>
          <Tooltip title={t('wiki.insertTable')}><Button type="text" icon={<TableOutlined />} onClick={() => insertAtCursor('\n| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |\n')} /></Tooltip>
        </div>
      </div>
    </div>
  )
}
