import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Drawer, Modal, Checkbox, Empty, message, theme, Spin } from 'antd'
import { LeftOutlined, HolderOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { langLabel } from '../../constants/languages'
import { renderWikiIcon } from '../../constants/wikiIcons'
import {
  categoryDetail, createGroup, deleteGroup, linkableArticles, linkArticles, unlinkArticle, sortArticles,
  createArticle, saveArticleDraft,
  type CategoryDetailVO, type LinkedArticle, type WikiArticleRowVO, type WikiI18nText,
} from '../../api/wiki'

// 类别详情(对齐参考 img_15):头部 + 关联文章/新增分组/新增文章 + 直接挂类别文章 + 各分组(含文章),拖拽排序+删除。
export default function WikiCategoryDetail() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const [sp] = useSearchParams()
  // 内容配置语言(从类别列表带过来);多语言时允许中英切换
  const [lang, setLang] = useState(sp.get('lang') || 'zh_CN')

  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<CategoryDetailVO | null>(null)
  const [linkOpen, setLinkOpen] = useState<{ groupId: string | null } | null>(null)
  const [groupOpen, setGroupOpen] = useState(false)
  const [articleOpen, setArticleOpen] = useState<{ groupId: string | null } | null>(null)

  const load = () => { setLoading(true); categoryDetail(id, lang).then(setD).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(load, [id, lang])

  if (loading || !d) return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>

  const statusDot = (s: number | null) => {
    const map: Record<number, { c: string; k: string }> = {
      1: { c: token.colorTextQuaternary, k: 'wiki.stUnpublished' }, 2: { c: '#52c41a', k: 'wiki.stPublished' }, 3: { c: '#fa8c16', k: 'wiki.stChanged' },
    }
    const it = map[s || 1] || map[1]
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: it.c }} />{t(it.k)}</span>
  }

  const doUnlink = (a: LinkedArticle) => {
    Modal.confirm({
      title: t('wiki.unlinkConfirm'), okText: t('common.confirm'), cancelText: t('common.cancel'),
      onOk: async () => { await unlinkArticle(a.linkId); message.success(t('common.done')); load() },
    })
  }
  const doDeleteGroup = (gid: string) => {
    Modal.confirm({
      title: t('wiki.deleteGroupConfirm'), okType: 'danger', okText: t('common.delete'), cancelText: t('common.cancel'),
      onOk: async () => { await deleteGroup(gid); message.success(t('common.deleted')); load() },
    })
  }

  // 文章行(可拖拽,sortArticles 按 同 groupId 排序)
  const ArticleRows = ({ list, groupId }: { list: LinkedArticle[]; groupId: string | null }) => {
    const [dragIdx, setDragIdx] = useState<number | null>(null)
    const onDrop = async (toIdx: number) => {
      if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return }
      const next = [...list]; const [m] = next.splice(dragIdx, 1); next.splice(toIdx, 0, m); setDragIdx(null)
      await sortArticles(id, next.map((x) => x.linkId), groupId || undefined).catch(() => {})
      load()
    }
    if (list.length === 0) return <div style={{ color: token.colorTextTertiary, fontSize: 13, padding: '10px 12px' }}>{t('wiki.noLinkedArticle')}</div>
    return <>{list.map((a, idx) => (
      <div key={a.linkId} draggable onDragStart={() => setDragIdx(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(idx)}
        style={{ display: 'flex', alignItems: 'center', padding: '12px', borderTop: `1px solid ${token.colorSplit}` }}>
        <HolderOutlined style={{ width: 24, cursor: 'grab', color: token.colorTextQuaternary }} />
        <span style={{ flex: 1 }}>{a.title || t('wiki.untitled')}</span>
        <span style={{ width: 100 }}>{statusDot(a.status)}</span>
        <a style={{ color: token.colorError, width: 60, textAlign: 'right' }} onClick={() => doUnlink(a)}>{t('common.delete')}</a>
      </div>
    ))}</>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}` }}>
        <LeftOutlined style={{ fontSize: 16, cursor: 'pointer', marginRight: 12 }} onClick={() => nav(-1)} />
        <div style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>{t('wiki.categoryDetail')}</div>
        <Button onClick={() => setGroupOpen(true)} style={{ marginRight: 8 }}>+ {t('wiki.createGroup')}</Button>
        <Button type="primary" onClick={() => setArticleOpen({ groupId: null })}>+ {t('wiki.createArticle')}</Button>
      </div>

      <div style={{ padding: 24, maxWidth: 1200 }}>
        {/* 提示:排序跨语言生效 */}
        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#874d00', marginBottom: 16 }}>
          {t('wiki.sortCrossLangTip')}
        </div>

        {/* 类别头部 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, background: token.colorFillTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{renderWikiIcon(d.icon, { size: 30 })}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{d.name || t('wiki.untitled')}</div>
            <div style={{ fontSize: 13, color: token.colorTextTertiary, marginTop: 4 }}>{d.description || ''}</div>
          </div>
          <Button onClick={() => setLinkOpen({ groupId: null })}>{t('wiki.linkArticle')}</Button>
        </div>

        {/* 直接挂类别的文章 */}
        <div style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, marginTop: 16 }}>
          <ArticleRows list={d.directArticles} groupId={null} />
        </div>

        {/* 各分组 */}
        {d.groups.map((g) => (
          <div key={g.id} style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: token.colorFillQuaternary, borderRadius: '10px 10px 0 0' }}>
              <span style={{ fontWeight: 600, flex: 1 }}>{g.name || t('wiki.untitled')}</span>
              <a onClick={() => setArticleOpen({ groupId: g.id })} style={{ marginRight: 12, fontSize: 13 }}>+ {t('wiki.createArticle')}</a>
              <a onClick={() => setLinkOpen({ groupId: g.id })} style={{ marginRight: 12, fontSize: 13 }}>{t('wiki.linkArticle')}</a>
              <a style={{ color: token.colorError, fontSize: 13 }} onClick={() => doDeleteGroup(g.id)}>{t('common.delete')}</a>
            </div>
            <ArticleRows list={g.articles} groupId={g.id} />
          </div>
        ))}
      </div>

      <LinkArticleDrawer categoryId={id} lang={lang} target={linkOpen} onClose={() => setLinkOpen(null)} onSaved={() => { setLinkOpen(null); load() }} />
      <GroupDrawer categoryId={id} langs={d.name ? langCandidates(lang) : ['zh_CN']} open={groupOpen} onClose={() => setGroupOpen(false)} onSaved={() => { setGroupOpen(false); load() }} />
      <ArticleDrawer categoryId={id} target={articleOpen} langs={langCandidates(lang)} onClose={() => setArticleOpen(null)} onSaved={() => { setArticleOpen(null); load() }} />
      {/* 语言切换(右上角小切换;多语言站点才有意义) */}
      <div style={{ position: 'fixed', top: 70, right: 32 }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 3, background: token.colorBgContainer }}>
          {langCandidates(lang).map((l) => (
            <div key={l} onClick={() => setLang(l)} style={{ padding: '2px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: lang === l ? token.colorPrimaryBg : 'transparent', color: lang === l ? token.colorPrimary : token.colorText }}>{langLabel(l, i18n.language)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 语言候选:简单起见返回 中+英(单语站点详情用默认语言渲染也不影响)
function langCandidates(_cur: string): string[] { return ['zh_CN', 'en_US'] }

// 关联文章弹框:从可关联候选里多选
function LinkArticleDrawer({ categoryId, lang, target, onClose, onSaved }: {
  categoryId: string; lang: string; target: { groupId: string | null } | null; onClose: () => void; onSaved: () => void
}) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [list, setList] = useState<WikiArticleRowVO[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [kw, setKw] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!target) return
    setChecked(new Set()); setKw('')
    linkableArticles(categoryId, lang).then(setList).catch(() => {})
  }, [target, categoryId, lang])

  const shown = useMemo(() => list.filter((a) => !kw.trim() || (a.title || '').toLowerCase().includes(kw.trim().toLowerCase())), [list, kw])
  const toggle = (aid: string) => setChecked((p) => { const n = new Set(p); n.has(aid) ? n.delete(aid) : n.add(aid); return n })

  const save = async () => {
    if (checked.size === 0) { message.warning(t('wiki.pickArticle')); return }
    setSaving(true)
    try { await linkArticles(categoryId, { groupId: target?.groupId || null, articleIds: [...checked] }); message.success(t('common.done')); onSaved() }
    catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }

  return (
    <Drawer title={t('wiki.linkArticle')} width={560} open={!!target} onClose={onClose}
      footer={<div style={{ textAlign: 'right' }}><Button type="primary" loading={saving} onClick={save}>{t('common.confirm')}({checked.size})</Button></div>}>
      <Input allowClear prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />} placeholder={t('wiki.searchPlaceholder')} value={kw} onChange={(e) => setKw(e.target.value)} style={{ marginBottom: 16 }} />
      {shown.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('wiki.noLinkable')} /> : shown.map((a) => (
        <div key={a.id} onClick={() => toggle(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', borderBottom: `1px solid ${token.colorSplit}`, cursor: 'pointer' }}>
          <Checkbox checked={checked.has(a.id)} />
          <span style={{ flex: 1 }}>{a.title || t('wiki.untitled')}</span>
          <span style={{ fontSize: 12, color: a.status === 1 ? token.colorTextQuaternary : '#52c41a' }}>{a.status === 1 ? t('wiki.stUnpublished') : t('wiki.stPublished')}</span>
        </div>
      ))}
    </Drawer>
  )
}

// 新增分组抽屉(img_16):各语言分组名
function GroupDrawer({ categoryId, langs, open, onClose, onSaved }: {
  categoryId: string; langs: string[]; open: boolean; onClose: () => void; onSaved: () => void
}) {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const [names, setNames] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const defLang = langs[0] || 'zh_CN'
  useEffect(() => { if (open) setNames({}) }, [open])

  const save = async () => {
    if (!names[defLang]?.trim()) { message.warning(t('wiki.groupNameRequired')); return }
    const i18ns: WikiI18nText[] = langs.map((l) => ({ lang: l, name: names[l] || '' }))
    setSaving(true)
    try { await createGroup(categoryId, { i18ns }); message.success(t('profile.saved')); onSaved() }
    catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const defaultTag = <span style={{ fontSize: 11, color: token.colorPrimary, background: token.colorPrimaryBg, borderRadius: 4, padding: '0 6px', marginLeft: 6 }}>{t('wiki.langDefault')}</span>

  return (
    <Drawer title={t('wiki.createGroup')} width={520} open={open} onClose={onClose}
      footer={<div style={{ textAlign: 'right' }}><Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button></div>}>
      {langs.length > 1 && <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#874d00', marginBottom: 20 }}>{t('wiki.groupMultiLangTip')}</div>}
      {langs.map((l) => (
        <div key={l} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 6 }}>{langLabel(l, i18n.language)}{l === defLang && defaultTag}</div>
          <Input value={names[l] || ''} onChange={(e) => setNames((p) => ({ ...p, [l]: e.target.value }))} maxLength={30} placeholder={t('wiki.groupNamePh')} />
        </div>
      ))}
    </Drawer>
  )
}

// 新增文章抽屉(img_17):在类别/分组里直接建文章(中英 文章名+描述),建好即关联
function ArticleDrawer({ categoryId, target, langs, onClose, onSaved }: {
  categoryId: string; target: { groupId: string | null } | null; langs: string[]; onClose: () => void; onSaved: () => void
}) {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const [texts, setTexts] = useState<Record<string, { name: string; desc: string }>>({})
  const [saving, setSaving] = useState(false)
  const defLang = langs[0] || 'zh_CN'
  useEffect(() => { if (target) setTexts({}) }, [target])

  const set = (l: string, k: 'name' | 'desc', v: string) => setTexts((p) => ({ ...p, [l]: { ...p[l], [k]: v } }))
  const save = async () => {
    if (!texts[defLang]?.name?.trim()) { message.warning(t('wiki.articleNameRequired')); return }
    setSaving(true)
    try {
      // 建空文章 → 各语言写草稿(标题/描述)→ 关联到类别/分组
      const articleId = await createArticle()
      for (const l of langs) {
        const tx = texts[l]
        if (tx?.name || tx?.desc) await saveArticleDraft(articleId, { lang: l, title: tx.name || '', summary: tx.desc || '' })
      }
      await linkArticles(categoryId, { groupId: target?.groupId || null, articleIds: [articleId] })
      message.success(t('profile.saved')); onSaved()
    } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const defaultTag = <span style={{ fontSize: 11, color: token.colorPrimary, background: token.colorPrimaryBg, borderRadius: 4, padding: '0 6px', marginLeft: 6 }}>{t('wiki.langDefault')}</span>

  return (
    <Drawer title={t('wiki.createArticle')} width={560} open={!!target} onClose={onClose}
      footer={<div style={{ textAlign: 'right' }}><Button type="primary" loading={saving} onClick={save}>{t('common.confirm')}</Button></div>}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>{t('wiki.articleName')}</div>
      {langs.map((l) => (
        <div key={l} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 6 }}>{langLabel(l, i18n.language)}{l === defLang && defaultTag}</div>
          <Input value={texts[l]?.name || ''} onChange={(e) => set(l, 'name', e.target.value)} placeholder={t('wiki.articleNamePh')} />
        </div>
      ))}
      <div style={{ fontSize: 14, margin: '20px 0 8px' }}>{t('wiki.articleDesc')}</div>
      {langs.map((l) => (
        <div key={l} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 6 }}>{langLabel(l, i18n.language)}{l === defLang && defaultTag}</div>
          <Input.TextArea value={texts[l]?.desc || ''} onChange={(e) => set(l, 'desc', e.target.value)} rows={2} placeholder={t('wiki.articleDesc')} />
        </div>
      ))}
    </Drawer>
  )
}
