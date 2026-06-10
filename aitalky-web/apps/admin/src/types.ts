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
