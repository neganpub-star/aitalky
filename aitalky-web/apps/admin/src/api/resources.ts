import client from './client'
import { encryptPassword } from './crypto'
import type {
  AddonVO, AdminAccountDetailVO, AdminAccountVO, AdminOrderVO, AdminProjectVO,
  AdminVO, AgreementVO, CoinVO, FunctionDef, LanguageVO, PageResult, PlanVO, RoleVO,
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

// ===== 后管账号 =====
export interface AdminListQuery { keyword?: string; status?: number; page?: number; size?: number }
export interface SaveAdminBody {
  id?: string
  username: string
  /** 明文,提交前 RSA 加密;仅新增必填 */
  password?: string
  realName?: string
  roleId?: string
  status?: number
}
export function pageAdmins(q: AdminListQuery) {
  return client.get<unknown, PageResult<AdminVO>>('/admin/admins', { params: q })
}
export async function saveAdmin(body: SaveAdminBody) {
  // 新增带明文密码时 RSA 加密传输(与登录同一公钥)
  const payload: SaveAdminBody = { ...body }
  if (body.password) payload.password = await encryptPassword(body.password)
  return client.post<unknown, string>('/admin/admins', payload)
}
export function setAdminStatus(id: string, status: number) {
  return client.put<unknown, void>(`/admin/admins/${id}/status`, null, { params: { status } })
}
export async function resetAdminPassword(id: string, password: string) {
  const cipher = await encryptPassword(password)
  return client.put<unknown, void>(`/admin/admins/${id}/password`, { password: cipher })
}
export function deleteAdmin(id: string) {
  return client.delete<unknown, void>(`/admin/admins/${id}`)
}

// ===== 订单(跨项目,倒序) =====
export interface OrderQuery { projectId?: string; status?: number; type?: string; page?: number; size?: number }
export function pageOrders(q: OrderQuery) {
  return client.get<unknown, PageResult<AdminOrderVO>>('/admin/orders', { params: q })
}

// ===== 币种配置 =====
export function listCoins() {
  return client.get<unknown, CoinVO[]>('/admin/coins')
}
export function saveCoin(body: Partial<CoinVO>) {
  return client.post<unknown, string>('/admin/coins', body)
}
export function setCoinStatus(id: string, status: number) {
  return client.put<unknown, void>(`/admin/coins/${id}/status`, null, { params: { status } })
}
export function deleteCoin(id: string) {
  return client.delete<unknown, void>(`/admin/coins/${id}`)
}

// ===== 后管角色 =====
export function listRoles() {
  return client.get<unknown, RoleVO[]>('/admin/roles')
}
export function listFunctions() {
  return client.get<unknown, FunctionDef[]>('/admin/roles/functions')
}
export function saveRole(body: Partial<RoleVO>) {
  return client.post<unknown, string>('/admin/roles', body)
}
export function deleteRole(id: string) {
  return client.delete<unknown, void>(`/admin/roles/${id}`)
}
