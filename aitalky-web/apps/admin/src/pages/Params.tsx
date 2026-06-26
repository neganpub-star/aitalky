import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Space, Table, message } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { listConfigs, createConfig, updateConfig, deleteConfig } from '../api/resources'
import type { ConfigVO } from '../types'
import PageCard from '../components/PageCard'

// 参数管理:平台 key-value 配置(客服 Telegram / 订单超时 / 免费体验天数等)。支持新增 + 全字段编辑 + 删除。
export default function Params() {
  const { t } = useTranslation()
  const [data, setData] = useState<ConfigVO[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigVO | null>(null) // null=新增
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { setData(await listConfigs()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // 打开:传 c=编辑(回填全字段),不传=新增(空表单)
  const openModal = (c?: ConfigVO) => {
    setEditing(c ?? null)
    form.setFieldsValue({
      configKey: c?.configKey ?? '',
      name: c?.name ?? '',
      configValue: c?.configValue ?? '',
      remark: c?.remark ?? '',
    })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try {
      if (editing) await updateConfig(editing.id, v)
      else await createConfig(v)
      message.success(t('common.saved'))
      setOpen(false)
      load()
    } finally { setSaving(false) }
  }
  const onDelete = (c: ConfigVO) => {
    Modal.confirm({
      title: t('common.confirmTitle'),
      content: t('params.deleteConfirm', { name: c.name || c.configKey }),
      okButtonProps: { danger: true },
      onOk: async () => { await deleteConfig(c.id); message.success(t('common.deleted')); load() },
    })
  }

  const columns: ColumnsType<ConfigVO> = [
    { title: t('params.name'), dataIndex: 'name', width: 180 },
    { title: t('params.key'), dataIndex: 'configKey', width: 200 },
    { title: t('params.value'), dataIndex: 'configValue', ellipsis: true },
    { title: t('params.remark'), dataIndex: 'remark', ellipsis: true },
    {
      title: t('common.operation'), width: 140,
      render: (_, c) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(c)}>{t('common.edit')}</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(c)}>{t('common.delete')}</Button>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.params')} extra={
      <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('params.add')}</Button>
    }>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal title={editing ? t('params.edit') : t('params.add')} open={open} confirmLoading={saving}
        onOk={submit} onCancel={() => setOpen(false)} width={520} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="configKey" label={t('params.key')} extra={t('params.keyTip')}
            rules={[{ required: true, message: t('params.keyRequired') }]}>
            <Input placeholder="example_key" />
          </Form.Item>
          <Form.Item name="name" label={t('params.name')}>
            <Input />
          </Form.Item>
          <Form.Item name="configValue" label={t('params.value')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="remark" label={t('params.remark')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </PageCard>
  )
}
