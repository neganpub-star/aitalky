import client from './client'
import type { PageResult } from '../types'

// 黑名单项(对应后端 BlacklistVO)。targetType: 1用户 2游客设备;uid/mid 由后端派生;其余为拉黑时快照
export interface BlacklistVO {
  id: string
  targetType: number
  targetValue: string
  uid: string | null
  mid: string | null
  customerName: string | null
  contact: string | null
  email: string | null
  location: string | null
  operatorName: string | null
  reason: string | null
  createTime: string | null
}

/** 黑名单分页(keyword 模糊匹配 UID/MID/用户名/联系方式/邮箱) */
export function pageBlacklist(page = 1, size = 20, keyword?: string) {
  return client.get<unknown, PageResult<BlacklistVO>>('/blacklist', { params: { page, size, keyword: keyword || undefined } })
}

/** 按客户拉黑(详情面板用):带上会话ID以快照所在地 */
export function blockCustomer(customerId: string, conversationId?: string, reason?: string) {
  return client.post<unknown, void>(`/blacklist/customer/${customerId}`, undefined, {
    params: { conversationId: conversationId || undefined, reason: reason || undefined },
  })
}

/** 手动加入黑名单 */
export function addBlacklist(targetType: number, targetValue: string, reason?: string) {
  return client.post<unknown, void>('/blacklist', { targetType, targetValue, reason })
}

/** 移出黑名单 */
export function removeBlacklist(id: string) {
  return client.delete<unknown, void>(`/blacklist/${id}`)
}
