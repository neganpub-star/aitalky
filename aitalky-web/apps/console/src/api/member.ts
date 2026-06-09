import client from './client'
import type { MemberVO, PageResult, RoleVO } from '../types'

export interface MemberQuery {
  roleId?: string
  onlineStatus?: number
  status?: number
  keyword?: string
  page?: number
  size?: number
}

/** 成员分页列表 */
export function pageMembers(query: MemberQuery) {
  return client.get<unknown, PageResult<MemberVO>>('/members', { params: query })
}

/** 角色列表(下拉/筛选用) */
export function listRoles() {
  return client.get<unknown, RoleVO[]>('/roles')
}

export function updateMemberRole(id: string, roleId: string) {
  return client.put<unknown, void>(`/members/${id}/role`, { roleId })
}

export function renameMember(id: string, nickname: string) {
  return client.put<unknown, void>(`/members/${id}/nickname`, { nickname })
}

export function updateMemberAvatar(id: string, avatar: string) {
  return client.put<unknown, void>(`/members/${id}/avatar`, { avatar })
}

export function updateMemberStatus(id: string, status: number) {
  return client.put<unknown, void>(`/members/${id}/status`, { status })
}

export function deleteMember(id: string) {
  return client.delete<unknown, void>(`/members/${id}`)
}
