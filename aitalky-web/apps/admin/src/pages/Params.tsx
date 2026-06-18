import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Table, message } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { listConfigs, updateConfig } from '../api/resources'
import type { ConfigVO } from '../types'
import PageCard from '../components/PageCard'

// 参数管理:平台 key-value 配置(客服 Telegram / 订单超时 / 免费体验天数等),仅改值。
export default function Params() {
  const { t } = useTranslation()
  const [data, setData] = useState<ConfigVO[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigVO | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { setData(await listConfigs()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openModal = (c: ConfigVO) => {
    setEditing(c)
    form.setFieldsValue({ configValue: c.configValue })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    if (editing) await updateConfig(editing.id, v.configValue ?? '')
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }

  const columns: ColumnsType<ConfigVO> = [
    { title: t('params.name'), dataIndex: 'name', width: 180 },
    { title: t('params.key'), dataIndex: 'configKey', width: 200 },
    { title: t('params.value'), dataIndex: 'configValue', ellipsis: true },
    { title: t('params.remark'), dataIndex: 'remark', ellipsis: true },
    {
      title: t('common.operation'), width: 100,
      render: (_, c) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(c)}>{t('common.edit')}</Button>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.params')}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal title={editing?.name} open={open} onOk={submit} onCancel={() => setOpen(false)} width={520} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="configValue" label={t('params.value')} extra={editing?.remark}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageCard>
  )
}
