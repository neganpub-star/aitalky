import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Dropdown, Input, InputNumber, Modal, Select, Table, Tooltip, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined, EditOutlined, EllipsisOutlined, SearchOutlined, QuestionCircleOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  addCategory, addQuickReply, deleteCategory, deleteQuickReply, listCategories, listQuickReplies,
  renameCategory, updateQuickReply, updateQuickReplySort,
  type QuickReplyCategoryVO, type QuickReplyVO,
} from '../../api/quickReply'
import { contentToPlaceholder } from '../../utils/quickReply'
import RichReplyEditor from './RichReplyEditor'

// 特殊分类筛选键:全部 / 未分类(其余为真实分类 id)
const ALL = '__all__'
const NONE = '__none__'

function fmtTime(s: string | null): string {
  if (!s) return '--'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '--'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 数据管理 - 快捷回复(对齐参考):左分类侧栏 + 右话术表格 + 新增/编辑弹窗(分类/简称/富文本内容)
export default function QuickReplies() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [cats, setCats] = useState<QuickReplyCategoryVO[]>([])
  const [data, setData] = useState<QuickReplyVO[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCat, setActiveCat] = useState<string>(ALL) // 左侧选中分类
  const [keyword, setKeyword] = useState('')
  const [adding, setAdding] = useState(false) // 添加分类输入态
  const [newCatName, setNewCatName] = useState('')
  const [sortEditing, setSortEditing] = useState<string | null>(null) // 正在内联编辑排序的行id

  // 新增/编辑弹窗
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<QuickReplyVO | null>(null)
  const [formCat, setFormCat] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')

  const loadCats = useCallback(() => listCategories().then(setCats).catch(() => undefined), [])
  const loadList = useCallback(async () => {
    setLoading(true)
    try { setData(await listQuickReplies()) } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadCats(); loadList() }, [loadCats, loadList])

  // 过滤:按选中分类 + 搜索关键词
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return data.filter((r) => {
      if (activeCat === NONE) { if (r.categoryId) return false } else if (activeCat !== ALL) { if (r.categoryId !== activeCat) return false }
      if (kw && !(`${r.title || ''}`.toLowerCase().includes(kw) || r.content.toLowerCase().includes(kw))) return false
      return true
    })
  }, [data, activeCat, keyword])

  // ===== 分类操作 =====
  const submitNewCat = async () => {
    const name = newCatName.trim()
    if (!name) { setAdding(false); return }
    await addCategory(name)
    setNewCatName(''); setAdding(false); loadCats()
  }
  const onRenameCat = (c: QuickReplyCategoryVO) => {
    let val = c.name
    Modal.confirm({
      title: t('qr.rename'), icon: null,
      content: <Input defaultValue={c.name} onChange={(e) => { val = e.target.value }} maxLength={50} />,
      okText: t('common.confirm'), cancelText: t('common.cancel'),
      onOk: async () => { if (val.trim()) { await renameCategory(c.id, val.trim()); loadCats() } },
    })
  }
  const onDeleteCat = (c: QuickReplyCategoryVO) => {
    Modal.confirm({
      title: t('qr.catDelConfirm'), icon: <ExclamationCircleFilled style={{ color: token.colorError }} />,
      okText: t('qr.del'), okButtonProps: { danger: true }, cancelText: t('common.cancel'),
      onOk: async () => { await deleteCategory(c.id); if (activeCat === c.id) setActiveCat(ALL); loadCats(); loadList() },
    })
  }

  // ===== 话术操作 =====
  const openAdd = () => {
    setEditing(null)
    setFormCat(activeCat === NONE || activeCat === ALL ? null : activeCat)
    setFormTitle(''); setFormContent(''); setOpen(true)
  }
  const openEdit = (r: QuickReplyVO) => {
    setEditing(r); setFormCat(r.categoryId); setFormTitle(r.title || ''); setFormContent(r.content); setOpen(true)
  }
  const submitReply = async () => {
    if (!formContent.trim()) { message.warning(t('qr.contentRequired')); return }
    const body = { categoryId: formCat, title: formTitle.trim(), content: formContent }
    if (editing) await updateQuickReply(editing.id, body)
    else await addQuickReply(body)
    message.success(t('profile.saved'))
    setOpen(false); loadList()
  }
  const onDeleteReply = (r: QuickReplyVO) => {
    Modal.confirm({
      title: t('qr.delConfirm'), content: t('qr.delConfirmDesc'),
      icon: <ExclamationCircleFilled style={{ color: token.colorError }} />,
      okText: t('qr.del'), okButtonProps: { danger: true }, cancelText: t('common.cancel'),
      onOk: async () => { await deleteQuickReply(r.id); loadList() },
    })
  }
  const saveSort = async (r: QuickReplyVO, v: number | null) => {
    setSortEditing(null)
    const n = v == null ? 0 : v
    if (n !== (r.sort ?? 0)) { await updateQuickReplySort(r.id, n); loadList() }
  }

  const columns: ColumnsType<QuickReplyVO> = [
    {
      title: <span>{t('qr.sort')} <Tooltip title={t('qr.sortTip')}><QuestionCircleOutlined style={{ color: token.colorTextQuaternary }} /></Tooltip></span>,
      width: 130,
      render: (_, r) => (sortEditing === r.id ? (
        <InputNumber size="small" autoFocus defaultValue={r.sort ?? 0} style={{ width: 70 }}
          onBlur={(e) => saveSort(r, Number((e.target as HTMLInputElement).value))}
          onPressEnter={(e) => saveSort(r, Number((e.target as HTMLInputElement).value))} />
      ) : (
        <span>{r.sort ?? 0} <EditOutlined style={{ color: token.colorPrimary, cursor: 'pointer', marginLeft: 4 }} onClick={() => setSortEditing(r.id)} /></span>
      )),
    },
    { title: t('qr.name'), dataIndex: 'title', width: 160, render: (v: string | null) => v || '--' },
    { title: t('qr.content'), width: 280, ellipsis: true, render: (_, r) => contentToPlaceholder(r.content) },
    { title: t('qr.category'), width: 120, render: (_, r) => r.categoryName || t('qr.catNone') },
    {
      title: t('qr.editor'), width: 140,
      render: (_, r) => (r.editorName ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Avatar size={20} style={{ background: token.colorPrimary, fontSize: 11 }}>{r.editorName.charAt(0).toUpperCase()}</Avatar>
          {r.editorName}
        </span>
      ) : '--'),
    },
    { title: t('qr.editTime'), width: 160, render: (_, r) => fmtTime(r.updateTime) },
    {
      title: t('qr.action'), width: 110,
      render: (_, r) => (
        <>
          <a onClick={() => openEdit(r)}>{t('qr.edit2')}</a>
          <a style={{ marginLeft: 12, color: token.colorError }} onClick={() => onDeleteReply(r)}>{t('qr.del')}</a>
        </>
      ),
    },
  ]

  const catRow = (key: string, label: string, c?: QuickReplyCategoryVO) => {
    const on = activeCat === key
    return (
      <div key={key} onClick={() => setActiveCat(key)}
        style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', margin: '2px 0', borderRadius: 8, cursor: 'pointer',
          background: on ? token.colorPrimaryBg : 'transparent', color: on ? token.colorPrimary : token.colorText, fontWeight: on ? 600 : 400 }}>
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        {c && (
          <Dropdown trigger={['click']} menu={{ items: [
            { key: 'rename', label: t('qr.rename'), onClick: () => onRenameCat(c) },
            { key: 'delete', label: t('qr.del'), danger: true, onClick: () => onDeleteCat(c) },
          ] }}>
            <EllipsisOutlined onClick={(e) => e.stopPropagation()} style={{ color: token.colorTextTertiary }} />
          </Dropdown>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* 头部:标题 + 新增 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ flex: 1, fontSize: 20, fontWeight: 700 }}>{t('qr.title')}</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>{t('qr.add')}</Button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* 左:分类侧栏 */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, padding: '0 12px 6px' }}>{t('qr.catMgr')}</div>
          {catRow(ALL, t('qr.catAll'))}
          {catRow(NONE, t('qr.catNone'))}
          {/* 添加分类 */}
          {adding ? (
            <Input size="small" autoFocus value={newCatName} placeholder={t('qr.catNamePh')} style={{ margin: '2px 0' }}
              onChange={(e) => setNewCatName(e.target.value)} onBlur={submitNewCat} onPressEnter={submitNewCat} maxLength={50} />
          ) : (
            <div onClick={() => setAdding(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', margin: '2px 0', borderRadius: 8, cursor: 'pointer', color: token.colorTextTertiary }}>
              <span>{t('qr.catAdd')}</span><PlusOutlined />
            </div>
          )}
          {cats.map((c) => catRow(c.id, c.name, c))}
        </div>

        {/* 右:搜索 + 表格 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input allowClear prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
            placeholder={t('qr.search')} value={keyword} onChange={(e) => setKeyword(e.target.value)}
            style={{ marginBottom: 16 }} />
          <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading}
            locale={{ emptyText: t('qr.empty') }} pagination={false} />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal open={open} title={editing ? t('qr.edit') : t('qr.add')} width={680}
        okText={t('common.save')} cancelText={t('common.cancel')} onCancel={() => setOpen(false)} onOk={submitReply} destroyOnClose>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>{t('qr.category')}</div>
          <Select style={{ width: 220 }} value={formCat ?? NONE}
            onChange={(v) => setFormCat(v === NONE ? null : v)}
            options={[{ value: NONE, label: t('qr.catNone') }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {t('qr.name')} <Tooltip title={t('qr.nameTip')}><QuestionCircleOutlined style={{ color: token.colorTextQuaternary }} /></Tooltip>
          </div>
          <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={t('qr.namePh')} maxLength={500} />
        </div>
        <div>
          <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: token.colorError }}>* </span>{t('qr.content')}</div>
          <RichReplyEditor initialValue={editing?.content || ''} onChange={setFormContent} />
        </div>
      </Modal>
    </div>
  )
}
