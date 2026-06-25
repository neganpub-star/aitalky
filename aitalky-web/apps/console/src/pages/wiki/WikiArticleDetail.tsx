import { useEffect, useState } from 'react'
import { Button, Select, Avatar, Drawer, Modal, Tag, message, theme, Spin } from 'antd'
import { LeftOutlined, HistoryOutlined, EditOutlined, ShareAltOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { langLabel } from '../../constants/languages'
import {
  getArticle, articleHistory, articleHistorySnapshot,
  type WikiArticleDetailVO, type WikiArticleHistoryVO,
} from '../../api/wiki'

const ACTION_KEY: Record<number, string> = { 1: 'wiki.actCreate', 2: 'wiki.actEdit', 3: 'wiki.actPublish', 4: 'wiki.actUnpublish' }

// 文章详情(对齐参考 img-06):状态徽标 + 语言切换 + 渲染正文 + 历史记录 + 外链。
export default function WikiArticleDetail() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const canEdit = hasFunction('wiki.article.edit')

  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<WikiArticleDetailVO | null>(null)
  const [lang, setLang] = useState('zh_CN')
  const [histOpen, setHistOpen] = useState(false)
  const [hist, setHist] = useState<WikiArticleHistoryVO[]>([])

  useEffect(() => {
    setLoading(true)
    getArticle(id).then((r) => {
      setD(r)
      const first = r.i18ns.find((x) => x.lang === 'zh_CN') || r.i18ns[0]
      if (first) setLang(first.lang)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const openHistory = () => { setHistOpen(true); articleHistory(id).then(setHist).catch(() => {}) }
  const viewSnapshot = async (h: WikiArticleHistoryVO) => {
    const json = await articleHistorySnapshot(h.id)
    let txt = json
    try {
      const obj = JSON.parse(json)
      const m = obj[lang] || Object.values(obj)[0]
      txt = m ? `# ${m.title || ''}\n${m.summary || ''}\n\n${m.content || ''}` : json
    } catch { /* 原样展示 */ }
    Modal.info({ title: t('wiki.historyPreview'), width: 680, content: <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 480, overflow: 'auto' }}>{txt}</pre> })
  }

  if (loading || !d) return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>

  const i = d.i18ns.find((x) => x.lang === lang)
  const langOpts = d.i18ns.length
    ? d.i18ns.map((x) => ({ value: x.lang, label: langLabel(x.lang, i18n.language) }))
    : [{ value: 'zh_CN', label: langLabel('zh_CN', i18n.language) }]

  const statusTag = d.status === 2
    ? <Tag color="success">{t('wiki.stPublished')}</Tag>
    : d.status === 3 ? <Tag color="warning">{t('wiki.stChanged')}</Tag>
      : <Tag>{t('wiki.stUnpublished')}</Tag>

  const copyShare = () => {
    if (!d.shareCode) { message.warning(t('wiki.shareNeedPublish')); return }
    navigator.clipboard?.writeText(`${location.origin}/wiki-article/${d.shareCode}`).catch(() => {})
    message.success(t('wiki.shareCopied'))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}` }}>
        <LeftOutlined style={{ fontSize: 16, cursor: 'pointer', marginRight: 12 }} onClick={() => nav('/wiki/articles')} />
        {statusTag}
        <Select size="small" value={lang} onChange={setLang} options={langOpts} style={{ width: 140, marginLeft: 8 }} />
        <div style={{ flex: 1 }} />
        {d.shareCode && <Button icon={<ShareAltOutlined />} onClick={copyShare} style={{ marginRight: 8 }}>{t('wiki.copyShare')}</Button>}
        <Button icon={<HistoryOutlined />} onClick={openHistory} style={{ marginRight: 8 }}>{t('wiki.history')}</Button>
        {canEdit && <Button type="primary" icon={<EditOutlined />} onClick={() => nav(`/wiki/articles/${id}/edit`)}>{t('common.edit')}</Button>}
      </div>

      <div style={{ padding: '32px 48px', maxWidth: 920 }}>
        <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>{i?.title || t('wiki.untitled')}</div>
        {i?.summary && <div style={{ fontSize: 16, color: token.colorTextSecondary, marginBottom: 20 }}>{i.summary}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <Avatar size={32} src={d.editorAvatar || undefined} style={{ background: token.colorPrimary }}>
            {(d.editorName || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 14 }}>{d.editorName || '-'}</div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{d.updateTime ? d.updateTime.replace('T', ' ').slice(0, 19) : ''}</div>
          </div>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{i?.content || ''}</div>
      </div>

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
    </div>
  )
}
