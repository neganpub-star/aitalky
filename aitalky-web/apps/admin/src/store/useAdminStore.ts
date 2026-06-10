import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminLoginResult } from '../types'

// 全局状态(持久化):登录态 + 平台权限 + 主题 + 语言
interface AdminState {
  token: string
  adminId?: string
  username?: string
  realName?: string
  roleName?: string
  permissions: string[]
  themeMode: 'light' | 'dark'
  lang: string

  saveLogin: (r: AdminLoginResult) => void
  setProfile: (realName?: string, roleName?: string, permissions?: string[]) => void
  logout: () => void
  toggleTheme: () => void
  setLang: (lang: string) => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      token: '',
      permissions: [],
      themeMode: 'light',
      lang: 'zh_CN',

      saveLogin: (r) =>
        set({
          token: r.token,
          adminId: r.adminId,
          username: r.username,
          realName: r.realName,
          roleName: r.roleName,
          permissions: r.permissions || [],
        }),
      setProfile: (realName, roleName, permissions) =>
        set((s) => ({
          realName: realName ?? s.realName,
          roleName: roleName ?? s.roleName,
          permissions: permissions ?? s.permissions,
        })),
      logout: () =>
        set({
          token: '',
          adminId: undefined,
          username: undefined,
          realName: undefined,
          roleName: undefined,
          permissions: [],
        }),
      toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'light' ? 'dark' : 'light' })),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'aitalky-admin' },
  ),
)
