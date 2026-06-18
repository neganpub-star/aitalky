import { useEffect, useState } from 'react'
import {
  Button, DatePicker, Descriptions, Divider, Drawer, Form, InputNumber, Popconfirm,
  Select, Space, Table, Tag, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import {
  cancelSubscription, getProjectSubscription, getSubscriptionLogs, grantSubscription, listPlans,
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
        extraCustomers: d.extraCustomers || 0,
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
        planId: v.planId, seats: v.seats || 0, extraCustomers: v.extraCustomers || 0, expireTime: expire,
      })
      message.success(t('sub.granted'))
      load()
    } finally { setSubmitting(false) }
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
  // 配额总量(占位资源:公网文章/应用站点/翻译包);amount 是 Long 序列化字符串,Number 强转
  const quotaTotal = (type: string) => {
    const q = detail?.quotas.find((x) => x.resourceType === type)
    if (!q) return '--'
    return q.isUnlimited === 1 ? t('sub.unlimited') : String(Number(q.amount))
  }

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
            <Descriptions.Item label={t('sub.article')}>0 / {quotaTotal('article')}</Descriptions.Item>
            <Descriptions.Item label={t('sub.site')}>0 / {quotaTotal('site')}</Descriptions.Item>
            <Descriptions.Item label={t('sub.translatePack')}>{quotaTotal('translate_char')}</Descriptions.Item>
            <Descriptions.Item label={t('sub.tokens')}>--</Descriptions.Item>
          </Descriptions>

          <Divider>{t('sub.grantTitle')}</Divider>
          <Form form={form} layout="vertical">
            <Form.Item name="planId" label={t('sub.plan')} rules={[{ required: true }]}>
              <Select placeholder={t('sub.pickPlan')} options={plans.map((p) => ({ value: p.id, label: p.name }))} />
            </Form.Item>
            <Space size="large" style={{ display: 'flex' }}>
              <Form.Item name="seats" label={t('sub.extraSeats')} initialValue={0} style={{ flex: 1 }}>
                <InputNumber min={0} max={9999} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="extraCustomers" label={t('sub.extraCustomers')} initialValue={0} style={{ flex: 1 }}>
                <InputNumber min={0} max={9999999} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
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
        </>
      )}
    </Drawer>
  )
}
