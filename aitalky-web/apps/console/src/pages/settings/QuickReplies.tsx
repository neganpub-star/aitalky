import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Table, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  addQuickReply, deleteQuickReply, listQuickReplies, updateQuickReply, type QuickReplyVO,
} from '../../api/quickReply'

// 会话服务 - 快捷回复:话术 CRUD(坐席聊天区工具栏插入)
export default function QuickReplies() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [data, setData] = useState<QuickReplyVO[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<QuickReplyVO | null>(null)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listQuickReplies())
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); form.resetFields(); setOpen(true) }
  const openEdit = (r: QuickReplyVO) => { setEditing(r); form.setFieldsValue({ title: r.title, content: r.content }); setOpen(true) }

  const onSubmit = async () => {
    const v = await form.validateFields()
    if (editing) {
      await updateQuickReply(editing.id, { categoryId: editing.categoryId, title: v.title, content: v.content })
    } else {
      await addQuickReply({ title: v.title, content: v.content })
    }
    message.success(t('profile.saved'))
    setOpen(false)
    load()
  }

  const onDelete = async (id: string) => {
    await deleteQuickReply(id)
    load()
  }

  const columns: ColumnsType<QuickReplyVO> = [
    { title: t('qr.name'), dataIndex: 'title', width: 200, render: (v: string | null) => v || '--' },
    { title: t('qr.content'), dataIndex: 'content', ellipsis: true },
    {
      title: t('qr.action'),
      width: 140,
      render: (_, r) => (
        <>
          <a onClick={() => openEdit(r)}>{t('profile.change')}</a>
          <Popconfirm title={t('qr.delConfirm')} okText={t('common.confirm')} cancelText={t('common.cancel')} onConfirm={() => onDelete(r.id)}>
            <a style={{ marginLeft: 12, color: '#ff4d4f' }}>{t('qr.del')}</a>
          </Popconfirm>
        </>
      ),
    },
  ]

  return (
    <Card
      title={t('qr.title')}
      variant="borderless"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>{t('qr.add')}</Button>}
    >
      <div style={{ color: token.colorTextTertiary, marginBottom: 16 }}>{t('qr.desc')}</div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        locale={{ emptyText: t('qr.empty') }}
        pagination={false}
      />
      <Modal title={editing ? t('qr.edit') : t('qr.add')} open={open} onOk={onSubmit} onCancel={() => setOpen(false)} okText={t('common.confirm')} cancelText={t('common.cancel')} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('qr.name')}>
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item name="content" label={t('qr.content')} rules={[{ required: true, message: t('qr.contentRequired') }]}>
            <Input.TextArea rows={4} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
