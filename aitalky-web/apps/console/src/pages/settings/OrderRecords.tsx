import { useEffect, useState } from 'react'
import { Button, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { pageOrders, cancelOrder, type OrderVO, type OrderQuery } from '../../api/billing'
import PendingPayModal from './PendingPayModal'

// 数据管理 → 服务订阅 → 订单记录(对齐现网 img_4):筛选(类型/状态/日期/订单号) + 编号/类型/订阅资源/周期/金额/状态/说明/时间/操作。倒序分页。
// 待支付订单可"去支付"(选网络取地址二维码)或"取消订单";已完成=实际开通。
const STATUS = (t: (k: string) => string): Record<number, { color: string; text: string }> => ({
  0: { color: 'gold', text: t('bill.stPending') },
  1: { color: 'green', text: t('bill.stPaid') },
  2: { color: 'default', text: t('bill.stCancelled') },
})
const TYPE_KEY: Record<string, string> = {
  new: 'bill.typeNew',
  renew: 'bill.typeRenew',
  upgrade: 'bill.typeUpgrade',
  addon_seat: 'bill.typeAddonSeat',
  addon_customer: 'bill.typeAddonCustomer',
}
const PAGE_SIZE = 10

export default function OrderRecords() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [data, setData] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [payOrder, setPayOrder] = useState<OrderVO | null>(null)
  // 筛选项
  const [type, setType] = useState<string>()
  const [status, setStatus] = useState<number>()
  const [orderNo, setOrderNo] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const query: OrderQuery = {
        current: p, size: PAGE_SIZE, type, status, orderNo: orderNo.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }
      const r = await pageOrders(query)
      setData(r.records)
      setTotal(r.total)
      setPage(r.current)
    } finally {
      setLoading(false)
    }
  }
  // 筛选变化即查(订单号走回车/失焦);首次加载
  useEffect(() => { load(1) }, [type, status, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  // 取消待支付订单(对齐 img_4 操作列),成功后刷新当前页
  const doCancel = async (o: OrderVO) => {
    try {
      await cancelOrder(o.id)
      message.success(t('common.ok'))
      load(page)
    } catch { /* 全局拦截器已提示 */ }
  }

  // 订阅资源列文案:套餐单=套餐名(+加购席位);席位加购=席位N个;客户配额加购=客户配额N
  const resourceText = (r: OrderVO) => {
    if (r.type === 'addon_seat') return `${t('bill.res.seat')}: ${r.seats}`
    if (r.type === 'addon_customer') return `${t('bill.res.customer')}: ${r.quantity}`
    return (
      <span>
        {r.planName}
        {r.seats > 0 && <span style={{ color: token.colorTextTertiary }}> · {t('bill.subSeats')}: {r.seats}</span>}
      </span>
    )
  }
  // 订阅周期列:套餐=月数×30天;席位加购=折算剩余天数;客户配额加购=--
  const periodText = (r: OrderVO) => {
    if (r.type === 'addon_seat') return t('bill.days', { n: r.periodDays })
    if (r.type === 'addon_customer') return '--'
    return t('bill.days', { n: r.months * 30 })
  }

  const statusMap = STATUS(t)
  const columns: ColumnsType<OrderVO> = [
    { title: t('bill.orderNo'), dataIndex: 'orderNo', width: 190 },
    { title: t('bill.orderType'), dataIndex: 'type', width: 110, render: (v: string) => t(TYPE_KEY[v] || v) },
    { title: t('bill.subResource'), width: 180, render: (_, r) => resourceText(r) },
    { title: t('bill.subPeriod'), width: 100, render: (_, r) => periodText(r) },
    { title: t('bill.amount'), dataIndex: 'amount', width: 120, render: (v: number, r) => `${v} ${r.currency}` },
    {
      title: t('bill.subStatus'), dataIndex: 'status', width: 100,
      render: (s: number) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    {
      title: t('bill.remark'), width: 180,
      render: (_, r) => (r.status === 0
        ? <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>{t('bill.pendingRemark')}</span>
        : '--'),
    },
    { title: t('bill.createdAt'), dataIndex: 'createTime', width: 170, render: (v) => v || '--' },
    { title: t('bill.activatedAt'), dataIndex: 'paidTime', width: 170, render: (v) => v || '--' },
    {
      title: t('bill.action'), width: 150, fixed: 'right',
      render: (_, r) => (r.status === 0 ? (
        <Space size={4} split={<span style={{ color: token.colorSplit }}>|</span>}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setPayOrder(r)}>{t('bill.goPay')}</Button>
          <Popconfirm title={t('bill.cancelOrder')} okText={t('common.confirm')} cancelText={t('common.cancel')} onConfirm={() => doCancel(r)}>
            <Button type="link" size="small" danger style={{ padding: 0 }}>{t('bill.cancelOrder')}</Button>
          </Popconfirm>
        </Space>
      ) : '--'),
    },
  ]

  const typeOptions = ['new', 'renew', 'upgrade', 'addon_seat', 'addon_customer']
    .map((v) => ({ value: v, label: t(TYPE_KEY[v]) }))

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: token.colorText }}>{t('bill.orders')}</div>

      {/* 筛选区(对齐现网 img_4) */}
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select allowClear placeholder={t('bill.orderType')} style={{ width: 140 }}
            value={type} onChange={(v) => setType(v)} options={typeOptions} />
          <Select allowClear placeholder={t('bill.subStatus')} style={{ width: 130 }}
            value={status} onChange={(v) => setStatus(v)}
            options={[0, 1, 2].map((s) => ({ value: s, label: statusMap[s].text }))} />
          <DatePicker.RangePicker
            onChange={(_, ds) => { setDateFrom(ds?.[0] || ''); setDateTo(ds?.[1] || '') }} />
        </Space>
        <Input.Search allowClear placeholder={t('bill.orderNo')} style={{ width: 260 }}
          value={orderNo} onChange={(e) => setOrderNo(e.target.value)} onSearch={() => load(1)} />
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1300 }}
        pagination={{ current: page, total, pageSize: PAGE_SIZE, onChange: (p) => load(p) }}
      />
      <PendingPayModal
        open={!!payOrder}
        order={payOrder}
        onClose={() => setPayOrder(null)}
        onDone={() => { setPayOrder(null); load(page) }}
      />
    </div>
  )
}
