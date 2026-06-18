import client from './client'

// 套餐资源配额
export interface PlanQuotaVO {
  resourceType: string // seat / translate_char / customer
  amount: number
  isUnlimited: number  // 1 无限
}

// 套餐(对应后端 PlanVO)
export interface PlanVO {
  id: string
  code: string
  name: string
  level: number
  monthlyPrice: number
  currency: string
  minMonths: number
  isCustom: number
  features: string[]   // 功能码:inbox/messenger/translate/quickreply/group/blacklist...
  status: number
  quotas: PlanQuotaVO[]
}

// 服务订阅概览
export interface BillingOverviewVO {
  subscribed: boolean
  planId: string | null
  planCode: string | null
  planName: string | null
  planLevel: number | null
  expireTime: string | null
  expired: boolean
  quotas: PlanQuotaVO[]
  features: string[]
}

// 可充值/支付币种(选链)
export interface CoinVO {
  symbol: string
  currency: string   // USDT-TRC20
  network: string    // TRC20
  chainName: string  // Tron
}

// 项目收款地址(下单后展示,用户转账到此)
export interface RechargeAddressVO {
  currency: string
  network: string
  chainName: string
  address: string
}

// 钱包余额(兜底)
export interface WalletVO {
  balance: number
  currency: string
}

// 订单(下单返回/订单记录)
export interface OrderVO {
  id: string
  orderNo: string
  type: string       // new / renew / upgrade / addon_seat / addon_customer
  resourceType: string | null // 加购资源类型 seat/customer;套餐单为 null
  planId: string
  planName: string
  months: number
  seats: number
  quantity: number   // 客户配额加购:新增配额总数
  periodDays: number // 席位加购计价周期=下单时剩余天数
  amount: number
  currency: string
  payCurrency: string | null // 下单选定收款网络(USDT-TRC20/ERC20);决定收款地址所在链
  status: number     // 0待支付 1已完成 2已作废
  expireTime: string | null  // 待支付订单过期时间(下单+24h)
  paidTime: string | null
  createTime: string | null
}

// 加购报价(加购弹窗实时算合计)
export interface AddonQuoteVO {
  resourceType: string        // seat / customer
  subscribed: boolean         // 是否有有效订阅(加购前提)
  unitPrice: number           // 席位=单席位月价;客户配额=每包价
  packAmount: number          // 每包配额数(客户配额);席位=1
  remainingDays: number | null // 席位按剩余天数折算
  expireTime: string | null   // 当前订阅到期时间(席位加购展示)
}

// 加购下单命令
export interface CreateAddonOrderCmd {
  resourceType: string  // seat / customer
  quantity: number      // 席位=新增席位数;客户配额=拓展包数
  currency: string      // 选定收款网络(USDT-TRC20/ERC20)
}

// 订单记录筛选
export interface OrderQuery {
  current?: number
  size?: number
  type?: string
  status?: number
  orderNo?: string
  dateFrom?: string  // yyyy-MM-dd
  dateTo?: string    // yyyy-MM-dd
}

// 资源用量(席位/客户 已用 vs 配额)
export interface UsageVO {
  resourceType: string
  used: number
  limit: number
  unlimited: boolean
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export interface CreateOrderCmd {
  planId: string
  months: number
  seats: number
  currency: string  // 选定收款网络(USDT-TRC20/ERC20)
  packs?: Record<string, number>  // 搭售永久加量包份数:{ translate_char, ai_tokens, customer }
}

// 计费单价(下单实时算合计)
export interface PricingVO {
  seatMonthlyPrice: number  // 单席位月价
}

// 平台公共参数(客服 Telegram、免费体验天数、未订阅默认额度)
export interface PublicConfigVO {
  contactTelegram: string
  freeTrialDays: number
  defaultTranslateChar: number  // 未订阅默认翻译包(字符)
  defaultAiTokens: number       // 未订阅默认 AI Tokens
  defaultCustomer: number       // 未订阅默认客户配额
}

/** 平台公共参数(套餐订阅页免费体验横幅用) */
export function getPublicConfig() {
  return client.get<unknown, PublicConfigVO>('/config/public')
}

/** 上架套餐列表 */
export function listPlans() {
  return client.get<unknown, PlanVO[]>('/billing/plans')
}

/** 当前项目订阅概览 */
export function getOverview() {
  return client.get<unknown, BillingOverviewVO>('/billing/overview')
}

/** 可支付币种(选链) */
export function listCoins() {
  return client.get<unknown, CoinVO[]>('/billing/coins')
}

/** 计费单价(席位月价等) */
export function getPricing() {
  return client.get<unknown, PricingVO>('/billing/pricing')
}

/** 钱包余额(兜底) */
export function getWallet() {
  return client.get<unknown, WalletVO>('/billing/wallet')
}

/** 资源用量(席位/客户) */
export function getUsage() {
  return client.get<unknown, UsageVO[]>('/billing/usage')
}

/** 取/建项目在该币种所属链上的固定收款地址(下单后展示) */
export function getAddress(currency: string) {
  return client.post<unknown, RechargeAddressVO>('/billing/address', null, { params: { currency } })
}

/** 下单(新购/续费/升级;作废旧待支付单后建新单,唯一待支付) */
export function createOrder(cmd: CreateOrderCmd) {
  return client.post<unknown, OrderVO>('/billing/order', cmd)
}

/** 加购报价(席位单价/剩余天数/到期时间;客户配额每包价/每包数) */
export function getAddonQuote(resourceType: string) {
  return client.get<unknown, AddonQuoteVO>('/billing/addon/quote', { params: { resourceType } })
}

/** 加购下单(独立购买席位/客户配额,不换套餐;唯一待支付) */
export function createAddonOrder(cmd: CreateAddonOrderCmd) {
  return client.post<unknown, OrderVO>('/billing/order/addon', cmd)
}

/** 当前待支付订单(无则 null;用于轮询到账状态/回显) */
export function getPendingOrder() {
  return client.get<unknown, OrderVO | null>('/billing/order/pending')
}

/** 余额核销开通(余额足时手动触发;转账到账由回调自动核销) */
export function payOrder(orderId: string) {
  return client.post<unknown, OrderVO>('/billing/order/pay', null, { params: { orderId } })
}

/** 取消待支付订单 */
export function cancelOrder(orderId: string) {
  return client.post<unknown, void>('/billing/order/cancel', null, { params: { orderId } })
}

/** 订单记录(分页,倒序;支持类型/状态/日期范围/订单号筛选) */
export function pageOrders(query: OrderQuery = {}) {
  const { current = 1, size = 10, ...rest } = query
  return client.get<unknown, PageResult<OrderVO>>('/billing/orders', { params: { current, size, ...rest } })
}
