import { useEffect, useRef, useState } from 'react'
import {
  Modal, InputNumber, Radio, Checkbox, Button, QRCode, Typography, Divider, Spin, Select, Space, message, theme,
} from 'antd'
import { CheckCircleFilled, CopyOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  listCoins, getPricing, createOrder, getAddress, getPendingOrder, getWallet, payOrder, cancelOrder, getUsage, getAddonQuote,
  type PlanVO, type CoinVO, type OrderVO, type RechargeAddressVO,
} from '../../api/billing'

// 订阅单可搭售的永久加量包(对齐参考弹窗:翻译包/AI Tokens包/客户扩展包)
// perKey=单价提示里「每包规格」描述(对齐参考:百万字符/百万Tokens/1000客户配额);unitKey=下拉数量单位
const PACK_DEFS = [
  { type: 'translate_char', labelKey: 'bill.translatePack', perKey: 'bill.perTranslate', unitKey: 'bill.unitChar', wan: true },
  { type: 'ai_tokens', labelKey: 'bill.tokensPackName', perKey: 'bill.perTokens', unitKey: 'bill.unitTokens', wan: true },
  { type: 'customer', labelKey: 'bill.customerPackName', perKey: 'bill.perCustomer', unitKey: 'bill.unitCustomer', wan: false },
] as const
// 配置态右侧控件统一宽度(步进器/下拉等宽,对齐参考)
const CTRL_W = 200
// 数量按「万」精简展示(100万字符,无空格对齐参考)
const fmtAmt = (n: number, wan: boolean) => (wan && n >= 10000 ? `${n / 10000}万` : String(n))
// 加量包可选档位(包数倍数,对齐参考:100万/200万/500万/1000万/5000万)
const PACK_MULTIPLES = [1, 2, 5, 10, 50]

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
  // 席位下限:续费时=当前总席位(已购席位不能减),新订阅=套餐自带
  const [seatFloor, setSeatFloor] = useState(0)
  const [currency, setCurrency] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // 搭售加量包:单价/规格(来自报价)+ 已选份数
  const [packMeta, setPackMeta] = useState<Record<string, { price: number; spec: number }>>({})
  const [packCounts, setPackCounts] = useState<Record<string, number>>({})

  // 待支付态
  const [order, setOrder] = useState<OrderVO | null>(null)
  const [addr, setAddr] = useState<RechargeAddressVO | null>(null)
  const [balance, setBalance] = useState(0)
  const [paid, setPaid] = useState(false)
  const [remain, setRemain] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const minMonths = plan?.minMonths || 6
  // 套餐自带席位(配额,后端 Long 序列化为字符串需 Number);加购=订阅席位总数 - 自带
  const baseSeat = Number(plan?.quotas.find((q) => q.resourceType === 'seat')?.amount) || 0
  const addonSeats = Math.max(0, Number(seatsTotal) - baseSeat)

  useEffect(() => {
    if (!open || !plan) return
    setMonths(Math.max(minMonths, 6))
    setSeatsTotal(baseSeat)
    setSeatFloor(baseSeat)
    setAgreed(false)
    setOrder(null)
    setAddr(null)
    setPaid(false)
    setPackCounts({})
    // 拉三个加量包报价(单价/每包规格),供搭售下拉与合计
    PACK_DEFS.forEach((d) => {
      getAddonQuote(d.type).then((q) => {
        setPackMeta((m) => ({ ...m, [d.type]: { price: Number(q.unitPrice) || 0, spec: Number(q.packAmount) || 0 } }))
      }).catch(() => undefined)
    })
    listCoins().then((cs) => { setCoins(cs); setCurrency(cs[0]?.currency || '') }).catch(() => undefined)
    getPricing().then((p) => setSeatPrice(Number(p.seatMonthlyPrice))).catch(() => undefined)
    getWallet().then((w) => setBalance(Number(w.balance))).catch(() => undefined)
    // 续费/升级:默认带出当前总席位(套餐自带+已加购),避免续费时把加购席位丢掉(对齐参考)
    getUsage().then((us) => {
      const seat = us.find((u) => u.resourceType === 'seat')
      if (seat && !seat.unlimited && Number(seat.limit) > baseSeat) {
        setSeatsTotal(Number(seat.limit))
        setSeatFloor(Number(seat.limit))  // 续费下限=当前总席位,不能往下减
      }
    }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan?.id])

  const stopAll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }
  useEffect(() => () => stopAll(), [])

  if (!plan) return null

  const planName = (() => { const k = `bill.plan.${plan.code}`; const l = t(k); return l === k ? plan.name : l })()
  // 合计 = 套餐月价×月数 + 加购席位×席位月价×月数 + 搭售加量包(一次性:份数×每包价)
  const packsTotal = PACK_DEFS.reduce((sum, d) => sum + (packCounts[d.type] || 0) * (packMeta[d.type]?.price || 0), 0)
  const total = Number(plan.monthlyPrice) * months + addonSeats * seatPrice * months + packsTotal
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
      const packs: Record<string, number> = {}
      PACK_DEFS.forEach((d) => { if ((packCounts[d.type] || 0) > 0) packs[d.type] = packCounts[d.type] })
      const o = await createOrder({ planId: plan.id, months, seats: addonSeats, currency, packs })
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
    <Modal open={open} onCancel={close} footer={null} width={order && !paid ? 560 : 800} destroyOnClose
      title={paid || order ? title : undefined}>
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
            {/* 套餐名与服务列表间的分割线(对齐参考) */}
            <div style={{ height: 1, background: token.colorBorder, margin: '0 0 16px' }} />
            <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 10 }}>{t('bill.planService')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {plan.features.map((f) => {
                const k = `bill.feat.${f}`; const l = t(k)
                // 带配额数的功能(公网文章/应用站点)拼上数量 [N](对齐参考)
                const q = ['article', 'site'].includes(f) ? plan.quotas.find((x) => x.resourceType === f) : undefined
                const sfx = q ? `[${q.isUnlimited === 1 ? t('bill.unlimited') : Number(q.amount)}]` : ''
                return (
                  <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: token.colorPrimary, flexShrink: 0 }} />
                    {l === k ? f : l}{sfx}
                  </span>
                )
              })}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 标题放右侧表单区顶部(对齐参考:左侧灰面板从顶端独立开始) */}
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>{t('bill.subscribeTitle')}</div>
            <FieldRow label={t('bill.subPeriod')} token={token}>
              <Stepper value={months} min={minMonths} max={120} onChange={setMonths} />
            </FieldRow>
            <FieldRow label={t('bill.expireTime')} token={token}>
              <span>{expireDate}</span>
            </FieldRow>
            <FieldRow label={t('bill.subSeats')} token={token}
              hint={seatPrice > 0 ? t('bill.seatsTip', { base: baseSeat, price: seatPrice }) : undefined}>
              <Stepper value={seatsTotal} min={seatFloor} max={9999} onChange={setSeatsTotal} />
            </FieldRow>
            {/* 搭售加量包(对齐参考:翻译/AI Tokens/客户扩展,选份数,合计实时累加) */}
            {PACK_DEFS.map((d) => {
              const meta = packMeta[d.type]
              return (
                <FieldRow key={d.type} label={t(d.labelKey)} token={token}
                  hint={meta ? `$${meta.price}/${t(d.perKey)}` : undefined}>
                  {/* 左对齐容器:抵消 FieldRow 右列的 textAlign:right,让「请选择」靠左(对齐参考) */}
                  <div style={{ textAlign: 'left' }}>
                    <Select size="large" style={{ width: CTRL_W }} allowClear placeholder={t('bill.choose')}
                      value={packCounts[d.type] || undefined}
                      onChange={(v) => setPackCounts((c) => ({ ...c, [d.type]: Number(v) || 0 }))}
                      options={PACK_MULTIPLES.map((n) => ({
                        value: n, label: `${fmtAmt(meta ? meta.spec * n : 0, d.wan)}${t(d.unitKey)}`,
                      }))} />
                  </div>
                </FieldRow>
              )
            })}
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

