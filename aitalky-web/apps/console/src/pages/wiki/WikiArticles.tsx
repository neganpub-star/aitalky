import { useEffect, useMemo, useState } from 'react'
import { Button, Table, Select, Avatar, Dropdown, Drawer, Checkbox, Input, Modal, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { allLanguages, langLabel } from '../../constants/languages'
import {
  listArticles, createArticle, publishArticle, unpublishArticle, recommendArticle, deleteArticle,
  type WikiArticleRowVO,
} from '../../api/wiki'

// 文章列表(对齐参考最新版):搜索 + 全部/已发布/未发布 + 文章语言 + 是否推荐;列含关联应用;
// 行操作 编辑/发布·取消发布/删除 + ⋮(文章设置)。文章设置=右侧抽屉(文章推荐)。
export default function WikiArticles() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const canCreate = hasFunction('wiki.article.create')
  const canEdit = hasFunction('wiki.article.edit')
  const canPublish = hasFunction('wiki.article.publish')
  const canDelete = hasFunction('wiki.article.delete')
  const canSetting = hasFunction('wiki.article.setting')

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<WikiArticleRowVO[]>([])
  const [statusFilter, setStatusFilter] = useState<number>(0) // 0全部 1未发布 2已发布
  const [langFilter, setLangFilter] = useState<string>('zh_CN')
  const [recFilter, setRecFilter] = useState<number>(-1) // -1全部 1推荐 0不推荐
  const [kw, setKw] = useState('')
  const [setting, setSetting] = useState<WikiArticleRowVO | null>(null) // 文章设置抽屉

  const load = () => {
    setLoading(true)
    listArticles({ status: statusFilter || undefined, lang: langFilter }).then(setRows).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [statusFilter, langFilter])

  // 搜索 + 是否推荐:客户端过滤
  const shown = useMemo(() => rows.filter((r) =>
    (recFilter < 0 || r.isRecommend === recFilter)
    && (!kw.trim() || (r.title || '').toLowerCase().includes(kw.trim().toLowerCase()))
  ), [rows, recFilter, kw])

  const onCreate = async () => {
    const id = await createArticle()
    nav(`/wiki/articles/${id}/edit`)
  }
  const doPublish = async (r: WikiArticleRowVO) => {
    try { await publishArticle(r.id); message.success(t('wiki.published')); load() } catch { /* 拦截器已提示 */ }
  }
  const doUnpublish = (r: WikiArticleRowVO) => {
    Modal.confirm({
      title: t('wiki.unpublishConfirm'), okText: t('common.confirm'), cancelText: t('common.cancel'),
      onOk: async () => { await unpublishArticle(r.id); message.success(t('common.done')); load() },
    })
  }
  const doDelete = (r: WikiArticleRowVO) => {
    Modal.confirm({
      title: t('wiki.deleteArticleConfirm'), okType: 'danger', okText: t('common.delete'), cancelText: t('common.cancel'),
      onOk: async () => { await deleteArticle(r.id); message.success(t('common.deleted')); load() },
    })
  }

  const statusDot = (s: number) => {
    const map: Record<number, { c: string; k: string }> = {
      1: { c: token.colorTextQuaternary, k: 'wiki.stUnpublished' },
      2: { c: '#52c41a', k: 'wiki.stPublished' },
      3: { c: '#fa8c16', k: 'wiki.stChanged' },
    }
    const it = map[s] || map[1]
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: it.c }} />{t(it.k)}
    </span>
  }

  const columns: ColumnsType<WikiArticleRowVO> = [
    { title: t('wiki.articleId'), dataIndex: 'code', width: 170, render: (v: string, r) => <span style={{ color: token.colorTextSecondary }}>{v || r.id}</span> },
    {
      title: t('wiki.articleName'), dataIndex: 'title',
      render: (v: string | null, r) => <a onClick={() => nav(`/wiki/articles/${r.id}`)} style={{ color: token.colorText }}>{v || t('wiki.untitled')}</a>,
    },
    { title: t('wiki.publishStatus'), dataIndex: 'status', width: 120, render: statusDot },
    { title: t('wiki.langCount'), dataIndex: 'langCount', width: 130 },
    // 关联应用:文章被关联到哪些站点;关联在「内容配置」(D)维护,暂显示 --
    { title: t('wiki.relatedApp'), width: 120, render: () => <span style={{ color: token.colorTextTertiary }}>--</span> },
    { title: t('wiki.isRecommend'), dataIndex: 'isRecommend', width: 100, render: (v: number) => v === 1 ? t('common.yes') : t('common.no') },
    {
      title: t('wiki.lastEdit'), width: 190,
      render: (_v, r) => r.editorId ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={28} src={r.editorAvatar || undefined} style={{ background: token.colorPrimary, fontSize: 12 }}>
            {(r.editorName || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 13 }}>{r.editorName || '-'}</div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{r.updateTime ? r.updateTime.replace('T', ' ').slice(0, 16) : ''}</div>
          </div>
        </div>
      ) : '-',
    },
    {
      title: t('common.action'), width: 210, fixed: 'right',
      render: (_v, r) => {
        const published = r.status === 2 || r.status === 3
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
            {canEdit && <a onClick={() => nav(`/wiki/articles/${r.id}/edit`)}>{t('common.edit')}</a>}
            {canPublish && (published
              ? <a onClick={() => doUnpublish(r)}>{t('wiki.unpublish')}</a>
              : <a onClick={() => doPublish(r)}>{t('wiki.publish')}</a>)}
            {canDelete && <a style={{ color: token.colorError }} onClick={() => doDelete(r)}>{t('common.delete')}</a>}
            {canSetting && (
              <Dropdown menu={{ items: [{ key: 'set', label: t('wiki.articleSettings') }], onClick: () => setSetting(r) }}>
                <MoreOutlined style={{ cursor: 'pointer', color: token.colorTextSecondary }} />
              </Dropdown>
            )}
          </div>
        )
      },
    },
  ]

  const segItems = [
    { v: 0, label: t('wiki.fAll') }, { v: 2, label: t('wiki.fPublished') }, { v: 1, label: t('wiki.fUnpublished') },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{t('wiki.articleList')}</div>
        {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>{t('wiki.createArticle')}</Button>}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input allowClear prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />} placeholder={t('wiki.searchPlaceholder')}
          value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 220 }} />
        <div style={{ display: 'inline-flex', background: token.colorFillTertiary, borderRadius: 8, padding: 3 }}>
          {segItems.map((s) => (
            <div key={s.v} onClick={() => setStatusFilter(s.v)}
              style={{
                padding: '4px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
                background: statusFilter === s.v ? token.colorBgContainer : 'transparent',
                fontWeight: statusFilter === s.v ? 600 : 400,
                boxShadow: statusFilter === s.v ? token.boxShadowTertiary : 'none',
              }}>{s.label}</div>
          ))}
        </div>
        <Select value={langFilter} onChange={setLangFilter} style={{ width: 180 }} showSearch optionFilterProp="label"
          options={allLanguages().map((l) => ({ value: l.code, label: `🌐 ${langLabel(l.code, i18n.language)}` }))} />
        <Select value={recFilter} onChange={setRecFilter} style={{ width: 140 }}
          options={[{ value: -1, label: t('wiki.isRecommend') }, { value: 1, label: t('common.yes') }, { value: 0, label: t('common.no') }]} />
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={shown} scroll={{ x: 1100 }}
        pagination={{ pageSize: 10, showTotal: (n) => t('common.totalItems', { n }) }} />

      <ArticleSettingDrawer row={setting} onClose={() => setSetting(null)} onSaved={() => { setSetting(null); load() }} />
    </div>
  )
}

// 文章设置抽屉(对齐参考:文章推荐)
function ArticleSettingDrawer({ row, onClose, onSaved }: {
  row: WikiArticleRowVO | null; onClose: () => void; onSaved: () => void
}) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [rec, setRec] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (row) setRec(row.isRecommend === 1) }, [row])

  const save = async () => {
    if (!row) return
    setSaving(true)
    try { await recommendArticle(row.id, rec ? 1 : 0); message.success(t('profile.saved')); onSaved() }
    catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }

  return (
    <Drawer title={t('wiki.articleSettings')} width={520} open={!!row} onClose={onClose}
      footer={<div style={{ textAlign: 'right' }}><Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button></div>}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('wiki.recommendSection')}</div>
      <Checkbox checked={rec} onChange={(e) => setRec(e.target.checked)}>{t('wiki.setAsRecommend')}</Checkbox>
      <div style={{ marginTop: 12, fontSize: 13, color: token.colorTextTertiary, lineHeight: 1.8 }}>{t('wiki.recommendHint')}</div>
    </Drawer>
  )
}
