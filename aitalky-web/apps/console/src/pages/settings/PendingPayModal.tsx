import { useEffect, useRef, useState } from 'react'
import { Modal, Radio, Button, QRCode, Spin, message, theme } from 'antd'
import { CheckCircleFilled, CopyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  listCoins, getAddress, getPendingOrder, getWallet, payOrder, cancelOrder,
  type CoinVO, type OrderVO, type RechargeAddressVO,
} from '../../api/billing'

interface Props {
  open: boolean
  order: OrderVO | null
  onClose: () => void
  onDone: () => void   // 支付完成/取消后刷新列表
}

function fmtCountdown(sec: number): string {
  if (sec <= 0) return '00:00:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(s)}`
}

// 继续支付已有待支付订单(订单记录/概览"去支付"用):选网络→取该链固定地址→二维码+倒计时+取消。
// 复用同一闭环:转账到账由 Coinly 回调自动核销;余额足也可手动核销。
export default function PendingPayModal({ open, order, onClose, onDone }: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [coins, setCoins] = useState<CoinVO[]>([])
  const [currency, setCurrency] = useState('')
  const [addr, setAddr] = useState<RechargeAddressVO | null>(null)
  const [balance, setBalance] = useState(0)
  const [paid, setPaid] = useState(false)
  const [remain, setRemain] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }
  useEffect(() => () => stopAll(), [])

  useEffect(() => {
    if (!open || !order) return
    setAddr(null); setPaid(false)
    listCoins().then((cs) => { setCoins(cs); setCurrency(cs[0]?.currency || '') }).catch(() => undefined)
    getWallet().then((w) => setBalance(Number(w.balance))).catch(() => undefined)
    // 倒计时 + 轮询到账
    const calc = () => {
      if (!order.expireTime) { setRemain(0); return }
      const left = Math.floor((new Date(order.expireTime).getTime() - Date.now()) / 1000)
      setRemain(left > 0 ? left : 0)
    }
    calc()
    stopAll()
    tickRef.current = setInterval(calc, 1000)
    pollRef.current = setInterval(async () => {
      try {
        const p = await getPendingOrder()
        if (!p || p.id !== order.id) { stopAll(); setPaid(true); onDone() }
      } catch { /* ignore */ }
    }, 5000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id])

  // 首次有币种时自动取地址。必须放在早返回之前,否则 order null→有值会改变 hooks 数量(Rendered more hooks 报错)
  useEffect(() => {
    if (open && order && currency && !addr) getAddress(currency).then(setAddr).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currency, order?.id])

  if (!order) return null

  const loadAddr = (cur: string) => {
    setCurrency(cur)
    getAddress(cur).then(setAddr).catch(() => undefined)
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => message.success(t('bill.copied'))).catch(() => undefined)
  }
  const payByBalance = async () => {
    setSubmitting(true)
    try { await payOrder(order.id); stopAll(); setPaid(true); onDone() }
    catch { /* ignore */ } finally { setSubmitting(false) }
  }
  const doCancel = async () => {
    try { await cancelOrder(order.id) } catch { /* ignore */ }
    stopAll(); onDone(); onClose()
  }
  const close = () => { stopAll(); onClose() }

  return (
    <Modal open={open} onCancel={close} footer={null} width={560} destroyOnClose
      title={paid ? t('bill.paySuccess') : t('bill.payPending')}>
      {paid ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleFilled style={{ fontSize: 56, color: token.colorSuccess }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 16 }}>{t('bill.paySuccess')}</div>
          <Button type="primary" style={{ marginTop: 24 }} onClick={close}>{t('bill.ok')}</Button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: token.colorTextSecondary }}>{t('bill.payAmount')}</div>
          <div style={{ fontSize: 30, fontWeight: 700, margin: '6px 0' }}>$ {order.amount}</div>
          <div style={{ display: 'inline-block', background: token.colorFillQuaternary, borderRadius: 16, padding: '4px 16px', fontSize: 13 }}>
            {t('bill.remainTime')}: <span style={{ color: token.colorError, fontWeight: 600 }}>{fmtCountdown(remain)}</span>
          </div>

          <div style={{ margin: '16px 0' }}>
            <Radio.Group value={currency} onChange={(e) => loadAddr(e.target.value)}>
              {coins.map((c) => <Radio.Button key={c.currency} value={c.currency}>{c.currency}</Radio.Button>)}
            </Radio.Group>
          </div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{addr?.address ? <QRCode value={addr.address} size={180} bordered={false} /> : <Spin />}</div>

          <div style={{ textAlign: 'left', maxWidth: 460, margin: '0 auto', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0' }}>
              <span style={{ color: token.colorTextSecondary, flexShrink: 0 }}>{t('bill.receiveAddr')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{addr?.address || '...'}</span>
                {addr && <CopyOutlined style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => copy(addr.address)} />}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0' }}>
              <span style={{ color: token.colorTextSecondary }}>{t('bill.orderNo')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{order.orderNo}
                <CopyOutlined style={{ cursor: 'pointer' }} onClick={() => copy(order.orderNo)} /></span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 10, maxWidth: 460, marginInline: 'auto' }}>
            {t('bill.payDelayTip')}
          </div>

          {balance >= order.amount && (
            <Button type="primary" style={{ marginTop: 16 }} loading={submitting} onClick={payByBalance}>
              {t('bill.payByBalance')} ({t('bill.balance')}: {balance})
            </Button>
          )}
          <div style={{ marginTop: 16 }}><Button onClick={doCancel}>{t('bill.cancelOrder')}</Button></div>
        </div>
      )}
    </Modal>
  )
}
