import { useEffect, useState } from 'react'
import { Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, message } from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { deleteAddon, listAddons, saveAddon, setAddonStatus } from '../api/resources'
import type { AddonVO } from '../types'
import PageCard from '../components/PageCard'
import StatusBadge from '../components/StatusBadge'
import FormSection from '../components/FormSection'

const RESOURCE_TYPES = ['translate_char', 'seat']

export default function Addons() {
  const { t } = useTranslation()
  const [data, setData] = useState<AddonVO[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AddonVO | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { setData(await listAddons()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openModal = (a?: AddonVO) => {
    setEditing(a || null)
    form.setFieldsValue(a ? { ...a } : { code: '', name: '', resourceType: 'translate_char', specAmount: 0, price: 0, currency: 'USD', status: 1 })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    await saveAddon({ ...editing, ...v, id: editing?.id })
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }

  const columns: ColumnsType<AddonVO> = [
    { title: t('addons.code'), dataIndex: 'code' },
    { title: t('addons.name'), dataIndex: 'name' },
    { title: t('addons.resourceType'), dataIndex: 'resourceType' },
    { title: t('addons.spec'), dataIndex: 'specAmount' },
    { title: t('addons.price'), dataIndex: 'price', render: (v, r) => `${v} ${r.currency}` },
    {
      title: t('common.status'), dataIndex: 'status', width: 90,
      render: (s: number) => <StatusBadge active={s === 1} on={t('common.enabled')} off={t('common.disabled')} />,
    },
    {
      title: t('common.operation'), width: 190,
      render: (_, a) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(a)}>{t('common.edit')}</Button>
          <Button type="link" size="small" icon={a.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={async () => { await setAddonStatus(a.id, a.status === 1 ? 0 : 1); load() }}>
            {a.status === 1 ? t('common.off') : t('common.on')}
          </Button>
          <Popconfirm title={t('common.deleteConfirm')} onConfirm={async () => { await deleteAddon(a.id); message.success(t('common.deleted')); load() }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.addons')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('common.add')}</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal title={t('nav.addons')} open={open} onOk={submit} onCancel={() => setOpen(false)} width={560} destroyOnClose>
        <Form form={form} layout="vertical">
          <FormSection title={t('form.basic')} first>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="code" label={t('addons.code')} rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item></Col>
              <Col span={12}><Form.Item name="name" label={t('addons.name')} rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="resourceType" label={t('addons.resourceType')} rules={[{ required: true }]}>
              <Select options={RESOURCE_TYPES.map((r) => ({ value: r, label: r }))} />
            </Form.Item>
          </FormSection>

          <FormSection title={t('form.priceSpec')}>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="specAmount" label={t('addons.spec')} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="price" label={t('addons.price')} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="currency" label="Currency" style={{ marginBottom: 0 }}><Input /></Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </Modal>
    </PageCard>
  )
}
