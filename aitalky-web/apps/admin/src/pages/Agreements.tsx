import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { deleteAgreement, listAgreements, saveAgreement } from '../api/resources'
import type { AgreementVO } from '../types'
import PageCard from '../components/PageCard'
import StatusBadge from '../components/StatusBadge'

const TYPES = ['terms', 'privacy', 'subscription']

export default function Agreements() {
  const { t } = useTranslation()
  const [data, setData] = useState<AgreementVO[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AgreementVO | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { setData(await listAgreements()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const typeLabel = (ty: string) => t(`agreements.${ty}`, ty)

  const openModal = (a?: AgreementVO) => {
    setEditing(a || null)
    form.setFieldsValue(a ? { ...a } : { type: 'terms', language: 'zh_CN', title: '', content: '', version: 'v1.0', status: 1 })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    await saveAgreement({ ...editing, ...v, id: editing?.id })
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }

  const columns: ColumnsType<AgreementVO> = [
    { title: t('agreements.type'), dataIndex: 'type', render: (v) => <Tag>{typeLabel(v)}</Tag> },
    { title: t('agreements.language'), dataIndex: 'language' },
    { title: t('agreements.title'), dataIndex: 'title', render: (v) => v || '-' },
    { title: t('agreements.version'), dataIndex: 'version', render: (v) => v || '-' },
    {
      title: t('common.status'), dataIndex: 'status', width: 90,
      render: (s: number) => <StatusBadge active={s === 1} on="发布" off="草稿" />,
    },
    {
      title: t('common.operation'), width: 150,
      render: (_, a) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(a)}>{t('common.edit')}</Button>
          <Popconfirm title={t('common.deleteConfirm')} onConfirm={async () => { await deleteAgreement(a.id); message.success(t('common.deleted')); load() }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.agreements')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('common.add')}</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal title={t('nav.agreements')} open={open} onOk={submit} onCancel={() => setOpen(false)} width={680} destroyOnClose>
        <Form form={form} layout="vertical">
          <Space size="large">
            <Form.Item name="type" label={t('agreements.type')} rules={[{ required: true }]}>
              <Select style={{ width: 180 }} options={TYPES.map((ty) => ({ value: ty, label: typeLabel(ty) }))} />
            </Form.Item>
            <Form.Item name="language" label={t('agreements.language')} rules={[{ required: true }]}><Input style={{ width: 120 }} /></Form.Item>
            <Form.Item name="version" label={t('agreements.version')}><Input style={{ width: 120 }} /></Form.Item>
          </Space>
          <Form.Item name="title" label={t('agreements.title')}><Input /></Form.Item>
          <Form.Item name="content" label={t('agreements.content')}><Input.TextArea rows={8} /></Form.Item>
        </Form>
      </Modal>
    </PageCard>
  )
}
