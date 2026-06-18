import { useEffect, useState } from 'react'
import {
  Button, DatePicker, Descriptions, Divider, Drawer, Form, InputNumber, Modal, Popconfirm,
  Select, Space, Table, Tag, message,
} from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'

// 数字步进器(− 数字 +,与坐席端订阅弹窗一致);受控 value/onChange,可用于 Form.Item
function Stepper({ value = 0, onChange, min = 0, max = 9999 }: {
  value?: number; onChange?: (v: number) => void; min?: number; max?: number
}) {
  const v = Number(value) || 0
  const clamp = (x: number) => Math.min(max, Math.max(min, x))
  return (
    <Space.Compact style={{ width: 200 }}>
      <Button style={{ width: 40, flexShrink: 0 }} icon={<MinusOutlined />} disabled={v <= min} onClick={() => onChange?.(clamp(v - 1))} />
      <InputNumber controls={false} value={v} min={min} max={max} className="adm-stepper-num"
        style={{ flex: 1, width: '100%' }} onChange={(n) => onChange?.(clamp(Number(n) || min))} />
      <Button style={{ width: 40, flexShrink: 0 }} icon={<PlusOutlined />} disabled={v >= max} onClick={() => onChange?.(clamp(v + 1))} />
    </Space.Compact>
  )
}
import {
  adjustProjectResource, cancelSubscription, getProjectSubscription, getSubscriptionLogs, grantSubscription, listPlans,
} from '../api/resources'
import type { AdminProjectVO, PlanVO, ProjectSubscriptionVO, SubscriptionLogVO } from '../types'

interface Props {
  project: AdminProjectVO | null  // 非空=打开
  onClose: () => void
}

const p2 = (n: number) => String(n).padStart(2, '0')
// Date → 'YYYY-MM-DD HH:mm:ss'(空格分隔,对齐后端统一 LocalDateTime 格式)
function fmtLocal(d: Date) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
}
function fmtDisplay(s: string | null) {
  if (!s) return '--'
  return s.slice(0, 16)
}

