import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnterResult, LoginResult, ProjectBrief } from '../types'

// 全局状态(持久化):登录态 + 主题 + 语言。组件用 hook 订阅,非组件用 getState()
interface AppState {
  token: string
  email?: string
  accountId?: string
  projects: ProjectBrief[]
  projectId?: string
  projectName?: string
  memberId?: string
  roleName?: string
  functions: string[]
  themeMode: 'light' | 'dark'
  lang: string

  saveLogin: (r: LoginResult) => void
  saveEnter: (r: EnterResult, projectName: string) => void
  setProjects: (projects: ProjectBrief[]) => void
  logout: () => void
  toggleTheme: () => void
  setLang: (lang: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: '',
      projects: [],
      functions: [],
      themeMode: 'light',
      lang: 'zh_CN',

      saveLogin: (r) =>
        set({ token: r.token, email: r.email, accountId: r.accountId, projects: r.projects }),
      saveEnter: (r, projectName) =>
        set({
          token: r.token,
          projectId: r.projectId,
          projectName,
          memberId: r.memberId,
          roleName: r.roleName,
          functions: r.functions,
        }),
      setProjects: (projects) => set({ projects }),
      logout: () =>
        set({
          token: '',
          email: undefined,
          accountId: undefined,
          projects: [],
          projectId: undefined,
          projectName: undefined,
          memberId: undefined,
          roleName: undefined,
          functions: [],
        }),
      toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'light' ? 'dark' : 'light' })),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'aitalky-app' },
  ),
)
