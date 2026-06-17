import { useEffect, useRef, useState } from 'react'
import {
  Modal, InputNumber, Radio, Checkbox, Button, QRCode, Typography, Divider, Spin, message, theme,
} from 'antd'
import { CheckCircleFilled, CopyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  listCoins, getAddonQuote, createAddonOrder, getAddress, getPendingOrder, getWallet, payOrder, cancelOrder,
  type CoinVO, type OrderVO, type RechargeAddressVO, type AddonQuoteVO,
} from '../../api/billing'

interface Props {
  open: boolean
  resourceType: 'seat' | 'customer' | null  // 加购类型
  onClose: () => void
  onSuccess: () => void  // 开通成功后刷新概览
}

// 一个月按 30 天(与后端 DAYS_PER_MONTH 对齐)
const DAYS_PER_MONTH = 30

function fmtCountdown(sec: number): string {
  if (sec <= 0) return '00:00:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(s)}`
}

function fmtDate(s: string | null): string {
  if (!s) return '--'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '--'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 加购弹窗(对齐现网"增加席位" img_1):席位=按剩余周期折算计价(只加席位不改到期);客户配额=永久配额包。
// 配置态:数量+(席位:周期/到期)+选网络+合计+协议;提交后转待支付态(金额+24h倒计时+二维码+收款地址+取消)。
export default function AddonModal({ open, resourceType, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()

  const [coins, setCoins] = useState<CoinVO[]>([])
  const [quote, setQuote] = useState<AddonQuoteVO | null>(null)
  const [qty, setQty] = useState(1)
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

  const stopAll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }
  useEffect(() => () => stopAll(), [])

  useEffect(() => {
    if (!open || !resourceType) return
    setQty(1); setAgreed(false); setOrder(null); setAddr(null); setPaid(false)
    listCoins().then((cs) => { setCoins(cs); setCurrency(cs[0]?.currency || '') }).catch(() => undefined)
    getAddonQuote(resourceType).then(setQuote).catch(() => undefined)
    getWallet().then((w) => setBalance(Number(w.balance))).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resourceType])

  if (!resourceType) return null

  const isSeat = resourceType === 'seat'
  // 合计:席位=单价×数量×剩余天/30;客户配额=每包价×包数
  const total = (() => {
    if (!quote) return 0
    if (isSeat) {
      const days = quote.remainingDays || 0
      return quote.unitPrice * qty * days / DAYS_PER_MONTH
    }
    return quote.unitPrice * qty
  })()
  const quotaAdded = quote ? quote.packAmount * qty : 0  // 客户配额新增数量

  const startWatch = (o: OrderVO) => {
    stopAll()
    const calc = () => {
      if (!o.expireTime) { setRemain(0); return }
      const left = Math.floor((new Date(o.expireTime).getTime() - Date.now()) / 1000)
      setRemain(left > 0 ? left : 0)
    }
    calc()
    tickRef.current = setInterval(calc, 1000)
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
      const o = await createAddonOrder({ resourceType, quantity: qty })
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

  const title = paid
    ? t('bill.paySuccess')
    : order
      ? t('bill.payPending')
      : isSeat ? t('bill.addSeats') : t('bill.buyCustomerQuota')

  return (
    <Modal open={open} onCancel={close} footer={null} width={order && !paid ? 560 : 520} destroyOnClose title={title}>
      {paid ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleFilled style={{ fontSize: 56, color: token.colorSuccess }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>{t('bill.paySuccess')}</div>
          <Button type="primary" style={{ marginTop: 24 }} onClick={close}>{t('bill.ok')}</Button>
        </div>
      ) : !order ? (
        // ===== 配置态(对齐现网 img_1) =====
        <div>
          <FieldRow label={isSeat ? t('bill.subSeats') : t('bill.buyQty')} token={token}>
            <InputNumber min={1} max={9999} value={qty} style={{ width: 160 }}
              onChange={(v) => setQty(Number(v) || 1)} />
          </FieldRow>
          {isSeat ? (
            <>
              <FieldRow label={t('bill.subPeriod')} token={token}>
                <span>{quote ? t('bill.days', { n: quote.remainingDays || 0 }) : '--'}</span>
              </FieldRow>
              <FieldRow label={t('bill.expireTime')} token={token}>
                <span>{fmtDate(quote?.expireTime || null)}</span>
              </FieldRow>
            </>
          ) : (
            <FieldRow label={t('bill.quotaAdded')} token={token}>
              <span>{quotaAdded}</span>
            </FieldRow>
          )}
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
      ) : (
        // ===== 待支付态(对齐现网 img_5) =====
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

function FieldRow({ label, children, token }: {
  label: string; children: React.ReactNode; token: { colorTextSecondary: string }
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <span style={{ fontSize: 14, color: token.colorTextSecondary }}>{label}</span>
      <div style={{ textAlign: 'right' }}>{children}</div>
    </div>
  )
}

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