// 数字步进器(− 数字 +,对齐参考样式)
function Stepper({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (v: number) => void
}) {
  // value/min/max 可能是后端 Long 序列化的字符串,强制转数字(否则 "1"+1 拼成 "11")
  const v = Number(value) || 0
  const lo = Number(min) || 0
  const hi = Number(max)
  const clamp = (x: number) => Math.min(hi, Math.max(lo, x))
  return (
    <Space.Compact style={{ width: CTRL_W }}>
      <Button size="large" style={{ width: 40, flexShrink: 0 }} icon={<MinusOutlined />} disabled={v <= lo} onClick={() => onChange(clamp(v - 1))} />
      <InputNumber size="large" min={lo} max={hi} value={v} controls={false} className="sub-stepper-num"
        style={{ flex: 1, width: '100%' }}
        onChange={(n) => onChange(clamp(Number(n) || lo))} />
      <Button size="large" style={{ width: 40, flexShrink: 0 }} icon={<PlusOutlined />} disabled={v >= hi} onClick={() => onChange(clamp(v + 1))} />
    </Space.Compact>
  )
}

// 配置态字段行(左标签右控件 + 可选提示)
function FieldRow({ label, children, hint, token }: {
  label: string; children: React.ReactNode; hint?: string; token: { colorTextSecondary: string; colorTextTertiary: string }
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0' }}>
      {/* 提示在标签下方(对齐参考),控件靠右 */}
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 14, color: token.colorTextSecondary }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>{hint}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>{children}</div>
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
