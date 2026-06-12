import client from './client'
import type {
  EmailInviteVO, EnterResult, InviteInfoVO, LinkInviteDetailVO, LinkInviteVO, PageResult,
} from '../types'

export interface EmailInviteQuery {
  status?: number
  startDate?: string
  endDate?: string
  keyword?: string
  page?: number
  size?: number
}

export interface LinkInviteQuery {
  status?: number
  startDate?: string
  endDate?: string
  keyword?: string
  page?: number
  size?: number
}

// ===== 邮箱邀请 =====
/** 创建邮箱邀请(单个=1个;批量=多个) */
export function createEmailInvites(emails: string[], roleId: string) {
  return client.post<unknown, void>('/invites/email', { emails, roleId })
}

export function pageEmailInvites(query: EmailInviteQuery) {
  return client.get<unknown, PageResult<EmailInviteVO>>('/invites/email', { params: query })
}

export function revokeEmailInvite(id: string) {
  return client.post<unknown, void>(`/invites/email/${id}/revoke`)
}

export function resendEmailInvite(id: string) {
  return client.post<unknown, void>(`/invites/email/${id}/resend`)
}

// ===== 链接邀请 =====
/** 创建链接邀请。accessType: 0公开 1私密 */
export function createLinkInvite(roleId: string, accessType: number) {
  return client.post<unknown, LinkInviteVO>('/invites/link', { roleId, accessType })
}

export function pageLinkInvites(query: LinkInviteQuery) {
  return client.get<unknown, PageResult<LinkInviteVO>>('/invites/link', { params: query })
}

export function linkInviteDetail(id: string) {
  return client.get<unknown, LinkInviteDetailVO>(`/invites/link/${id}`)
}

export function disableLinkInvite(id: string) {
  return client.post<unknown, void>(`/invites/link/${id}/disable`)
}

// ===== 接受加入(落地页) =====
/** 落地页:凭 token 查邀请信息(无需登录) */
export function inviteInfo(token: string) {
  return client.get<unknown, InviteInfoVO>(`/auth/invite/${token}`)
}

/** 接受邀请→建成员→返回项目级令牌(需账号级令牌) */
export function acceptInvite(token: string, nickname: string, accessCode?: string) {
  return client.post<unknown, EnterResult>(`/auth/invite/${token}/accept`, { nickname, accessCode })
}

/** 据 token 拼接邀请落地页 URL(复制链接用) */
export function buildJoinUrl(token: string) {
  return `${location.origin}${location.pathname}#/join?token=${token}`
}
