import { useEffect, useState } from 'react'
import { Avatar, Button, Modal, Tag, message, theme } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getOverview, getUsage, getPendingOrder, getPublicConfig,
  type BillingOverviewVO, type UsageVO, type OrderVO, type PublicConfigVO,
} from '../../api/billing'
import { useAppStore } from '../../store/useAppStore'
import AddonModal from './AddonModal'
import PendingPayModal from './PendingPayModal'
// 订阅卡渐变头装饰图(从参考系统提取:蓝渐变 + 3D 立方体 + 轨道环 + 底部波浪,已去文字)
import planDecor from '../../assets/plan-decor.png'

function fmtTime(s: string | null): string {
  if (!s) return '--'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '--'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
// 字符/Tokens 大数按「万」展示(对齐现网 95.59 万)
const fmtWan = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(2)} 万` : String(n))
// 带配额数的功能(公网文章/应用站点)+ 功能徽章(数字员工=AI 紫,客户洞察/自动营销=New 橙)
const QUOTA_FEATURES = ['article', 'site']
const FEATURE_BADGE: Record<string, { text: string; color: string }> = {
  ai_employee: { text: 'AI', color: '#722ed1' },
  insight: { text: 'New', color: '#fa8c16' },
  marketing: { text: 'New', color: '#fa8c16' },
}

// 数据管理 → 服务订阅 → 概览(对齐现网):资源用量(团队席位/公网文章/应用站点) + 扩展服务(翻译包/AI Tokens/客户拓展包) + 右侧渐变卡。
//  未订阅也展示:资源用量 0/0,扩展服务展示后管参数的默认免费额度,右卡「暂无订阅+立即订阅」。
//  真实可购买:席位 + 客户配额;其余为占位(功能未做),购买提示敬请期待。
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
  const [cfg, setCfg] = useState<PublicConfigVO | null>(null)
  const [addonType, setAddonType] = useState<'seat' | 'customer' | null>(null)
  const [payOrder, setPayOrder] = useState<OrderVO | null>(null)

  const reload = () => {
    getOverview().then(setData).catch(() => undefined)
    getUsage().then(setUsage).catch(() => undefined)
    getPublicConfig().then(setCfg).catch(() => undefined)
  }
  useEffect(reload, [])

  const featLabel = (code: string) => { const k = `bill.feat.${code}`; const l = t(k); return l === k ? code : l }
  const resLabel = (type: string) => { const k = `bill.res.${type}`; const l = t(k); return l === k ? type : l }

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
  const comingSoon = () => message.info(t('bill.comingSoon'))

  if (!data) return null
  const subscribed = data.subscribed

  // 配额总量(套餐 quotas;amount 是 Long 序列化字符串,Number 强转) / 真实用量(usage)
  const quotaMap: Record<string, { amount: number; unlimited: boolean }> = {}
  data.quotas.forEach((q) => { quotaMap[q.resourceType] = { amount: Number(q.amount || 0), unlimited: q.isUnlimited === 1 } })
  const usageMap: Record<string, UsageVO> = {}
  usage.forEach((u) => { usageMap[u.resourceType] = u })

  // 资源用量卡(已用/总量):未订阅一律 0/0;订阅后席位真实计量可购买,公网文章/应用站点占位
  const usageCard = (type: string, opts: { buyable?: boolean }) => {
    const u = usageMap[type]
    const q = quotaMap[type]
    const used = subscribed ? (u ? u.used : 0) : 0
    const unlimited = subscribed ? (u ? u.unlimited : !!q?.unlimited) : false
    const total = subscribed ? (u ? u.limit : (q?.amount ?? 0)) : 0
    return (
      <div key={type} style={{ flex: '1 1 240px', minWidth: 220, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, padding: '18px 20px' }}>
        <div style={{ fontSize: 14, color: token.colorTextSecondary }}>{resLabel(type)}</div>
        <div style={{ fontSize: 26, fontWeight: 700, margin: '10px 0 4px' }}>
          {used} <span style={{ color: token.colorTextQuaternary, fontWeight: 400 }}>/ {unlimited ? t('bill.unlimited') : total}</span>
        </div>
        <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{t('bill.usedTotal')}</div>
        {opts.buyable && subscribed && (
          <Button type="primary" ghost style={{ marginTop: 14 }} onClick={() => onBuy('seat')}>{t('bill.buySeats')}</Button>
        )}
      </div>
    )
  }

  // 扩展服务=拓展包模型(不走套餐配额/无限):不买只有「参数默认值」,买了再加上加购量。
  //  翻译/Tokens 功能未做→恒展示参数默认值;客户拓展包→真实计量(总量=默认值+加购,可用=总量-已用)。
  const extVals = (type: string, defaultVal: number, wan: boolean): { avail: string; total: string } => {
    const fmt = (n: number) => (wan ? fmtWan(n) : String(n))
    if (type === 'customer') {
      const u = usageMap.customer
      const total = u ? u.limit : defaultVal     // 后端 usage 给「默认值+加购」
      const used = u ? u.used : 0
      return { avail: fmt(Math.max(0, total - used)), total: fmt(total) }
    }
    const txt = fmt(defaultVal)                    // 翻译/Tokens:恒默认值
    return { avail: txt, total: txt }
  }

  const extCard = (cfgItem: { type: string; title: string; unit: string; buyLabel: string; onClick: () => void; defaultVal: number; wan?: boolean }) => {
    const { avail, total } = extVals(cfgItem.type, cfgItem.defaultVal, !!cfgItem.wan)
    const big = { fontSize: 26, fontWeight: 700 as const }
    const sub = { fontSize: 12, color: token.colorTextTertiary }
    return (
      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, padding: '18px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: token.colorTextSecondary, marginBottom: 12 }}>{cfgItem.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 64 }}>
            <div><div style={big}>{avail}</div><div style={sub}>{t('bill.avail')}({cfgItem.unit})</div></div>
            <div><div style={big}>{total}</div><div style={sub}>{t('bill.totalQty')}({cfgItem.unit})</div></div>
          </div>
          <Button type="primary" ghost onClick={cfgItem.onClick}>{cfgItem.buyLabel}</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {modalCtx}
      {/* 左:资源用量 + 扩展服务 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('bill.overview')}</div>

        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{t('bill.resourceUsage')}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {usageCard('seat', { buyable: true })}
          {usageCard('article', {})}
          {usageCard('site', {})}
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, margin: '28px 0 14px' }}>{t('bill.extServices')}</div>
        {extCard({ type: 'translate_char', title: t('bill.translatePack'), unit: t('bill.unitChar'), buyLabel: t('bill.buyTranslate'), onClick: comingSoon, defaultVal: cfg?.defaultTranslateChar ?? 200, wan: true })}
        {extCard({ type: 'ai_tokens', title: t('bill.tokensQuota'), unit: t('bill.unitTokens'), buyLabel: t('bill.buyTokens'), onClick: comingSoon, defaultVal: cfg?.defaultAiTokens ?? 4000, wan: true })}
        {extCard({ type: 'customer', title: t('bill.customerPack'), unit: t('bill.unitCustomer'), buyLabel: t('bill.buyCustomerQuota'), onClick: () => onBuy('customer'), defaultVal: cfg?.defaultCustomer ?? 100 })}
      </div>

      {/* 右:套餐卡(对齐参考:灰底面板 + 项目头 + 白底卡[蓝渐变头 + 套餐服务圆点列表 + 续费按钮]) */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ background: token.colorFillQuaternary, borderRadius: 12, padding: 16 }}>
          {/* 项目信息(LOGO + 名称 + 项目ID),深色文字在灰底上 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Avatar shape="square" size={40} src={projectLogo || undefined} style={{ flexShrink: 0 }}>
              {projectName?.[0] || 'A'}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: token.colorText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{projectName || '--'}</div>
              {appId && <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{t('bill.projectId')}:{appId}</div>}
            </div>
          </div>

          {/* 白底卡 */}
          <div style={{ borderRadius: 12, overflow: 'hidden', background: token.colorBgContainer, boxShadow: token.boxShadowTertiary }}>
            {subscribed ? (
              <>
                {/* 蓝渐变头(背景=参考装饰图,文字叠加在左) */}
                <div style={{ position: 'relative', backgroundImage: `url(${planDecor})`, backgroundSize: 'cover', backgroundPosition: 'right top', backgroundRepeat: 'no-repeat', color: '#fff', padding: '16px 18px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>
                      {data.planCode && t(`bill.plan.${data.planCode}`) !== `bill.plan.${data.planCode}` ? t(`bill.plan.${data.planCode}`) : data.planName}
                    </span>
                    <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: data.expired ? 'rgba(255,80,80,0.9)' : 'rgba(255,255,255,0.25)' }}>
                      {data.expired ? t('bill.expired') : t('bill.subscribing')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 10 }}>
                    {t('bill.expireTime')}: {fmtTime(data.expireTime)}
                  </div>
                </div>
                {/* 白底:套餐服务列表(圆点 + 徽章,团队席位[N] 首项) */}
                <div style={{ padding: '16px 18px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: token.colorTextSecondary, marginBottom: 12 }}>{t('bill.planService')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {quotaMap.seat && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: token.colorText }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: token.colorPrimary, flexShrink: 0 }} />
                        {t('bill.res.seat')}[{quotaMap.seat.unlimited ? t('bill.unlimited') : quotaMap.seat.amount}]
                      </span>
                    )}
                    {data.features.map((f) => {
                      const badge = FEATURE_BADGE[f]
                      const sfx = QUOTA_FEATURES.includes(f) && quotaMap[f]
                        ? `[${quotaMap[f].unlimited ? t('bill.unlimited') : quotaMap[f].amount}]` : ''
                      return (
                        <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: token.colorText }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: token.colorPrimary, flexShrink: 0 }} />
                          {featLabel(f)}{sfx}
                          {badge && <Tag color={badge.color} style={{ margin: 0, lineHeight: '16px', fontSize: 11, padding: '0 5px' }}>{badge.text}</Tag>}
                        </span>
                      )
                    })}
                  </div>
                  <Button type="primary" block style={{ marginTop: 20, fontWeight: 600 }}
                    onClick={() => nav('/settings/billing/plans')}>
                    {t('bill.renewUpgrade')}
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ padding: '22px 18px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: token.colorText }}>{t('bill.noSubTitle')}</div>
                <div style={{ fontSize: 13, color: token.colorTextTertiary, margin: '12px 0 90px', lineHeight: 1.6 }}>{t('bill.noSubDesc')}</div>
                <Button type="primary" block style={{ fontWeight: 600 }}
                  onClick={() => nav('/settings/billing/plans')}>
                  {t('bill.subscribeNow')}
                </Button>
              </div>
            )}
          </div>
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
