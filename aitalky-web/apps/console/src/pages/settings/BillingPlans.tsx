import { useEffect, useState } from 'react'
import { Button, Modal, Tag, message, theme } from 'antd'
import { CheckOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { listPlans, getOverview, getPendingOrder, type PlanVO, type OrderVO } from '../../api/billing'
import SubscribeModal from './SubscribeModal'
import PendingPayModal from './PendingPayModal'

// 套餐档位顶部彩色条(对齐 aitalky:档位越高色越突出)
const LEVEL_COLORS = ['#9aa0a6', '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#8c6e4a']
// 带配额数的功能(公网文章/应用站点):展示 [N] 或 :无限,数量取自套餐配额
const QUOTA_FEATURES = ['article', 'site']
// 功能徽章(对齐参考:数字员工=AI 紫,客户洞察/自动营销=New 橙)
const FEATURE_BADGE: Record<string, { text: string; color: string }> = {
  ai_employee: { text: 'AI', color: '#722ed1' },
  insight: { text: 'New', color: '#fa8c16' },
  marketing: { text: 'New', color: '#fa8c16' },
}

// 数据管理 → 服务订阅 → 套餐订阅:套餐卡片(对齐 aitalky img-64);只展示现有功能,下单弹窗见第③期
export default function BillingPlans() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [modal, modalCtx] = Modal.useModal()
  const [plans, setPlans] = useState<PlanVO[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [subPlan, setSubPlan] = useState<PlanVO | null>(null)  // 下单弹窗当前套餐
  const [payOrder, setPayOrder] = useState<OrderVO | null>(null)  // 待处理的已有待支付订单

  const loadCurrent = () =>
    getOverview().then((o) => setCurrentPlanId(o.subscribed ? o.planId : null)).catch(() => undefined)
  useEffect(() => {
    // 按档位升序(基础→标准→专业→旗舰→定制)
    listPlans().then((ps) => setPlans([...ps].sort((a, b) => a.level - b.level))).catch(() => undefined)
    loadCurrent()
  }, [])

  // 订阅/续费/升级:定制版走联系客服(暂提示);已有待支付订单则提示去处理(对齐现网);否则打开下单弹窗
  const onSubscribe = async (p: PlanVO) => {
    if (p.isCustom) { message.info(t('settings.wip')); return }
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
    setSubPlan(p)
  }

  // 套餐名按 code 走 i18n(后端 name 为中文,英文环境需本地化);无对应 key 回退后端 name
  const planName = (p: PlanVO) => { const k = `bill.plan.${p.code}`; const l = t(k); return l === k ? p.name : l }
  // 功能码→标签走 i18n(bill.feat.*),未知码原样
  const featLabel = (code: string) => {
    const k = `bill.feat.${code}`
    const label = t(k)
    return label === k ? code : label
  }
  // 带配额数的功能(公网文章/应用站点)后缀:[N] 或 :无限
  const quotaSuffix = (p: PlanVO, code: string) => {
    if (!QUOTA_FEATURES.includes(code)) return ''
    const q = p.quotas.find((x) => x.resourceType === code)
    if (!q) return ''
    return q.isUnlimited ? `: ${t('bill.unlimited')}` : `[${q.amount}]`
  }

  return (
    <div>
      {modalCtx}
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('bill.plans')}</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginTop: 80 }}>
        {plans.map((p) => {
          const isCurrent = currentPlanId === p.id
          const color = LEVEL_COLORS[p.level] || token.colorPrimary
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
                    onClick={() => onSubscribe(p)}>
                    {p.isCustom ? t('bill.customPrice') : isCurrent ? t('bill.renewUpgrade') : t('bill.subscribe')}
                  </Button>
                </div>
                {/* 套餐服务(列表左对齐) */}
                <div style={{ marginTop: 24, fontSize: 13, color: token.colorTextTertiary }}>{t('bill.planService')}</div>
                {/* 团队席位/翻译为单独购买,不在卡片功能项;公网文章/应用站点带配额数;数字员工/客户洞察/自动营销带徽章 */}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {p.features.map((f) => {
                    const badge = FEATURE_BADGE[f]
                    return (
                      <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                        <CheckOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
                        {featLabel(f)}{quotaSuffix(p, f)}
                        {badge && <Tag color={badge.color} style={{ margin: 0, lineHeight: '16px', fontSize: 11, padding: '0 5px' }}>{badge.text}</Tag>}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <SubscribeModal
        open={!!subPlan}
        plan={subPlan}
        onClose={() => setSubPlan(null)}
        onSuccess={() => { setSubPlan(null); loadCurrent() }}
      />
      {/* 去处理已有待支付订单 */}
      <PendingPayModal
        open={!!payOrder}
        order={payOrder}
        onClose={() => setPayOrder(null)}
        onDone={() => { setPayOrder(null); loadCurrent() }}
      />
    </div>
  )
}
