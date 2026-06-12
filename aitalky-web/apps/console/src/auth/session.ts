// 登录态访问:委托给 Zustand store(集中 + 持久化)。保留函数签名,兼容现有非组件代码
import { useAppStore } from '../store/useAppStore'
import type { EnterResult, LoginResult, ProjectBrief } from '../types'

export interface SessionCtx {
  email?: string
  accountId?: string
  projects?: ProjectBrief[]
  projectId?: string
  projectName?: string
  projectLogo?: string
  roleName?: string
  functions?: string[]
}

export function getToken(): string {
  return useAppStore.getState().token
}

export function getCtx(): SessionCtx {
  const s = useAppStore.getState()
  return {
    email: s.email,
    accountId: s.accountId,
    projects: s.projects,
    projectId: s.projectId,
    projectName: s.projectName,
    projectLogo: s.projectLogo,
    roleName: s.roleName,
    functions: s.functions,
  }
}

export function saveLogin(r: LoginResult): void {
  useAppStore.getState().saveLogin(r)
}

export function saveEnter(r: EnterResult, projectName: string, projectLogo?: string | null): void {
  useAppStore.getState().saveEnter(r, projectName, projectLogo || undefined)
}

export function patchCtx(patch: SessionCtx): void {
  if (patch.projects) {
    useAppStore.getState().setProjects(patch.projects)
  }
}

export function logout(): void {
  useAppStore.getState().logout()
}
