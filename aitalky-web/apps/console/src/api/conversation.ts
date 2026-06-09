import client from './client'
import type { ConversationDetailVO, ConversationVO, MessageVO, PageResult } from '../types'

// 收件箱列表查询。view: mine/unassigned/all/mention;status: 1进行中 2已结束
export interface ConversationListQuery {
  view?: string
  status?: number
  page?: number
  size?: number
}

/** 收件箱会话分页 */
export function listConversations(query: ConversationListQuery) {
  return client.get<unknown, PageResult<ConversationVO>>('/conversations', { params: query })
}

/** 会话详情(含客户信息) */
export function getConversation(id: string) {
  return client.get<unknown, ConversationDetailVO>(`/conversations/${id}`)
}

/** 会话消息:afterSeq 增量(不传取最近 50 条);打开即清未读 */
export function listMessages(id: string, afterSeq?: number) {
  return client.get<unknown, MessageVO[]>(`/conversations/${id}/messages`, {
    params: afterSeq == null ? undefined : { afterSeq },
  })
}

/** 坐席回复。internal=true 为内部消息(客户不可见) */
export function replyConversation(
  id: string,
  payload: { content: string; type?: string; internal?: boolean; mentions?: string[] },
) {
  return client.post<unknown, MessageVO>(`/conversations/${id}/messages`, payload)
}

/** 认领会话 */
export function claimConversation(id: string) {
  return client.post<unknown, void>(`/conversations/${id}/claim`)
}

/** 结束会话 */
export function closeConversation(id: string) {
  return client.post<unknown, void>(`/conversations/${id}/close`)
}
