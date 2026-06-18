import { Modal, Popover, Tag, Typography, theme } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { OrderVO, PlanVO } from '../../api/billing'

interface Props {
  open: boolean
  order: OrderVO | null
  plan: PlanVO | null   // 订单对应套餐(取 features/席位配额);可能为空
  onClose: () => void
}

const TYPE_KEY: Record<string, string> = {
  new: 'bill.typeNew', renew: 'bill.typeRenew', upgrade: 'bill.typeUpgrade',
  addon_seat: 'bill.typeAddonSeat', addon_customer: 'bill.typeAddonCustomer',
  addon_translate: 'bill.typeAddonTranslate', addon_tokens: 'bill.typeAddonTokens',
}
// 永久加量包订单类型 → 资源类型(资源列显示「资源名: 配额数」)
const PACK_RES: Record<string, string> = {
  addon_customer: 'customer', addon_translate: 'translate_char', addon_tokens: 'ai_tokens',
}
const STATUS = (t: (k: string) => string): Record<number, { color: string; text: string }> => ({
  0: { color: 'gold', text: t('bill.stPending') },
  1: { color: 'green', text: t('bill.stPaid') },
  2: { color: 'default', text: t('bill.stCancelled') },
})

// 订单详情(对齐现网 img_22):订单信息 + 套餐信息网格 + 套餐服务清单。订单号点击触发。
export default function OrderDetailModal({ open, order, plan, onClose }: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  if (!order) return null

  const statusMap = STATUS(t)
  const st = statusMap[order.status]
  // 套餐名本地化:有 plan 按 code 走 i18n,否则回退订单快照 planName
  const planName = (() => {
    if (!plan) return order.planName
    const k = `bill.plan.${plan.code}`; const l = t(k); return l === k ? order.planName : l
  })()
  const seatQuota = plan?.quotas.find((q) => q.resourceType === 'seat')
  // 订阅席位:套餐单=套餐配额+加购;席位加购单=加购数。
  // 注:quota.amount 是 Long 序列化为字符串,必须 Number() 转数字,否则 "3"+3="33"(字符串拼接)
  const seatText = order.type === 'addon_seat'
    ? `${order.seats}`
    : `${Number(seatQuota?.amount || 0) + Number(order.seats || 0)}`
  const periodText = order.type === 'addon_seat'
    ? t('bill.days', { n: order.periodDays })
    : ['addon_customer', 'addon_translate', 'addon_tokens'].includes(order.type) ? '--' : t('bill.days', { n: order.months * 30 })
  const features = plan?.features || []
  const featLabel = (code: string) => { const k = `bill.feat.${code}`; const l = t(k); return l === k ? code : l }

  // 套餐服务清单(Popover 内容):点击套餐类型展示(对齐现网)
  const serviceList = features.length > 0 ? (
    <div style={{ minWidth: 180, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13, padding: '4px 2px' }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{t('bill.planService')}</div>
      {seatQuota && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
          {t('bill.res.seat')}: {seatQuota.isUnlimited ? t('bill.unlimited') : seatQuota.amount}
        </span>
      )}
      {features.map((f) => (
        <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />{featLabel(f)}
        </span>
      ))}
    </div>
  ) : null

  // 套餐类型值:有服务清单则做成可点链接 + Popover 悬浮展示,否则纯文本
  const planNameNode = serviceList
    ? <Popover content={serviceList} placement="rightTop" trigger={['click', 'hover']}><Typography.Link>{planName}</Typography.Link></Popover>
    : <span>{planName}</span>

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={720} destroyOnClose title={t('bill.orderDetail')}>
      {/* 订单信息 + 订单金额 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{t('bill.orderInfo')}</span>
        <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
          {t('bill.amount')} <span style={{ fontSize: 20, fontWeight: 700, color: token.colorText }}>${Number(order.amount)}</span>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 14, columnGap: 24, fontSize: 13 }}>
        <Field label={t('bill.orderNo')} token={token}>{order.orderNo}</Field>
        <Field label={t('bill.subStatus')} token={token}><Tag color={st?.color} style={{ margin: 0 }}>{st?.text}</Tag></Field>
        <Field label={t('bill.orderType')} token={token}>{t(TYPE_KEY[order.type] || order.type)}</Field>
        <Field label={t('bill.activatedAt')} token={token}>{order.paidTime || '--'}</Field>
        <Field label={t('bill.createdAt')} token={token}>{order.createTime || '--'}</Field>
      </div>

      {/* 套餐信息网格(套餐类型可点→Popover 展示套餐服务,对齐现网) */}
      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, marginTop: 20, overflow: 'hidden' }}>
        <GridRow token={token}
          left={PACK_RES[order.type]
            ? [t(`bill.res.${PACK_RES[order.type]}`), String(order.quantity)]
            : [t('bill.planType'), planNameNode]}
          right={[t('bill.subSeats'), seatText]} />
        <GridRow token={token}
          left={[t('bill.subPeriod'), periodText]}
          right={[t('bill.payMethod'), order.payCurrency || order.currency]} divider />
      </div>
    </Modal>
  )
}

function Field({ label, children, token }: { label: string; children: React.ReactNode; token: { colorTextSecondary: string } }) {
  return (
    <div>
      <span style={{ color: token.colorTextSecondary }}>{label}: </span>
      <span>{children}</span>
    </div>
  )
}

// 网格行(左右各一对 标签/值)
function GridRow({ left, right, token, divider }: {
  left: [string, React.ReactNode]; right: [string, React.ReactNode]
  token: { colorTextSecondary: string; colorBorderSecondary: string; colorFillQuaternary: string }; divider?: boolean
}) {
  const cell: React.CSSProperties = { padding: '12px 16px', fontSize: 13 }
  const labelCell: React.CSSProperties = { ...cell, background: token.colorFillQuaternary, color: token.colorTextSecondary, width: 120 }
  const bt = divider ? `1px solid ${token.colorBorderSecondary}` : undefined
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 1fr', borderTop: bt }}>
      <div style={labelCell}>{left[0]}</div>
      <div style={cell}>{left[1]}</div>
      <div style={{ ...labelCell, borderLeft: `1px solid ${token.colorBorderSecondary}` }}>{right[0]}</div>
      <div style={cell}>{right[1]}</div>
    </div>
  )
}
