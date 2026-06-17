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
  planName: string | null
  planLevel: number | null
  expireTime: string | null
  expired: boolean
  quotas: PlanQuotaVO[]
  features: string[]
}

/** 上架套餐列表 */
export function listPlans() {
  return client.get<unknown, PlanVO[]>('/billing/plans')
}

/** 当前项目订阅概览 */
export function getOverview() {
  return client.get<unknown, BillingOverviewVO>('/billing/overview')
}
