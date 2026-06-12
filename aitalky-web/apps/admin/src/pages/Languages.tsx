import { useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, message } from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { deleteLanguage, listLanguages, saveLanguage, setLanguageStatus } from '../api/resources'
import type { LanguageVO } from '../types'
import PageCard from '../components/PageCard'
import StatusBadge from '../components/StatusBadge'

export default function Languages() {
  const { t } = useTranslation()
  const [data, setData] = useState<LanguageVO[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LanguageVO | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { setData(await listLanguages()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openModal = (l?: LanguageVO) => {
    setEditing(l || null)
    form.setFieldsValue(l ? { ...l } : { code: '', zhName: '', enName: '', sort: 0, status: 1 })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    await saveLanguage({ ...editing, ...v, id: editing?.id })
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }

  const columns: ColumnsType<LanguageVO> = [
    { title: t('languages.sort'), dataIndex: 'sort', width: 80 },
    { title: t('languages.code'), dataIndex: 'code' },
    { title: t('languages.zhName'), dataIndex: 'zhName' },
    { title: t('languages.enName'), dataIndex: 'enName' },
    {
      title: t('common.status'), dataIndex: 'status', width: 90,
      render: (s: number) => <StatusBadge active={s === 1} on={t('common.enabled')} off={t('common.disabled')} />,
    },
    {
      title: t('common.operation'), width: 190,
      render: (_, l) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(l)}>{t('common.edit')}</Button>
          <Button type="link" size="small" icon={l.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={async () => { await setLanguageStatus(l.id, l.status === 1 ? 0 : 1); load() }}>
            {l.status === 1 ? t('common.disabled') : t('common.enabled')}
          </Button>
          <Popconfirm title={t('common.deleteConfirm')} onConfirm={async () => { await deleteLanguage(l.id); message.success(t('common.deleted')); load() }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.languages')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('common.add')}</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal title={t('nav.languages')} open={open} onOk={submit} onCancel={() => setOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label={t('languages.code')} rules={[{ required: true }]}><Input disabled={!!editing} placeholder="zh_CN" /></Form.Item>
          <Form.Item name="zhName" label={t('languages.zhName')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="enName" label={t('languages.enName')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sort" label={t('languages.sort')}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </PageCard>
  )
}
