import { useEffect, useState } from 'react'
import { Button, message, theme } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { listPlans, getOverview, type PlanVO } from '../../api/billing'

// 套餐档位顶部彩色条(对齐 ByteTrack:档位越高色越突出)
const LEVEL_COLORS = ['#9aa0a6', '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#8c6e4a']

// 数据管理 → 服务订阅 → 套餐订阅:套餐卡片(对齐 ByteTrack img-64);只展示现有功能,下单弹窗见第③期
export default function BillingPlans() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [plans, setPlans] = useState<PlanVO[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)

  useEffect(() => {
    listPlans().then(setPlans).catch(() => undefined)
    getOverview().then((o) => setCurrentPlanId(o.subscribed ? o.planId : null)).catch(() => undefined)
  }, [])

  // 套餐名按 code 走 i18n(后端 name 为中文,英文环境需本地化);无对应 key 回退后端 name
  const planName = (p: PlanVO) => { const k = `bill.plan.${p.code}`; const l = t(k); return l === k ? p.name : l }
  // 席位数(套餐配额 seat);功能码→标签走 i18n(bill.feat.*),未知码原样
  const seatOf = (p: PlanVO) => p.quotas.find((q) => q.resourceType === 'seat')
  const featLabel = (code: string) => {
    const k = `bill.feat.${code}`
    const label = t(k)
    return label === k ? code : label
  }

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('bill.plans')}</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginTop: 80 }}>
        {plans.map((p) => {
          const isCurrent = currentPlanId === p.id
          const color = LEVEL_COLORS[p.level] || token.colorPrimary
          const seat = seatOf(p)
          return (
            <div key={p.id} className="plan-card" style={{
              position: 'relative', width: 300, minHeight: 560, borderRadius: 12, overflow: 'hidden',
              border: `1.5px solid ${isCurrent ? token.colorPrimary : token.colorBorder}`,
              boxShadow: isCurrent ? `0 0 0 1px ${token.colorPrimary}` : token.boxShadow,
            }}>
              {/* 顶部彩色条 */}
              <div style={{ height: 6, background: color }} />
              {/* 当前订阅角标 */}
              {isCurrent && (
                <div style={{ position: 'absolute', top: 16, right: -28, transform: 'rotate(45deg)', background: token.colorPrimary, color: '#fff', fontSize: 11, padding: '2px 30px' }}>
                  {t('bill.current')}
                </div>
              )}
              <div style={{ padding: '28px 24px' }}>
                {/* 头部:标题/副标题/价格/按钮 居中(对齐参考) */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{planName(p)}</div>
                  <div style={{ fontSize: 13, color: token.colorTextTertiary, marginTop: 6 }}>
                    {p.isCustom ? t('bill.customDeploy') : t('bill.minStart', { n: p.minMonths })}
                  </div>
                  {/* 价格 */}
                  <div style={{ margin: '20px 0' }}>
                    {p.isCustom ? (
                      <span style={{ fontSize: 30, fontWeight: 700, color: token.colorTextTertiary }}>{t('bill.customPrice')}</span>
                    ) : (
                      <><span style={{ fontSize: 40, fontWeight: 700 }}>${Number(p.monthlyPrice)}</span>
                        <span style={{ fontSize: 14, color: token.colorTextTertiary }}> {t('bill.perMonth')}</span></>
                    )}
                  </div>
                  {/* 订阅/续费按钮(下单弹窗第③期;本期占位提示) */}
                  <Button size="large" type={isCurrent ? 'primary' : 'default'} block
                    onClick={() => message.info(t('settings.wip'))}>
                    {p.isCustom ? t('bill.customPrice') : isCurrent ? t('bill.renewUpgrade') : t('bill.subscribe')}
                  </Button>
                </div>
                {/* 套餐服务(列表左对齐) */}
                <div style={{ marginTop: 24, fontSize: 13, color: token.colorTextTertiary }}>{t('bill.planService')}</div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {seat && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <CheckOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
                      {t('bill.res.seat')}: {seat.isUnlimited ? t('bill.unlimited') : seat.amount}
                    </span>
                  )}
                  {p.features.map((f) => (
                    <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <CheckOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
                      {featLabel(f)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
