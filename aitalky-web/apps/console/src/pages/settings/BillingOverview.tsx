import { useEffect, useState } from 'react'
import { Button, Empty, Tag, theme } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getOverview, getUsage, type BillingOverviewVO, type UsageVO } from '../../api/billing'

function fmtTime(s: string | null): string {
  if (!s) return '--'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '--'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 数据管理 → 服务订阅 → 概览(对齐图1):左侧资源用量卡(席位/客户 已用/总量,真实计量) + 右侧渐变套餐卡。
// MVP 资源只放 aitalky 现有的 seat/customer;扩展服务(翻译/Tokens 等未做)不上。
export default function BillingOverview() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const [data, setData] = useState<BillingOverviewVO | null>(null)
  const [usage, setUsage] = useState<UsageVO[]>([])

  useEffect(() => {
    getOverview().then(setData).catch(() => undefined)
    getUsage().then(setUsage).catch(() => undefined)
  }, [])

  const featLabel = (code: string) => { const k = `bill.feat.${code}`; const l = t(k); return l === k ? code : l }
  const resLabel = (type: string) => { const k = `bill.res.${type}`; const l = t(k); return l === k ? type : l }

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
      {/* 左:资源用量 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('bill.overview')}</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{t('bill.resourceUsage')}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {usage.map((u) => (
            <div key={u.resourceType} style={{ flex: '1 1 240px', minWidth: 220, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 14, color: token.colorTextSecondary }}>{resLabel(u.resourceType)}</div>
              <div style={{ fontSize: 26, fontWeight: 700, margin: '10px 0 4px' }}>
                {u.used} <span style={{ color: token.colorTextQuaternary, fontWeight: 400 }}>/ {u.unlimited ? t('bill.unlimited') : u.limit}</span>
              </div>
              <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{t('bill.usedTotal')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右:渐变套餐卡 */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{
          borderRadius: 14, padding: 22, color: '#fff',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 60%, #1e3a8a 100%)',
          boxShadow: '0 8px 24px rgba(29,78,216,0.25)',
        }}>
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
    </div>
  )
}
