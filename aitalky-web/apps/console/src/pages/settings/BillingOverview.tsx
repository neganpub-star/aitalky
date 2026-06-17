import { useEffect, useState } from 'react'
import { Avatar, Button, Empty, Modal, Tag, message, theme } from 'antd'
import { CheckOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getOverview, getUsage, getPendingOrder,
  type BillingOverviewVO, type UsageVO, type OrderVO,
} from '../../api/billing'
import { useAppStore } from '../../store/useAppStore'
import AddonModal from './AddonModal'
import PendingPayModal from './PendingPayModal'

function fmtTime(s: string | null): string {
  if (!s) return '--'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '--'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 数据管理 → 服务订阅 → 概览(对齐现网 img.png):左侧资源用量卡(席位/客户 已用/总量,真实计量,可加购) + 右侧渐变套餐卡。
// MVP 资源只放 aitalky 现有的 seat/customer;扩展服务(翻译/AI Tokens 未做)不展示。
export default function BillingOverview() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [modal, modalCtx] = Modal.useModal()
  const nav = useNavigate()
  const projectName = useAppStore((s) => s.projectName)
  const projectLogo = useAppStore((s) => s.projectLogo)
  const projectId = useAppStore((s) => s.projectId)
  const projects = useAppStore((s) => s.projects)
  const appId = projects.find((p) => p.id === projectId)?.appId

  const [data, setData] = useState<BillingOverviewVO | null>(null)
  const [usage, setUsage] = useState<UsageVO[]>([])
  const [addonType, setAddonType] = useState<'seat' | 'customer' | null>(null)
  const [payOrder, setPayOrder] = useState<OrderVO | null>(null)

  const reload = () => {
    getOverview().then(setData).catch(() => undefined)
    getUsage().then(setUsage).catch(() => undefined)
  }
  useEffect(reload, [])

  const featLabel = (code: string) => { const k = `bill.feat.${code}`; const l = t(k); return l === k ? code : l }
  const resLabel = (type: string) => { const k = `bill.res.${type}`; const l = t(k); return l === k ? type : l }

  // 加购前置:无有效订阅不能加购;已有待支付订单则提示"去处理"(对齐现网 img_3),否则打开加购弹窗。
  const onBuy = async (type: 'seat' | 'customer') => {
    if (!data?.subscribed || data.expired) { message.warning(t('bill.subscribeFirst')); return }
    try {
      const pending = await getPendingOrder()
      if (pending) {
        modal.confirm({
          icon: <ExclamationCircleFilled style={{ color: token.colorWarning }} />,
          title: t('bill.warnTitle'),
          content: t('bill.hasPendingOrder'),
          okText: t('bill.goHandle'),
          cancelText: t('common.cancel'),
          onOk: () => setPayOrder(pending),
        })
        return
      }
    } catch { /* 查询失败按无待支付处理 */ }
    setAddonType(type)
  }

  if (!data) return null

  // 未订阅:空态 + 去订阅
  if (!data.subscribed) {
    return (
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('bill.overview')}</div>
        <Empty description={t('bill.notSubscribed')} style={{ paddingTop: 60 }}>
          <Button type="primary" onClick={() => nav('/settings/billing/plans')}>{t('bill.goSubscribe')}</Button>
        </Empty>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {modalCtx}
      {/* 左:资源用量 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('bill.overview')}</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{t('bill.resourceUsage')}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {usage.map((u) => {
            const buyable = u.resourceType === 'seat' || u.resourceType === 'customer'
            return (
              <div key={u.resourceType} style={{ flex: '1 1 240px', minWidth: 220, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 14, color: token.colorTextSecondary }}>{resLabel(u.resourceType)}</div>
                <div style={{ fontSize: 26, fontWeight: 700, margin: '10px 0 4px' }}>
                  {u.used} <span style={{ color: token.colorTextQuaternary, fontWeight: 400 }}>/ {u.unlimited ? t('bill.unlimited') : u.limit}</span>
                </div>
                <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{t('bill.usedTotal')}</div>
                {buyable && (
                  <Button size="small" style={{ marginTop: 14 }}
                    onClick={() => onBuy(u.resourceType as 'seat' | 'customer')}>
                    {u.resourceType === 'seat' ? t('bill.buySeats') : t('bill.buyCustomerQuota')}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 右:渐变套餐卡 */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{
          borderRadius: 14, padding: 22, color: '#fff',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 60%, #1e3a8a 100%)',
          boxShadow: '0 8px 24px rgba(29,78,216,0.25)',
        }}>
          {/* 项目信息(LOGO + 名称 + 项目ID) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Avatar shape="square" size={40} src={projectLogo || undefined} style={{ background: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
              {projectName?.[0] || 'A'}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{projectName || '--'}</div>
              {appId && <div style={{ fontSize: 12, opacity: 0.8 }}>{t('bill.projectId')}:{appId}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              {data.planCode && t(`bill.plan.${data.planCode}`) !== `bill.plan.${data.planCode}` ? t(`bill.plan.${data.planCode}`) : data.planName}
            </span>
            {data.expired
              ? <Tag color="error" style={{ margin: 0 }}>{t('bill.expired')}</Tag>
              : <Tag color="success" style={{ margin: 0 }}>{t('bill.subscribing')}</Tag>}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 10 }}>
            {t('bill.expireTime')}: {fmtTime(data.expireTime)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '20px 0 12px' }}>{t('bill.planService')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {data.features.map((f) => (
              <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <CheckOutlined style={{ fontSize: 12 }} />{featLabel(f)}
              </span>
            ))}
          </div>
          <Button block style={{ marginTop: 22, background: '#fff', color: '#1d4ed8', fontWeight: 600, border: 'none' }}
            onClick={() => nav('/settings/billing/plans')}>
            {t('bill.renewUpgrade')}
          </Button>
        </div>
      </div>

      {/* 加购弹窗(席位/客户配额) */}
      <AddonModal
        open={!!addonType}
        resourceType={addonType}
        onClose={() => setAddonType(null)}
        onSuccess={() => { setAddonType(null); reload() }}
      />
      {/* 去处理已有待支付订单 */}
      <PendingPayModal
        open={!!payOrder}
        order={payOrder}
        onClose={() => setPayOrder(null)}
        onDone={() => { setPayOrder(null); reload() }}
      />
    </div>
  )
}
