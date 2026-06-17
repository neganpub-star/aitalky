import { useEffect, useRef, useState } from 'react'
import {
  Modal, InputNumber, Radio, Checkbox, Button, QRCode, Typography, Divider, Spin, message, theme,
} from 'antd'
import { CheckCircleFilled, CopyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  listCoins, getPricing, createOrder, getAddress, getPendingOrder, getWallet, payOrder, cancelOrder,
  type PlanVO, type CoinVO, type OrderVO, type RechargeAddressVO,
} from '../../api/billing'

interface Props {
  open: boolean
  plan: PlanVO | null
  onClose: () => void
  onSuccess: () => void
}

// 倒计时秒 → HH:MM:SS
function fmtCountdown(sec: number): string {
  if (sec <= 0) return '00:00:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(s)}`
}

// 下单弹窗。配置态(对齐图5):周期+席位加购+选网络+合计+协议;待支付态(对齐图3):金额+24h倒计时+二维码+收款地址+订单号+取消。
// 闭环:项目每链固定地址,转订单金额→Coinly回调入账→自动核销该唯一待支付订单;余额够也可手动核销。
export default function SubscribeModal({ open, plan, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()

  const [coins, setCoins] = useState<CoinVO[]>([])
  const [seatPrice, setSeatPrice] = useState(0)
  const [months, setMonths] = useState(6)
  const [seatsTotal, setSeatsTotal] = useState(0)
  const [currency, setCurrency] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 待支付态
  const [order, setOrder] = useState<OrderVO | null>(null)
  const [addr, setAddr] = useState<RechargeAddressVO | null>(null)
  const [balance, setBalance] = useState(0)
  const [paid, setPaid] = useState(false)
  const [remain, setRemain] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const minMonths = plan?.minMonths || 6
  // 套餐自带席位(配额);加购=订阅席位总数 - 自带
  const baseSeat = plan?.quotas.find((q) => q.resourceType === 'seat')?.amount || 0
  const addonSeats = Math.max(0, seatsTotal - baseSeat)

  useEffect(() => {
    if (!open || !plan) return
    setMonths(Math.max(minMonths, 6))
    setSeatsTotal(baseSeat)
    setAgreed(false)
    setOrder(null)
    setAddr(null)
    setPaid(false)
    listCoins().then((cs) => { setCoins(cs); setCurrency(cs[0]?.currency || '') }).catch(() => undefined)
    getPricing().then((p) => setSeatPrice(Number(p.seatMonthlyPrice))).catch(() => undefined)
    getWallet().then((w) => setBalance(Number(w.balance))).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan?.id])

  const stopAll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }
  useEffect(() => () => stopAll(), [])

  if (!plan) return null

  const planName = (() => { const k = `bill.plan.${plan.code}`; const l = t(k); return l === k ? plan.name : l })()
  // 合计 = 套餐月价×月数 + 加购席位×席位月价×月数
  const total = Number(plan.monthlyPrice) * months + addonSeats * seatPrice * months
  const expireDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1 + months * 30)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 00:00`
  })()

  const startWatch = (o: OrderVO) => {
    stopAll()
    // 倒计时(从订单过期时间)
    const calc = () => {
      if (!o.expireTime) { setRemain(0); return }
      const left = Math.floor((new Date(o.expireTime).getTime() - Date.now()) / 1000)
      setRemain(left > 0 ? left : 0)
    }
    calc()
    tickRef.current = setInterval(calc, 1000)
    // 轮询到账:pendingOrder 变 null(被核销)即开通成功
    pollRef.current = setInterval(async () => {
      try {
        const pending = await getPendingOrder()
        if (!pending || pending.id !== o.id) { stopAll(); setPaid(true); onSuccess() }
      } catch { /* 抖动忽略 */ }
    }, 5000)
  }

  const submit = async () => {
    if (!agreed) { message.warning(t('bill.mustAgree')); return }
    if (!currency) { message.warning(t('bill.selectNetwork')); return }
    setSubmitting(true)
    try {
      const o = await createOrder({ planId: plan.id, months, seats: addonSeats })
      const a = await getAddress(currency)
      setOrder(o); setAddr(a); startWatch(o)
      getWallet().then((w) => setBalance(Number(w.balance))).catch(() => undefined)
    } catch { /* 全局拦截器提示 */ } finally { setSubmitting(false) }
  }

  const payByBalance = async () => {
    if (!order) return
    setSubmitting(true)
    try { await payOrder(order.id); stopAll(); setPaid(true); onSuccess() }
    catch { /* 全局提示 */ } finally { setSubmitting(false) }
  }

  const doCancel = async () => {
    if (!order) return
    try { await cancelOrder(order.id) } catch { /* ignore */ }
    stopAll(); onSuccess(); onClose()
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => message.success(t('bill.copied'))).catch(() => undefined)
  }
  const close = () => { stopAll(); onClose() }

  const title = paid ? t('bill.paySuccess') : order ? t('bill.payPending') : t('bill.subscribeTitle')

  return (
    <Modal open={open} onCancel={close} footer={null} width={order && !paid ? 560 : 720} destroyOnClose title={title}>
      {paid ? (
        // 开通成功
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleFilled style={{ fontSize: 56, color: token.colorSuccess }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>{t('bill.paySuccess')}</div>
          <Button type="primary" style={{ marginTop: 24 }} onClick={close}>{t('bill.ok')}</Button>
        </div>
      ) : !order ? (
        // ===== 配置态(图5) =====
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ width: 230, flexShrink: 0, background: token.colorFillQuaternary, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{planName}</div>
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 10 }}>{t('bill.planService')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {plan.features.map((f) => {
                const k = `bill.feat.${f}`; const l = t(k)
                return (
                  <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleFilled style={{ color: token.colorPrimary, fontSize: 12 }} />{l === k ? f : l}
                  </span>
                )
              })}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <FieldRow label={t('bill.subPeriod')} token={token}>
              <InputNumber min={minMonths} max={120} value={months} style={{ width: 160 }}
                addonAfter={t('bill.months')} onChange={(v) => setMonths(Number(v) || minMonths)} />
            </FieldRow>
            <FieldRow label={t('bill.expireTime')} token={token}>
              <span>{expireDate}</span>
            </FieldRow>
            <FieldRow label={t('bill.subSeats')} token={token}
              hint={seatPrice > 0 ? t('bill.seatsTip', { base: baseSeat, price: seatPrice }) : undefined}>
              <InputNumber min={baseSeat} max={9999} value={seatsTotal} style={{ width: 160 }}
                onChange={(v) => setSeatsTotal(Number(v) || baseSeat)} />
            </FieldRow>
            <FieldRow label={t('bill.payMethod')} token={token}>
              <span style={{ color: token.colorSuccess, fontWeight: 600 }}>● {t('bill.payUsdt')}</span>
            </FieldRow>
            <FieldRow label={t('bill.selectNetwork')} token={token}>
              <Radio.Group value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {coins.map((c) => <Radio key={c.currency} value={c.currency}>{c.currency}</Radio>)}
              </Radio.Group>
            </FieldRow>

            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: token.colorTextSecondary }}>{t('bill.total')}</span>
              <span style={{ fontSize: 24, fontWeight: 700 }}>${total.toFixed(2)}</span>
            </div>

            <Button type="primary" block size="large" loading={submitting} style={{ marginTop: 16 }} onClick={submit}>
              {t('bill.submitOrder')}
            </Button>
            <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 14, fontSize: 13 }}>
              {t('bill.agree')} <Typography.Link>{t('bill.protocol')}</Typography.Link>
            </Checkbox>
          </div>
        </div>
      ) : (
        // ===== 待支付态(图3) =====
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: token.colorTextSecondary }}>{t('bill.payAmount')}</div>
          <div style={{ fontSize: 30, fontWeight: 700, margin: '6px 0' }}>
            $ {order.amount}
            <CopyOutlined style={{ fontSize: 16, marginLeft: 10, cursor: 'pointer', color: token.colorTextTertiary }} onClick={() => copy(String(order.amount))} />
          </div>
          <div style={{ display: 'inline-block', background: token.colorFillQuaternary, borderRadius: 16, padding: '4px 16px', fontSize: 13 }}>
            {t('bill.remainTime')}: <span style={{ color: token.colorError, fontWeight: 600 }}>{fmtCountdown(remain)}</span>
          </div>

          <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
            {addr?.address ? <QRCode value={addr.address} size={180} bordered={false} /> : <Spin />}
          </div>

          <div style={{ textAlign: 'left', maxWidth: 460, margin: '0 auto' }}>
            <InfoRow label={t('bill.receiveAddr')} token={token}
              value={<span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{addr?.address || '...'}</span>}
              onCopy={() => addr && copy(addr.address)} />
            <InfoRow label={t('bill.payMethod')} token={token} value={addr?.currency || currency} />
            <InfoRow label={t('bill.orderNo')} token={token} value={order.orderNo} onCopy={() => copy(order.orderNo)} />
          </div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 10, maxWidth: 460, marginInline: 'auto' }}>
            {t('bill.payDelayTip')}
          </div>

          {balance >= order.amount && (
            <Button type="primary" style={{ marginTop: 16 }} loading={submitting} onClick={payByBalance}>
              {t('bill.payByBalance')} ({t('bill.balance')}: {balance})
            </Button>
          )}
          <div style={{ marginTop: 16 }}>
            <Button onClick={doCancel}>{t('bill.cancelOrder')}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// 配置态字段行(左标签右控件 + 可选提示)
function FieldRow({ label, children, hint, token }: {
  label: string; children: React.ReactNode; hint?: string; token: { colorTextSecondary: string; colorTextTertiary: string }
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0' }}>
      <span style={{ fontSize: 14, color: token.colorTextSecondary, paddingTop: 4 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        {children}
        {hint && <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>{hint}</div>}
      </div>
    </div>
  )
}

// 待支付态信息行
function InfoRow({ label, value, token, onCopy }: {
  label: string; value: React.ReactNode; token: { colorTextSecondary: string }; onCopy?: () => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13 }}>
      <span style={{ color: token.colorTextSecondary, flexShrink: 0 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, textAlign: 'right' }}>
        {value}
        {onCopy && <CopyOutlined style={{ cursor: 'pointer', flexShrink: 0 }} onClick={onCopy} />}
      </span>
    </div>
  )
}
