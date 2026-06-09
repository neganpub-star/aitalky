import client from './client'
import type { PageResult } from '../types'

// 黑名单项(对应后端 BlacklistVO)。targetType: 1用户 2游客设备
export interface BlacklistVO {
  id: string
  targetType: number
  targetValue: string
  reason: string | null
  createTime: string | null
}

/** 黑名单分页 */
export function pageBlacklist(page = 1, size = 20) {
  return client.get<unknown, PageResult<BlacklistVO>>('/blacklist', { params: { page, size } })
}

/** 按客户拉黑(详情面板用) */
export function blockCustomer(customerId: string, reason?: string) {
  return client.post<unknown, void>(`/blacklist/customer/${customerId}`, undefined, {
    params: reason ? { reason } : undefined,
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