// 后管:查看项目订阅情况+资源用量,手动开通/调整(含加购席位与客户配额),停用订阅,订阅变更(订单)记录。
export default function SubscriptionDrawer({ project, onClose }: Props) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<ProjectSubscriptionVO | null>(null)
  const [plans, setPlans] = useState<PlanVO[]>([])
  const [logs, setLogs] = useState<SubscriptionLogVO[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [expire, setExpire] = useState('')
  // 调整扩展额度弹窗
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustForm] = Form.useForm()

  const load = async () => {
    if (!project) return
    setLoading(true)
    try {
      const [d, ps, lg] = await Promise.all([
        getProjectSubscription(project.id),
        listPlans(),
        getSubscriptionLogs(project.id),
      ])
      setDetail(d)
      setPlans(ps.filter((p) => p.isCustom !== 1 && p.status === 1).sort((a, b) => a.level - b.level))
      setLogs(lg)
      form.setFieldsValue({
        planId: d.subscribed ? d.planId : undefined,
        seats: d.seats || 0,
      })
      setExpire('')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { if (project) load() }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 到期时间快捷:今天+N天 23:59:59
  const quickDays = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(23, 59, 59, 0)
    setExpire(fmtLocal(d))
  }

  const submit = async () => {
    const v = await form.validateFields()
    if (!project) return
    if (!expire) { message.warning(t('sub.pickExpire')); return }
    setSubmitting(true)
    try {
      await grantSubscription(project.id, {
        planId: v.planId, seats: v.seats || 0, expireTime: expire,
      })
      message.success(t('sub.granted'))
      load()
    } finally { setSubmitting(false) }
  }

  // 调整扩展额度(永久包:覆盖设置已购量)
  const openAdjust = () => {
    adjustForm.setFieldsValue({ resourceType: 'customer', amount: 0 })
    setAdjustOpen(true)
  }
  const submitAdjust = async () => {
    const v = await adjustForm.validateFields()
    if (!project) return
    await adjustProjectResource(project.id, { resourceType: v.resourceType, amount: v.amount || 0 })
    message.success(t('sub.adjustDone'))
    setAdjustOpen(false)
    load()
  }

  const doCancel = async () => {
    if (!project) return
    await cancelSubscription(project.id)
    message.success(t('sub.cancelled'))
    load()
  }

  const statusTag = (d: ProjectSubscriptionVO) => {
    if (!d.subscribed) return <Tag>{t('sub.none')}</Tag>
    if (d.expired || d.status !== 1) return <Tag color="error">{t('sub.expired')}</Tag>
    return <Tag color="success">{t('sub.active')}</Tag>
  }
  const totalText = (used: number, total: number) => `${used} / ${total < 0 ? t('sub.unlimited') : total}`
  // 单一总量展示(-1=无限)
  const oneTotal = (n: number) => (n < 0 ? t('sub.unlimited') : String(n))

  const logCols: ColumnsType<SubscriptionLogVO> = [
    { title: t('sub.logAction'), dataIndex: 'action', width: 80, render: (a: string) => t(`sub.action_${a}`, { defaultValue: a }) },
    {
      title: t('sub.logDetail'),
      render: (_, r) => (r.action === 'grant'
        ? `${r.planName || ''} · ${t('sub.extraSeats')}${r.seats ?? 0} · ${t('sub.extraCustomers')}${r.extraCustomers ?? 0} · ${t('sub.expire')}${fmtDisplay(r.expireTime)}`
        : '--'),
    },
    { title: t('orders.createTime'), dataIndex: 'createTime', width: 130, render: (v) => fmtDisplay(v) },
  ]

  return (
    <Drawer
      title={`${t('sub.title')} - ${project?.name || ''}`}
      open={!!project}
      onClose={onClose}
      width={560}
      loading={loading}
    >
      {detail && (
        <>
          <Descriptions column={1} size="small" bordered title={t('sub.statusTitle')}
            extra={detail.subscribed && (
              <Popconfirm title={t('sub.cancelConfirm')} onConfirm={doCancel}>
                <Button danger size="small">{t('sub.cancelBtn')}</Button>
              </Popconfirm>
            )}>
            <Descriptions.Item label={t('sub.status')}>{statusTag(detail)}</Descriptions.Item>
            <Descriptions.Item label={t('sub.plan')}>{detail.planName || '--'}</Descriptions.Item>
            <Descriptions.Item label={t('sub.expire')}>{fmtDisplay(detail.expireTime)}</Descriptions.Item>
          </Descriptions>

          <Divider>{t('sub.resTitle')}</Divider>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t('sub.seatUsage')}>{totalText(detail.seatUsed, detail.seatTotal)}</Descriptions.Item>
            <Descriptions.Item label={t('sub.customerUsage')}>{totalText(detail.customerUsed, detail.customerTotal)}</Descriptions.Item>
            <Descriptions.Item label={t('sub.article')}>0 / {oneTotal(detail.articleTotal)}</Descriptions.Item>
            <Descriptions.Item label={t('sub.site')}>0 / {oneTotal(detail.siteTotal)}</Descriptions.Item>
            <Descriptions.Item label={t('sub.translatePack')}>{oneTotal(detail.translateTotal)}</Descriptions.Item>
            <Descriptions.Item label={t('sub.tokens')}>{oneTotal(detail.aiTokensTotal)}</Descriptions.Item>
          </Descriptions>
          {/* 扩展额度(永久包:客户/翻译/Tokens)单独调整 */}
          <Button size="small" style={{ marginTop: 12 }} onClick={openAdjust}>{t('sub.adjustExt')}</Button>

          <Divider>{t('sub.grantTitle')}</Divider>
          <Form form={form} layout="vertical">
            <Form.Item name="planId" label={t('sub.plan')} rules={[{ required: true }]}>
              <Select placeholder={t('sub.pickPlan')} options={plans.map((p) => ({ value: p.id, label: p.name }))} />
            </Form.Item>
            <Form.Item name="seats" label={t('sub.extraSeats')} initialValue={0}>
              <Stepper min={0} max={9999} />
            </Form.Item>
            <Form.Item label={t('sub.expire')} required>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Button size="small" onClick={() => quickDays(detail.freeTrialDays)}>{t('sub.trialN', { n: detail.freeTrialDays })}</Button>
                  <Button size="small" onClick={() => quickDays(30)}>{t('sub.plus30')}</Button>
                  <Button size="small" onClick={() => quickDays(365)}>{t('sub.plus365')}</Button>
                </Space>
                <DatePicker
                  style={{ width: '100%' }}
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  onChange={(_, ds) => setExpire(ds ? `${String(ds)}:00` : '')}
                />
                <span style={{ color: '#999', fontSize: 12 }}>{t('sub.expireWillBe')}: {expire ? fmtDisplay(expire) : '--'}</span>
              </Space>
            </Form.Item>
            <Button type="primary" block loading={submitting} onClick={submit}>{t('sub.grantBtn')}</Button>
          </Form>

          <Divider>{t('sub.changeLog')}</Divider>
          <Table rowKey="id" size="small" columns={logCols} dataSource={logs} pagination={false}
            locale={{ emptyText: t('sub.noChange') }} />

          {/* 调整扩展额度(永久包:覆盖设置已购量;总量=免费默认+本值) */}
          <Modal title={t('sub.adjustExt')} open={adjustOpen} onOk={submitAdjust}
            onCancel={() => setAdjustOpen(false)} destroyOnClose>
            <Form form={adjustForm} layout="vertical">
              <Form.Item name="resourceType" label={t('sub.extResType')} rules={[{ required: true }]}>
                <Select options={[
                  { value: 'customer', label: t('sub.extCustomer') },
                  { value: 'translate_char', label: t('sub.extTranslate') },
                  { value: 'ai_tokens', label: t('sub.extTokens') },
                ]} />
              </Form.Item>
              <Form.Item name="amount" label={t('sub.extAmount')} initialValue={0} rules={[{ required: true }]}>
                <InputNumber min={0} max={999999999} style={{ width: '100%' }} />
              </Form.Item>
              <span style={{ color: '#999', fontSize: 12 }}>{t('sub.extHint')}</span>
            </Form>
          </Modal>
        </>
      )}
    </Drawer>
  )
}
