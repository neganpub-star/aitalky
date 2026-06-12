import { useEffect, useState } from 'react'
import {
  Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Switch, Table, Tag, message,
} from 'antd'
import {
  MinusCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { deletePlan, listPlans, savePlan, setPlanStatus } from '../api/resources'
import type { PlanVO } from '../types'
import PageCard from '../components/PageCard'
import StatusBadge from '../components/StatusBadge'
import FormSection from '../components/FormSection'

const RESOURCE_TYPES = ['seat', 'translate_char', 'customer']

export default function Plans() {
  const { t } = useTranslation()
  const [data, setData] = useState<PlanVO[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlanVO | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      setData(await listPlans())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openModal = (p?: PlanVO) => {
    setEditing(p || null)
    form.setFieldsValue(
      p
        ? { ...p }
        : { code: '', name: '', level: 0, monthlyPrice: 0, currency: 'USD', minMonths: 6, isCustom: 0, status: 1, features: [], quotas: [] },
    )
    setOpen(true)
  }

  const submit = async () => {
    const v = await form.validateFields()
    await savePlan({ ...editing, ...v, id: editing?.id })
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }

  const columns: ColumnsType<PlanVO> = [
    { title: t('plans.code'), dataIndex: 'code' },
    { title: t('plans.name'), dataIndex: 'name' },
    { title: t('plans.level'), dataIndex: 'level', width: 70 },
    { title: t('plans.price'), dataIndex: 'monthlyPrice', width: 110, render: (v, r) => `${v} ${r.currency}` },
    {
      title: t('plans.quotas'), dataIndex: 'quotas',
      render: (qs: PlanVO['quotas']) => qs.map((q) => (
        <Tag key={q.resourceType}>{q.resourceType}: {q.isUnlimited === 1 ? '∞' : q.amount}</Tag>
      )),
    },
    {
      title: t('common.status'), dataIndex: 'status', width: 90,
      render: (s: number) => <StatusBadge active={s === 1} on={t('common.enabled')} off={t('common.disabled')} />,
    },
    {
      title: t('common.operation'), width: 190,
      render: (_, p) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(p)}>{t('common.edit')}</Button>
          <Button type="link" size="small" icon={p.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={async () => { await setPlanStatus(p.id, p.status === 1 ? 0 : 1); load() }}>
            {p.status === 1 ? t('common.off') : t('common.on')}
          </Button>
          <Popconfirm title={t('common.deleteConfirm')} onConfirm={async () => { await deletePlan(p.id); message.success(t('common.deleted')); load() }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard
      title={t('nav.plans')}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('common.add')}</Button>}
    >
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />

      <Modal title={t('nav.plans')} open={open} onOk={submit} onCancel={() => setOpen(false)} width={680} destroyOnClose>
        <Form form={form} layout="vertical">
          <FormSection title={t('form.basic')} first>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="code" label={t('plans.code')} rules={[{ required: true }]}>
                  <Input disabled={!!editing} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="name" label={t('plans.name')} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}><Form.Item name="level" label={t('plans.level')}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="monthlyPrice" label={t('plans.price')} rules={[{ required: true }]}><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={6}><Form.Item name="currency" label="Currency"><Input /></Form.Item></Col>
              <Col span={6}><Form.Item name="minMonths" label={t('plans.minMonths')}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          </FormSection>

          <FormSection title={t('form.featureQuota')}>
          <Form.Item name="features" label={t('plans.features')}>
            <Select mode="tags" placeholder="inbox, messenger, translate..." />
          </Form.Item>
          <Form.Item label={t('plans.quotas')}>
            <Form.List name="quotas">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                      <Form.Item name={[field.name, 'resourceType']} rules={[{ required: true }]} noStyle>
                        <Select placeholder={t('plans.resourceType')} style={{ width: 150 }} options={RESOURCE_TYPES.map((r) => ({ value: r, label: r }))} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'amount']} noStyle>
                        <InputNumber placeholder={t('plans.amount')} min={0} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'isUnlimited']} noStyle valuePropName="checked" getValueFromEvent={(c) => (c ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
                        <Switch checkedChildren={t('plans.unlimited')} unCheckedChildren="-" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(field.name)} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add({ resourceType: 'seat', amount: 0, isUnlimited: 0 })} block icon={<PlusOutlined />}>
                    {t('plans.addQuota')}
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
          </FormSection>

          <FormSection title={t('form.statusGroup')}>
            <Form.Item name="status" label={t('common.status')} valuePropName="checked" getValueFromEvent={(c) => (c ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })} style={{ marginBottom: 0 }}>
              <Switch checkedChildren={t('common.enabled')} unCheckedChildren={t('common.disabled')} />
            </Form.Item>
          </FormSection>
        </Form>
      </Modal>
    </PageCard>
  )
}
