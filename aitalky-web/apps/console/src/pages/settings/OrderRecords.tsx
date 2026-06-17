import { useEffect, useState } from 'react'
import { Button, Popconfirm, Space, Table, Tag, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { pageOrders, cancelOrder, type OrderVO } from '../../api/billing'
import PendingPayModal from './PendingPayModal'

// 数据管理 → 服务订阅 → 订单记录(对齐图7):编号/类型/订阅资源/周期/金额/状态/说明/时间/操作。倒序分页。
// 待支付订单可"去支付"(选网络取地址二维码)或"取消订单";已完成=实际开通。
// 注:类型/状态/日期筛选(图7有)依赖坐席端订单接口加筛选参数,MVP 暂未做。
const STATUS = (t: (k: string) => string): Record<number, { color: string; text: string }> => ({
  0: { color: 'gold', text: t('bill.stPending') },
  1: { color: 'green', text: t('bill.stPaid') },
  2: { color: 'default', text: t('bill.stCancelled') },
})
const TYPE_KEY: Record<string, string> = { new: 'bill.typeNew', renew: 'bill.typeRenew', upgrade: 'bill.typeUpgrade' }

export default function OrderRecords() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [data, setData] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [payOrder, setPayOrder] = useState<OrderVO | null>(null)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const r = await pageOrders(p, 10)
      setData(r.records)
      setTotal(r.total)
      setPage(r.current)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load(1) }, [])

  // 取消待支付订单(对齐图4操作列),成功后刷新当前页
  const doCancel = async (o: OrderVO) => {
    try {
      await cancelOrder(o.id)
      message.success(t('common.ok'))
      load(page)
    } catch { /* 全局拦截器已提示 */ }
  }

  const statusMap = STATUS(t)
  const columns: ColumnsType<OrderVO> = [
    { title: t('bill.orderNo'), dataIndex: 'orderNo', width: 190 },
    { title: t('bill.orderType'), dataIndex: 'type', width: 110, render: (v: string) => t(TYPE_KEY[v] || v) },
    {
      title: t('bill.subResource'), width: 180,
      render: (_, r) => (
        <span>
          {r.planName}
          {r.seats > 0 && <span style={{ color: token.colorTextTertiary }}> · {t('bill.subSeats')}: {r.seats}</span>}
        </span>
      ),
    },
    { title: t('bill.subPeriod'), dataIndex: 'months', width: 100, render: (m: number) => t('bill.days', { n: m * 30 }) },
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

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: token.colorText }}>{t('bill.orders')}</div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1300 }}
        pagination={{ current: page, total, pageSize: 10, onChange: (p) => load(p) }}
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
