// ===== 通用 =====
export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

// ===== 鉴权 =====
export interface CaptchaVO {
  captchaId: string
  image: string
}

export interface AdminLoginResult {
  token: string
  adminId: string
  username: string
  realName?: string
  roleName?: string
  permissions: string[]
}

export interface AdminProfile {
  adminId: string
  username: string
  realName?: string
  roleName?: string
  permissions: string[]
}

// ===== 用户 / 项目 =====
export interface AdminAccountVO {
  id: string
  email: string
  username?: string
  inviteCode?: string
  status: number
  projectCount: number
  createTime?: string
}

export interface JoinedProject {
  projectId: string
  projectName?: string
  nickname?: string
  roleId?: string
  roleName?: string
  memberStatus?: number
}

export interface AdminAccountDetailVO extends Omit<AdminAccountVO, 'projectCount'> {
  inviterAccountId?: string
  projects: JoinedProject[]
}

export interface AdminProjectVO {
  id: string
  name: string
  appId: string
  ownerAccountId?: string
  ownerEmail?: string
  site?: string
  isPrivate?: number
  status: number
  memberCount: number
  planName?: string | null   // 当前订阅套餐名(无订阅=null)
  subExpired?: boolean | null // 订阅是否已过期
  createTime?: string
}

// ===== 套餐 / 加量包 / 协议 / 语种 =====
export interface PlanQuota {
  resourceType: string
  amount: number | null
  isUnlimited: number
}

export interface PlanVO {
  id: string
  code: string
  name: string
  level: number
  monthlyPrice: number
  currency: string
  minMonths: number
  isCustom: number
  features: string[]
  status: number
  quotas: PlanQuota[]
}

export interface AddonVO {
  id: string
  code: string
  name: string
  resourceType: string
  specAmount: number
  price: number
  currency: string
  status: number
}

export interface ConfigVO {
  id: string
  configKey: string
  configValue: string
  name: string
  remark: string
  configGroup: string
  status: number
}

export interface ProjectSubscriptionVO {
  subscribed: boolean
  planId: string | null
  planCode: string | null
  planName: string | null
  status: number | null
  expireTime: string | null
  expired: boolean
  seats: number          // 当前加购席位(开通表单回填)
  seatUsed: number
  seatTotal: number      // -1 = 无限
  customerUsed: number
  customerTotal: number  // -1 = 无限(免费默认 + 已购包)
  articleTotal: number   // -1 = 无限
  siteTotal: number      // -1 = 无限
  translateTotal: number // 翻译字符总量(默认 + 已购包)
  aiTokensTotal: number  // AI Tokens 总量(默认 + 已购包)
  quotas: { resourceType: string; amount: number; isUnlimited: number }[]
  freeTrialDays: number
}

export interface SubscriptionLogVO {
  id: string
  action: string          // grant 手动开通 / cancel 停用
  planName: string | null
  seats: number | null
  extraCustomers: number | null
  expireTime: string | null
  createTime: string | null
}

export interface AgreementVO {
  id: string
  type: string
  language: string
  title?: string
  content?: string
  version?: string
  status: number
}

export interface LanguageVO {
  id: string
  code: string
  zhName: string
  enName: string
  sort: number
  status: number
}

// ===== 后管账号 / 角色 =====
export interface AdminVO {
  id: string
  username: string
  realName?: string
  roleId?: string
  roleName?: string
  status: number
  createTime?: string
}

export interface RoleVO {
  id: string
  name: string
  permissions: string[]
  adminCount: number
  createTime?: string
}

/** 可分配功能码定义(角色勾选项) */
export interface FunctionDef {
  code: string
  zhName: string
  enName: string
}

// ===== 订单 / 币种(计费) =====
export interface AdminOrderVO {
  id: string
  orderNo: string
  projectId: string
  projectName?: string
  type: string          // new / renew / upgrade
  planId: string
  planName: string
  months: number
  seats: number
  amount: number
  currency: string
  status: number        // 0待支付 1已完成 2已作废
  paidTime?: string
  createTime?: string
}

// 订单统计(全局口径,跨项目)
export interface OrderStatsVO {
  totalOrders: number
  paidOrders: number
  pendingOrders: number
  paidAmount: number
  currency: string
}

export interface CoinVO {
  id: string
  channel: string
  symbol: string
  currency: string
  network: string
  chainId: string
  chainName: string
  tokenId?: string
  decimals: number
  sort: number
  status: number        // 1启用 0停用
}
