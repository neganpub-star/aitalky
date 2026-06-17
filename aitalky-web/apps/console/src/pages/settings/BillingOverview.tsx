import { useEffect, useState } from 'react'
import { Button, Empty, Tag, theme } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getOverview, type BillingOverviewVO } from '../../api/billing'

function fmtTime(s: string | null): string {
  if (!s) return '--'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '--'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 数据管理 → 服务订阅 → 概览(对齐 ByteTrack img-66):资源用量 + 套餐卡。
// 已用量(used)第⑤期接真实数据,本期展示套餐配额总量。
export default function BillingOverview() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const [data, setData] = useState<BillingOverviewVO | null>(null)

  useEffect(() => { getOverview().then(setData).catch(() => undefined) }, [])

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
          {data.quotas.map((q) => (
            <div key={q.resourceType} style={{ flex: '1 1 220px', minWidth: 200, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 14, color: token.colorTextSecondary }}>{resLabel(q.resourceType)}</div>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 4px' }}>
                {q.isUnlimited ? t('bill.unlimited') : Number(q.amount)}
              </div>
              <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{t('bill.usedTotal')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右:套餐卡 */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ borderRadius: 12, padding: 20, background: token.colorPrimaryBg, border: `1px solid ${token.colorPrimaryBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: token.colorPrimary }}>{data.planName}</span>
            {data.expired
              ? <Tag color="error">{t('bill.expired')}</Tag>
              : <Tag color="processing">{t('bill.subscribe')}中</Tag>}
          </div>
          <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 8 }}>
            {t('bill.expireTime')}: {fmtTime(data.expireTime)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '18px 0 10px' }}>{t('bill.planService')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.features.map((f) => (
              <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <CheckOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />{featLabel(f)}
              </span>
            ))}
          </div>
          <Button type="primary" block style={{ marginTop: 20 }} onClick={() => nav('/settings/billing/plans')}>
            {t('bill.renewUpgrade')}
          </Button>
        </div>
      </div>
    </div>
  )
}
