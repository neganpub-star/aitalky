import client from './client'
import type { ConversationDetailVO, ConversationVO, MessageVO, PageResult } from '../types'
import { normConversation, normDetail, normMessage } from '../normalize'

// 收件箱列表查询。view: mine/unassigned/all/mention;status: 1进行中 2已结束
export interface ConversationListQuery {
  view?: string
  status?: number
  page?: number
  size?: number
}

// 各视图进行中会话数(分类徽标)
export interface ConversationCounts {
  mine: number
  unassigned: number
  all: number
  mention: number
  // "该我处理"的未读会话数(分类红点用,跨视图准);别人负责的不计
  mineUnread: number
  unassignedUnread: number
}

/** 各视图进行中会话数 */
export function getConversationCounts() {
  return client.get<unknown, ConversationCounts>('/conversations/counts')
}

/** 收件箱会话分页 */
export async function listConversations(query: ConversationListQuery) {
  const res = await client.get<unknown, PageResult<ConversationVO>>('/conversations', { params: query })
  return { ...res, records: res.records.map(normConversation) }
}

// 会话搜索查询。type: uid(业务系统UID) / content(会话内容)
export interface ConversationSearchQuery {
  type: 'uid' | 'content'
  keyword: string
  page?: number
  size?: number
}

/** 会话搜索(需 inbox.search 权限) */
export async function searchConversations(query: ConversationSearchQuery) {
  const res = await client.get<unknown, PageResult<ConversationVO>>('/conversations/search', { params: query })
  return { ...res, records: res.records.map(normConversation) }
}

/** 会话详情(含客户信息) */
export async function getConversation(id: string) {
  return normDetail(await client.get<unknown, ConversationDetailVO>(`/conversations/${id}`))
}

/** 会话消息:afterSeq 增量(不传取最近 50 条);打开即清未读 */
export async function listMessages(id: string, afterSeq?: number) {
  const list = await client.get<unknown, MessageVO[]>(`/conversations/${id}/messages`, {
    params: afterSeq == null ? undefined : { afterSeq },
  })
  return list.map(normMessage)
}

/** 历史向上翻页:取 seq < beforeSeq 的最近 50 条(升序);不清未读 */
export async function loadBeforeMessages(id: string, beforeSeq: number) {
  const list = await client.get<unknown, MessageVO[]>(`/conversations/${id}/messages`, {
    params: { beforeSeq },
  })
  return list.map(normMessage)
}

/** 会话内聊天记录搜索:按内容搜当前会话文本消息(seq 倒序,最多 50 条) */
export async function searchMessagesInConversation(id: string, keyword: string) {
  const list = await client.get<unknown, MessageVO[]>(`/conversations/${id}/messages/search`, {
    params: { keyword },
  })
  return list.map(normMessage)
}

/** 坐席回复。internal=true 为内部消息(客户不可见) */
export async function replyConversation(
  id: string,
  body: { content: string; type?: string; payload?: { name?: string; size?: number; caption?: string; segments?: { type: string; text?: string; url?: string }[] }; internal?: boolean; mentions?: string[] },
) {
  return normMessage(await client.post<unknown, MessageVO>(`/conversations/${id}/messages`, body))
}

/** 坐席正在输入(瞬时通知;节流调用,不落库) */
export function sendConversationTyping(id: string) {
  return client.post<unknown, void>(`/conversations/${id}/typing`)
}

/** 坐席撤回自己发送的消息(2分钟时限);返回已撤回 VO(isVisible=false) */
export async function retractConversationMessage(id: string, msgId: string) {
  return normMessage(await client.post<unknown, MessageVO>(`/conversations/${id}/messages/${msgId}/retract`))
}

/** 手动翻译某条消息到目标语言(返回译文);命中缓存后端不扣费 */
export function translateMessage(id: string, msgId: string, targetLang: string) {
  return client.post<unknown, string>(`/conversations/${id}/messages/${msgId}/translate`, null, { params: { targetLang } })
}

/** 更新客户联系方式/邮箱(详情面板编辑) */
export function updateCustomerContact(id: string, contact: string, email: string) {
  return client.put<unknown, void>(`/conversations/${id}/customer`, { contact, email })
}

/** 认领会话 */
export function claimConversation(id: string) {
  return client.post<unknown, void>(`/conversations/${id}/claim`)
}

/** 指派会话给队友(memberId)或取消分配(null=回未分配) */
export function assignConversation(id: string, memberId: string | null) {
  return client.post<unknown, void>(`/conversations/${id}/assign`, { memberId })
}

/** 结束会话 */
export function closeConversation(id: string) {
  return client.post<unknown, void>(`/conversations/${id}/close`)
}
