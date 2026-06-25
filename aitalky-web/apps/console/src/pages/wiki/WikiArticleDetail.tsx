import { useEffect, useState } from 'react'
import { Button, Select, Avatar, Drawer, Checkbox, Dropdown, Modal, Empty, message, theme, Spin } from 'antd'
import { MoreOutlined, HistoryOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { langLabel } from '../../constants/languages'
import {
  getArticle, publishArticle, unpublishArticle, recommendArticle, deleteArticle,
  articleHistory, articleHistorySnapshot,
  type WikiArticleDetailVO, type WikiArticleHistoryVO,
} from '../../api/wiki'

const ACTION_KEY: Record<number, string> = { 1: 'wiki.actCreate', 2: 'wiki.actEdit', 3: 'wiki.actPublish', 4: 'wiki.actUnpublish' }

// 文章详情(对齐参考最新版 img_2/img_3):草稿箱/已发布 两个 tab + 右上 ⋯(历史记录/设置/删除) + 编辑/发布·取消发布。
export default function WikiArticleDetail() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const canEdit = hasFunction('wiki.article.edit')
  const canPublish = hasFunction('wiki.article.publish')
  const canDelete = hasFunction('wiki.article.delete')
  const canSetting = hasFunction('wiki.article.setting')

  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<WikiArticleDetailVO | null>(null)
  const [tab, setTab] = useState<'draft' | 'pub'>('draft')
  const [lang, setLang] = useState('zh_CN')
  const [histOpen, setHistOpen] = useState(false)
  const [hist, setHist] = useState<WikiArticleHistoryVO[]>([])
  const [setOpen, setSetOpen] = useState(false)

  const load = () => {
    setLoading(true)
    getArticle(id).then((r) => {
      setD(r)
      const first = r.i18ns.find((x) => x.lang === 'zh_CN') || r.i18ns[0]
      if (first) setLang(first.lang)
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading || !d) return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>

  const published = d.status === 2 || d.status === 3
  const i = d.i18ns.find((x) => x.lang === lang)
  // 草稿箱看草稿字段,已发布看 pub 快照
  const showTitle = tab === 'pub' ? i?.pubTitle : i?.title
  const showSummary = tab === 'pub' ? i?.pubSummary : i?.summary
  const showContent = tab === 'pub' ? i?.pubContent : i?.content
  const hasContent = !!(showTitle || showContent)

  const langOpts = d.i18ns.length
    ? d.i18ns.map((x) => ({ value: x.lang, label: langLabel(x.lang, i18n.language) }))
    : [{ value: 'zh_CN', label: langLabel('zh_CN', i18n.language) }]

  const doPublish = async () => {
    try { await publishArticle(id); message.success(t('wiki.published')); load() } catch { /* 拦截器已提示 */ }
  }
  const doUnpublish = () => {
    Modal.confirm({
      title: t('wiki.unpublishConfirm'), okText: t('common.confirm'), cancelText: t('common.cancel'),
      onOk: async () => { await unpublishArticle(id); message.success(t('common.done')); load() },
    })
  }
  const doDelete = () => {
    Modal.confirm({
      title: t('wiki.deleteArticleConfirm'), okType: 'danger', okText: t('common.delete'), cancelText: t('common.cancel'),
      onOk: async () => { await deleteArticle(id); message.success(t('common.deleted')); nav('/wiki/articles') },
    })
  }
  const openHistory = () => { setHistOpen(true); articleHistory(id).then(setHist).catch(() => {}) }
  const viewSnapshot = async (h: WikiArticleHistoryVO) => {
    const json = await articleHistorySnapshot(h.id)
    let txt = json
    try {
      const obj = JSON.parse(json)
      const m = obj[lang] || Object.values(obj)[0] as { title?: string; summary?: string; content?: string } | undefined
      txt = m ? `# ${m.title || ''}\n${m.summary || ''}\n\n${m.content || ''}` : json
    } catch { /* 原样展示 */ }
    Modal.info({ title: t('wiki.historyPreview'), width: 680, content: <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 480, overflow: 'auto' }}>{txt}</pre> })
  }

  const moreItems = [
    { key: 'hist', icon: <HistoryOutlined />, label: t('wiki.history') },
    canSetting && { key: 'set', icon: <SettingOutlined />, label: t('wiki.articleSettings') },
    canDelete && { key: 'del', icon: <DeleteOutlined />, label: t('common.delete'), danger: true },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: string; danger?: boolean }[]
  const onMore = (key: string) => {
    if (key === 'hist') openHistory()
    else if (key === 'set') setSetOpen(true)
    else if (key === 'del') doDelete()
  }

  return (
    <div>
      {/* 头部:草稿箱/已发布 tab + 语言 + 操作 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}` }}>
        {(['draft', 'pub'] as const).map((tk) => (
          <div key={tk} onClick={() => setTab(tk)} style={{
            padding: '14px 4px', marginRight: 24, cursor: 'pointer', fontSize: 15, fontWeight: tab === tk ? 600 : 400,
            color: tab === tk ? token.colorText : token.colorTextSecondary,
            borderBottom: `2px solid ${tab === tk ? token.colorPrimary : 'transparent'}`,
          }}>{tk === 'draft' ? t('wiki.draftBox') : t('wiki.publishedView')}</div>
        ))}
        <Select size="small" value={lang} onChange={setLang} options={langOpts} style={{ width: 130, marginLeft: 8 }} />
        <div style={{ flex: 1 }} />
        <Dropdown menu={{ items: moreItems, onClick: ({ key }) => onMore(key) }}>
          <Button icon={<MoreOutlined />} style={{ marginRight: 8 }} />
        </Dropdown>
        {canEdit && <Button type="primary" onClick={() => nav(`/wiki/articles/${id}/edit`)} style={{ marginRight: 8 }}>{t('common.edit')}</Button>}
        {canPublish && (published
          ? <Button onClick={doUnpublish}>{t('wiki.unpublish')}</Button>
          : <Button onClick={doPublish} style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}>{t('wiki.publish')}</Button>)}
      </div>

      {/* 正文 */}
      {hasContent ? (
        <div style={{ padding: '32px 48px', maxWidth: 920 }}>
          <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>{showTitle || t('wiki.untitled')}</div>
          {showSummary && <div style={{ fontSize: 16, color: token.colorTextSecondary, marginBottom: 20 }}>{showSummary}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Avatar size={32} src={d.editorAvatar || undefined} style={{ background: token.colorPrimary }}>
              {(d.editorName || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 14 }}>{d.editorName || '-'}</div>
              <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{d.updateTime ? d.updateTime.replace('T', ' ').slice(0, 19) : ''}</div>
            </div>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{showContent || ''}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 120, color: token.colorTextTertiary }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tab === 'pub' ? t('wiki.noPublished') : t('wiki.noContent')} />
        </div>
      )}

      {/* 历史记录抽屉 */}
      <Drawer title={t('wiki.history')} width={420} open={histOpen} onClose={() => setHistOpen(false)}>
        {hist.length === 0 ? <div style={{ color: token.colorTextTertiary }}>{t('common.empty')}</div> : hist.map((h) => (
          <div key={h.id} onClick={() => viewSnapshot(h)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', borderBottom: `1px solid ${token.colorSplit}`, cursor: 'pointer' }}>
            <Avatar size={28} src={h.operatorAvatar || undefined} style={{ background: token.colorPrimary, fontSize: 12 }}>
              {(h.operatorName || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>{t(ACTION_KEY[h.action] || 'wiki.actEdit')}</div>
              <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{h.operatorName || '-'} · {h.createTime ? h.createTime.replace('T', ' ').slice(0, 16) : ''}</div>
            </div>
          </div>
        ))}
      </Drawer>

      {/* 文章设置抽屉(文章推荐) */}
      <ArticleSettingDrawer open={setOpen} article={d} onClose={() => setSetOpen(false)} onSaved={() => { setSetOpen(false); load() }} />
    </div>
  )
}

function ArticleSettingDrawer({ open, article, onClose, onSaved }: {
  open: boolean; article: WikiArticleDetailVO; onClose: () => void; onSaved: () => void
}) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [rec, setRec] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setRec(article.isRecommend === 1) }, [open, article])
  const save = async () => {
    setSaving(true)
    try { await recommendArticle(article.id, rec ? 1 : 0); message.success(t('profile.saved')); onSaved() }
    catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  return (
    <Drawer title={t('wiki.articleSettings')} width={520} open={open} onClose={onClose}
      footer={<div style={{ textAlign: 'right' }}><Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button></div>}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('wiki.recommendSection')}</div>
      <Checkbox checked={rec} onChange={(e) => setRec(e.target.checked)}>{t('wiki.setAsRecommend')}</Checkbox>
      <div style={{ marginTop: 12, fontSize: 13, color: token.colorTextTertiary, lineHeight: 1.8 }}>{t('wiki.recommendHint')}</div>
    </Drawer>
  )
}
