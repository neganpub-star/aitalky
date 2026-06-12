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
  nickname?: string
  avatar?: string
  functions: string[]
  themeMode: 'light' | 'dark'
  lang: string
  // 未读消息总数(瞬时,不持久化):图标栏「收件箱」红点 + 浏览器标题未读提醒
  unreadTotal: number

  saveLogin: (r: LoginResult) => void
  setUnreadTotal: (n: number) => void
  saveEnter: (r: EnterResult, projectName: string) => void
  setProjects: (projects: ProjectBrief[]) => void
  setProjectName: (projectName: string) => void
  setMember: (nickname?: string, avatar?: string) => void
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
      unreadTotal: 0,

      saveLogin: (r) =>
        set({ token: r.token, email: r.email, accountId: r.accountId, projects: r.projects }),
      setUnreadTotal: (n) => set({ unreadTotal: n }),
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
      setProjectName: (projectName) => set({ projectName }),
      setMember: (nickname, avatar) => set({ nickname, avatar }),
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
          nickname: undefined,
          avatar: undefined,
          functions: [],
        }),
      toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'light' ? 'dark' : 'light' })),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'aitalky-app' },
  ),
)
