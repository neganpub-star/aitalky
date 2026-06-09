// 登录态本地存储:token + 轻量上下文(展示用)
import type { EnterResult, LoginResult, ProjectBrief } from '../types'

const TOKEN_KEY = 'aitalky_token'
const CTX_KEY = 'aitalky_ctx'

export interface SessionCtx {
  email?: string
  accountId?: string
  projects?: ProjectBrief[]
  projectId?: string
  projectName?: string
  roleName?: string
  functions?: string[]
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getCtx(): SessionCtx {
  const raw = localStorage.getItem(CTX_KEY)
  return raw ? (JSON.parse(raw) as SessionCtx) : {}
}

export function patchCtx(patch: SessionCtx): void {
  localStorage.setItem(CTX_KEY, JSON.stringify({ ...getCtx(), ...patch }))
}

/** 登录成功:存账号级 token + 账号信息 + 可进入项目列表 */
export function saveLogin(r: LoginResult): void {
  setToken(r.token)
  patchCtx({ email: r.email, accountId: r.accountId, projects: r.projects })
}

/** 进入项目:换成项目级 token + 项目上下文 */
export function saveEnter(r: EnterResult, projectName: string): void {
  setToken(r.token)
  patchCtx({ projectId: r.projectId, projectName, roleName: r.roleName, functions: r.functions })
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(CTX_KEY)
}
