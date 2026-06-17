import { useEffect, useState } from 'react'
import { Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tag, message } from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { deleteCoin, listCoins, saveCoin, setCoinStatus } from '../api/resources'
import type { CoinVO } from '../types'
import PageCard from '../components/PageCard'
import StatusBadge from '../components/StatusBadge'
import FormSection from '../components/FormSection'

export default function Coins() {
  const { t } = useTranslation()
  const [data, setData] = useState<CoinVO[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CoinVO | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { setData(await listCoins()) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openModal = (c?: CoinVO) => {
    setEditing(c || null)
    form.setFieldsValue(c ? { ...c } : {
      channel: 'coinly', symbol: 'USDT', currency: '', network: '',
      chainId: '', chainName: '', tokenId: '', decimals: 6, sort: 0, status: 1,
    })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    await saveCoin({ ...editing, ...v, id: editing?.id })
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }

  const columns: ColumnsType<CoinVO> = [
    { title: t('coins.symbol'), dataIndex: 'symbol', width: 90 },
    { title: t('coins.currency'), dataIndex: 'currency', width: 130 },
    { title: t('coins.network'), dataIndex: 'network', width: 100, render: (v) => <Tag>{v}</Tag> },
    { title: t('coins.chainName'), dataIndex: 'chainName', width: 110 },
    { title: t('coins.chainId'), dataIndex: 'chainId' },
    { title: t('coins.tokenId'), dataIndex: 'tokenId', render: (v) => v || '-' },
    { title: t('coins.decimals'), dataIndex: 'decimals', width: 80 },
    { title: t('coins.sort'), dataIndex: 'sort', width: 70 },
    {
      title: t('common.status'), dataIndex: 'status', width: 110,
      render: (s: number) => <StatusBadge active={s === 1} on={t('common.enabled')} off={t('common.disabled')} />,
    },
    {
      title: t('common.operation'), width: 200, fixed: 'right',
      render: (_, c) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(c)}>{t('common.edit')}</Button>
          <Button type="link" size="small" icon={c.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={async () => { await setCoinStatus(c.id, c.status === 1 ? 0 : 1); load() }}>
            {c.status === 1 ? t('common.off') : t('common.on')}
          </Button>
          <Popconfirm title={t('common.deleteConfirm')} onConfirm={async () => { await deleteCoin(c.id); message.success(t('common.deleted')); load() }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.coins')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('common.add')}</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} scroll={{ x: 1100 }} />
      <Modal title={t('nav.coins')} open={open} onOk={submit} onCancel={() => setOpen(false)} width={620} destroyOnClose>
        <Form form={form} layout="vertical">
          <FormSection title={t('form.basic')} first>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="symbol" label={t('coins.symbol')} rules={[{ required: true }]}><Input placeholder="USDT" /></Form.Item></Col>
              <Col span={8}><Form.Item name="currency" label={t('coins.currency')} rules={[{ required: true }]}><Input placeholder="USDT-TRC20" /></Form.Item></Col>
              <Col span={8}><Form.Item name="network" label={t('coins.network')} rules={[{ required: true }]}><Input placeholder="TRC20" /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="chainId" label={t('coins.chainId')} rules={[{ required: true }]}><Input placeholder="tron" /></Form.Item></Col>
              <Col span={12}><Form.Item name="chainName" label={t('coins.chainName')} rules={[{ required: true }]}><Input placeholder="Tron" /></Form.Item></Col>
            </Row>
            <Form.Item name="tokenId" label={t('coins.tokenId')} extra={t('coins.tokenIdTip')}><Input /></Form.Item>
          </FormSection>

          <FormSection title={t('form.statusGroup')}>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="channel" label={t('coins.channel')} style={{ marginBottom: 0 }}><Input disabled /></Form.Item></Col>
              <Col span={5}><Form.Item name="decimals" label={t('coins.decimals')} style={{ marginBottom: 0 }}><InputNumber min={0} max={18} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={5}><Form.Item name="sort" label={t('coins.sort')} style={{ marginBottom: 0 }}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="status" label={t('common.status')} style={{ marginBottom: 0 }}>
                <Select options={[{ value: 1, label: t('common.enabled') }, { value: 0, label: t('common.disabled') }]} />
              </Form.Item></Col>
            </Row>
          </FormSection>
        </Form>
      </Modal>
    </PageCard>
  )
}
