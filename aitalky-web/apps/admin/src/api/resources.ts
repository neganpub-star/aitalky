import client from './client'
import type {
  AddonVO, AdminAccountDetailVO, AdminAccountVO, AdminProjectVO,
  AgreementVO, LanguageVO, PageResult, PlanVO,
} from '../types'

// ===== 用户 =====
export interface AccountQuery { keyword?: string; status?: number; page?: number; size?: number }
export function pageUsers(q: AccountQuery) {
  return client.get<unknown, PageResult<AdminAccountVO>>('/admin/users', { params: q })
}
export function userDetail(id: string) {
  return client.get<unknown, AdminAccountDetailVO>(`/admin/users/${id}`)
}
export function setUserStatus(id: string, status: number) {
  return client.put<unknown, void>(`/admin/users/${id}/status`, null, { params: { status } })
}

// ===== 项目 =====
export interface ProjectQuery { keyword?: string; status?: number; site?: string; page?: number; size?: number }
export function pageProjects(q: ProjectQuery) {
  return client.get<unknown, PageResult<AdminProjectVO>>('/admin/projects', { params: q })
}
export function setProjectStatus(id: string, status: number) {
  return client.put<unknown, void>(`/admin/projects/${id}/status`, null, { params: { status } })
}

// ===== 套餐 =====
export function listPlans() {
  return client.get<unknown, PlanVO[]>('/admin/plans')
}
export function savePlan(body: Partial<PlanVO>) {
  return client.post<unknown, string>('/admin/plans', body)
}
export function setPlanStatus(id: string, status: number) {
  return client.put<unknown, void>(`/admin/plans/${id}/status`, null, { params: { status } })
}
export function deletePlan(id: string) {
  return client.delete<unknown, void>(`/admin/plans/${id}`)
}

// ===== 加量包 =====
export function listAddons() {
  return client.get<unknown, AddonVO[]>('/admin/addons')
}
export function saveAddon(body: Partial<AddonVO>) {
  return client.post<unknown, string>('/admin/addons', body)
}
export function setAddonStatus(id: string, status: number) {
  return client.put<unknown, void>(`/admin/addons/${id}/status`, null, { params: { status } })
}
export function deleteAddon(id: string) {
  return client.delete<unknown, void>(`/admin/addons/${id}`)
}

// ===== 协议 =====
export function listAgreements() {
  return client.get<unknown, AgreementVO[]>('/admin/agreements')
}
export function saveAgreement(body: Partial<AgreementVO>) {
  return client.post<unknown, string>('/admin/agreements', body)
}
export function deleteAgreement(id: string) {
  return client.delete<unknown, void>(`/admin/agreements/${id}`)
}

// ===== 语种字典 =====
export function listLanguages() {
  return client.get<unknown, LanguageVO[]>('/admin/languages')
}
export function saveLanguage(body: Partial<LanguageVO>) {
  return client.post<unknown, string>('/admin/languages', body)
}
export function setLanguageStatus(id: string, status: number) {
  return client.put<unknown, void>(`/admin/languages/${id}/status`, null, { params: { status } })
}
export function deleteLanguage(id: string) {
  return client.delete<unknown, void>(`/admin/languages/${id}`)
}
