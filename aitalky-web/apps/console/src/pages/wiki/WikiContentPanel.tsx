import { useEffect, useState } from 'react'
import { Button, Input, Drawer, Popover, Modal, message, theme } from 'antd'
import { HolderOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { langLabel } from '../../constants/languages'
import { WIKI_ICONS, DEFAULT_WIKI_ICON, renderWikiIcon } from '../../constants/wikiIcons'
import {
  listCategories, createCategory, updateCategory, deleteCategory, sortCategories,
  type CategoryVO, type WikiI18nText,
} from '../../api/wiki'

// 内容配置面板(嵌入站点编辑手风琴第3面板,img_13/14):语言 tab + 类别列表(拖拽排序)+ 新增类别。
export default function WikiContentPanel({ siteId, langs }: { siteId: string; langs: string[] }) {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const [lang, setLang] = useState(langs[0] || 'zh_CN')
  const [cats, setCats] = useState<CategoryVO[]>([])
  const [editing, setEditing] = useState<CategoryVO | null | undefined>(undefined) // undefined=关闭 null=新增
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const load = () => { listCategories(siteId, lang).then(setCats).catch(() => {}) }
  useEffect(load, [siteId, lang])

  const onDrop = async (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return }
    const next = [...cats]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(toIdx, 0, moved)
    setCats(next); setDragIdx(null)
    await sortCategories(siteId, next.map((c) => c.id)).catch(() => load())
  }

  const doDelete = (c: CategoryVO) => {
    Modal.confirm({
      title: t('wiki.deleteCategoryConfirm'), okType: 'danger', okText: t('common.delete'), cancelText: t('common.cancel'),
      onOk: async () => { await deleteCategory(c.id); message.success(t('common.deleted')); load() },
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        {langs.length > 1 && (
          <div style={{ display: 'inline-flex', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 3 }}>
            {langs.map((l) => (
              <div key={l} onClick={() => setLang(l)} style={{ padding: '2px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: lang === l ? token.colorPrimaryBg : 'transparent', color: lang === l ? token.colorPrimary : token.colorText }}>{langLabel(l, i18n.language)}</div>
            ))}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>{t('wiki.createCategory')}</Button>
      </div>

      {/* 类别表头 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px 10px', color: token.colorTextTertiary, fontSize: 13 }}>
        <span style={{ width: 24 }} />
        <span style={{ flex: 1 }}>{t('wiki.category')}</span>
        <span style={{ width: 80 }}>{t('wiki.articleCol')}</span>
        <span style={{ width: 120, textAlign: 'right' }}>{t('common.action')}</span>
      </div>
      {cats.length === 0 ? <div style={{ color: token.colorTextTertiary, fontSize: 13, padding: 12 }}>{t('wiki.noCategory')}</div> : cats.map((c, idx) => (
        <div key={c.id} draggable onDragStart={() => setDragIdx(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(idx)}
          style={{ display: 'flex', alignItems: 'center', padding: '12px', borderTop: `1px solid ${token.colorSplit}`, background: dragIdx === idx ? token.colorFillQuaternary : 'transparent' }}>
          <HolderOutlined style={{ width: 24, cursor: 'grab', color: token.colorTextQuaternary }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {renderWikiIcon(c.icon, { size: 22 })}
            <div style={{ minWidth: 0 }}>
              <a onClick={() => nav(`/wiki/categories/${c.id}?lang=${lang}`)} style={{ color: token.colorText, fontWeight: 600 }}>{c.name || t('wiki.untitled')}</a>
              <div style={{ fontSize: 12, color: token.colorTextTertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 520 }}>{c.description || ''}</div>
            </div>
          </div>
          <span style={{ width: 80 }}>{c.articleCount}</span>
          <span style={{ width: 120, textAlign: 'right' }}>
            <a onClick={() => setEditing(c)} style={{ marginRight: 12 }}>{t('common.edit')}</a>
            <a style={{ color: token.colorError }} onClick={() => doDelete(c)}>{t('common.delete')}</a>
          </span>
        </div>
      ))}

      <CategoryEditDrawer siteId={siteId} langs={langs} editing={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load() }} />
    </div>
  )
}

// 新增/编辑类别抽屉(img_14):图标 + 各语言 名称/描述
function CategoryEditDrawer({ siteId, langs, editing, onClose, onSaved }: {
  siteId: string; langs: string[]; editing: CategoryVO | null | undefined; onClose: () => void; onSaved: () => void
}) {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const open = editing !== undefined
  const [icon, setIcon] = useState(DEFAULT_WIKI_ICON)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [texts, setTexts] = useState<Record<string, { name: string; description: string }>>({})
  const [saving, setSaving] = useState(false)
  const defLang = langs[0] || 'zh_CN'

  useEffect(() => {
    if (!open) return
    const init: Record<string, { name: string; description: string }> = {}
    langs.forEach((l) => { init[l] = { name: '', description: '' } })
    if (editing) {
      setIcon(editing.icon || DEFAULT_WIKI_ICON)
      editing.i18ns.forEach((x) => { if (init[x.lang]) init[x.lang] = { name: x.name || '', description: x.description || '' } })
    } else {
      setIcon(DEFAULT_WIKI_ICON)
    }
    setTexts(init)
  }, [open, editing])

  const set = (lang: string, k: 'name' | 'description', v: string) => setTexts((p) => ({ ...p, [lang]: { ...p[lang], [k]: v } }))

  const save = async () => {
    if (!texts[defLang]?.name?.trim()) { message.warning(t('wiki.categoryNameRequired')); return }
    const i18ns: WikiI18nText[] = langs.map((l) => ({ lang: l, name: texts[l]?.name || '', description: texts[l]?.description || '' }))
    setSaving(true)
    try {
      if (editing) await updateCategory(editing.id, { icon, i18ns })
      else await createCategory(siteId, { icon, i18ns })
      message.success(t('profile.saved')); onSaved()
    } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }

  const iconPicker = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, width: 280 }}>
      {WIKI_ICONS.map((ic) => (
        <div key={ic.key} onClick={() => { setIcon(ic.key); setIconPickerOpen(false) }}
          style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${icon === ic.key ? token.colorPrimary : token.colorBorderSecondary}`, background: icon === ic.key ? token.colorPrimaryBg : 'transparent' }}>{renderWikiIcon(ic.key, { size: 22 })}</div>
      ))}
    </div>
  )
  const defaultTag = <span style={{ fontSize: 11, color: token.colorPrimary, background: token.colorPrimaryBg, borderRadius: 4, padding: '0 6px', marginLeft: 6 }}>{t('wiki.langDefault')}</span>

  return (
    <Drawer title={editing ? t('wiki.editCategory') : t('wiki.createCategory')} width={560} open={open} onClose={onClose}
      footer={<div style={{ textAlign: 'right' }}><Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button></div>}>
      {langs.length > 1 && (
        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#874d00', marginBottom: 20 }}>
          {t('wiki.categoryMultiLangTip')}
        </div>
      )}
      <div style={{ fontSize: 14, marginBottom: 8 }}>{t('wiki.categoryIcon')}</div>
      <Popover content={iconPicker} trigger="click" open={iconPickerOpen} onOpenChange={setIconPickerOpen} placement="bottomLeft">
        <div style={{ width: 56, height: 56, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${token.colorBorder}`, cursor: 'pointer' }}>{renderWikiIcon(icon, { size: 30 })}</div>
      </Popover>

      <div style={{ fontSize: 14, margin: '20px 0 8px' }}>{t('wiki.categoryName')}</div>
      {langs.map((l) => (
        <div key={l} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 6 }}>{langLabel(l, i18n.language)}{l === defLang && defaultTag}</div>
          <Input value={texts[l]?.name || ''} onChange={(e) => set(l, 'name', e.target.value)} maxLength={30} placeholder={t('wiki.categoryNamePh')} />
        </div>
      ))}

      <div style={{ fontSize: 14, margin: '20px 0 8px' }}>{t('wiki.categoryDesc')}</div>
      {langs.map((l) => (
        <div key={l} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 6 }}>{langLabel(l, i18n.language)}{l === defLang && defaultTag}</div>
          <Input.TextArea value={texts[l]?.description || ''} onChange={(e) => set(l, 'description', e.target.value)} maxLength={100} rows={3} placeholder={t('wiki.categoryDescPh')} />
        </div>
      ))}
    </Drawer>
  )
}
