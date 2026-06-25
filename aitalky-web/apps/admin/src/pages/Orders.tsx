import { useEffect, useState } from 'react'
import { Button, Card, Col, Input, Row, Select, Space, Statistic, Table, Tag, Tooltip, theme } from 'antd'
import { ReloadOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, ProfileOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { getOrderStats, pageOrders } from '../api/resources'
import type { AdminOrderVO, OrderStatsVO } from '../types'
import PageCard from '../components/PageCard'

// 订单状态/类型 → 颜色映射(展示用)
const STATUS_COLOR: Record<number, string> = { 0: 'gold', 1: 'green', 2: 'default' }
const TYPE_COLOR: Record<string, string> = {
  new: 'blue', renew: 'cyan', upgrade: 'purple',
  addon_seat: 'orange', addon_translate: 'geekblue', addon_tokens: 'gold', addon_customer: 'magenta',
}

export default function Orders() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [data, setData] = useState<AdminOrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [type, setType] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  // 全局统计(不随筛选变);进入即拉一次,刷新时同步更新
  const [stats, setStats] = useState<OrderStatsVO | null>(null)

  const loadStats = () => getOrderStats().then(setStats).catch(() => {})
  useEffect(() => { loadStats() }, [])

  const load = async (p = page) => {
    setLoading(true)
    try {
      const r = await pageOrders({
        page: p, size: 10,
        projectId: projectId.trim() || undefined,
        status, type,
      })
      setData(r.records)
      setTotal(r.total)
      setPage(r.current)
    } finally {
      setLoading(false)
    }
  }
  // 筛选项变化即重新查(回到第 1 页)
  useEffect(() => { load(1) }, [status, type]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnsType<AdminOrderVO> = [
    { title: t('orders.orderNo'), dataIndex: 'orderNo', width: 200 },
    { title: t('orders.project'), dataIndex: 'projectName', render: (v, r) => v || r.projectId },
    {
      title: t('orders.type'), dataIndex: 'type', width: 120,
      render: (v: string) => <Tag color={TYPE_COLOR[v] || 'default'}>{t(`orders.type_${v}`, v)}</Tag>,
    },
    { title: t('orders.plan'), dataIndex: 'planName' },
    { title: t('orders.months'), dataIndex: 'months', width: 80 },
    // 表头不换行(加购席位等较长标题)
    { title: t('orders.seats'), dataIndex: 'seats', width: 90, onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }) },
    {
      title: t('orders.amount'), dataIndex: 'amount', width: 130,
      render: (v: number, r) => `${v} ${r.currency}`,
    },
    {
      title: t('common.status'), dataIndex: 'status', width: 110,
      render: (s: number) => <Tag color={STATUS_COLOR[s]}>{t(`orders.status_${s}`)}</Tag>,
    },
    { title: t('orders.createTime'), dataIndex: 'createTime', width: 180, render: (v) => v || '-' },
    { title: t('orders.paidTime'), dataIndex: 'paidTime', width: 180, render: (v) => v || '-' },
  ]

  return (
    <PageCard
      title={t('nav.orders')}
      extra={(
        <Tooltip title={t('common.refresh')}>
          <Button icon={<ReloadOutlined />} onClick={() => { load(page); loadStats() }} />
        </Tooltip>
      )}
    >
      {/* 全局统计卡(跨项目,不随下方筛选变化) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {([
          { key: 'statAmount', icon: <DollarOutlined />, color: '#67c23a', bg: 'rgba(103,194,58,0.12)', value: stats ? `${Number(stats.paidAmount).toLocaleString()} ${stats.currency}` : '-' },
          { key: 'statPaid', icon: <CheckCircleOutlined />, color: '#409eff', bg: 'rgba(64,158,255,0.12)', value: stats?.paidOrders ?? '-' },
          { key: 'statPending', icon: <ClockCircleOutlined />, color: '#e6a23c', bg: 'rgba(230,162,60,0.12)', value: stats?.pendingOrders ?? '-' },
          { key: 'statTotal', icon: <ProfileOutlined />, color: '#909399', bg: 'rgba(144,147,153,0.14)', value: stats?.totalOrders ?? '-' },
        ]).map((c) => (
          <Col key={c.key} xs={12} sm={12} md={6}>
            <Card variant="borderless" styles={{ body: { display: 'flex', alignItems: 'center', gap: 14, padding: 18 } }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                background: c.bg, color: c.color, fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{c.icon}</div>
              <Statistic
                title={t(`orders.${c.key}`)}
                value={c.value}
                valueStyle={{ fontSize: 22, fontWeight: 700, color: token.colorText }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder={t('orders.projectIdPlaceholder')}
          allowClear
          style={{ width: 220 }}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onPressEnter={() => load(1)}
        />
        <Select
          placeholder={t('common.status')}
          allowClear
          style={{ width: 140 }}
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: 0, label: t('orders.status_0') },
            { value: 1, label: t('orders.status_1') },
            { value: 2, label: t('orders.status_2') },
          ]}
        />
        <Select
          placeholder={t('orders.type')}
          allowClear
          style={{ width: 140 }}
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: 'new', label: t('orders.type_new') },
            { value: 'renew', label: t('orders.type_renew') },
            { value: 'upgrade', label: t('orders.type_upgrade') },
            { value: 'addon_seat', label: t('orders.type_addon_seat') },
            { value: 'addon_translate', label: t('orders.type_addon_translate') },
            { value: 'addon_tokens', label: t('orders.type_addon_tokens') },
            { value: 'addon_customer', label: t('orders.type_addon_customer') },
          ]}
        />
        <Button type="primary" onClick={() => load(1)}>{t('common.search')}</Button>
        <Button onClick={() => { setProjectId(''); setStatus(undefined); setType(undefined) }}>{t('common.reset')}</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1200 }}
        pagination={{ current: page, total, pageSize: 10, showTotal: (n) => t('orders.totalCount', { count: n }), onChange: (p) => load(p) }}
      />
    </PageCard>
  )
}
