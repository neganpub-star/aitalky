import { createHashRouter, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Projects from './pages/Projects'
import Inbox from './pages/Inbox'
import MainLayout from './layout/MainLayout'
import SettingsLayout from './layout/SettingsLayout'
import ProfileLayout from './layout/ProfileLayout'
import Members from './pages/settings/Members'
import Invites from './pages/settings/Invites'
import Placeholder from './pages/settings/Placeholder'
import ProfileBasic from './pages/profile/ProfileBasic'
import ProfilePreferences from './pages/profile/ProfilePreferences'
import ProfilePush from './pages/profile/ProfilePush'
import Blacklist from './pages/settings/Blacklist'
import QuickReplies from './pages/settings/QuickReplies'
import Messenger from './pages/settings/Messenger'
import UrgentNotice from './pages/settings/UrgentNotice'
import General from './pages/settings/General'
import { getCtx, getToken } from './auth/session'
import { canAccessSettings } from './auth/perm'

/** 需登录(有 token) */
function RequireAuth({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

/** 需已进入项目(项目级 token,ctx 有 projectId) */
function RequireProject({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />
  if (!getCtx().projectId) return <Navigate to="/projects" replace />
  return <>{children}</>
}

/** 需设置区权限(普通成员直接访问 /settings 重定向回收件箱) */
function RequireSettings({ children }: { children: ReactNode }) {
  return canAccessSettings() ? <>{children}</> : <Navigate to="/inbox" replace />
}

export const router = createHashRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/projects', element: <RequireAuth><Projects /></RequireAuth> },
  {
    path: '/',
    element: <RequireProject><MainLayout /></RequireProject>,
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      { path: 'inbox', element: <Inbox /> },
      {
        path: 'profile',
        element: <ProfileLayout />,
        children: [
          { index: true, element: <Navigate to="/profile/basic" replace /> },
          { path: 'basic', element: <ProfileBasic /> },
          { path: 'preferences', element: <ProfilePreferences /> },
          { path: 'push', element: <ProfilePush /> },
        ],
      },
      {
        path: 'settings',
        element: <RequireSettings><SettingsLayout /></RequireSettings>,
        children: [
          { index: true, element: <Navigate to="/settings/members" replace /> },
          { path: 'members', element: <Members /> },
          { path: 'invites', element: <Invites /> },
          { path: 'messenger', element: <Messenger /> },
          { path: 'urgent-notice', element: <UrgentNotice /> },
          { path: 'general', element: <General /> },
          { path: 'blacklist', element: <Blacklist /> },
          { path: 'quick-replies', element: <QuickReplies /> },
          { path: 'team', element: <Placeholder title="基本信息" /> },
          { path: 'roles', element: <Placeholder title="角色管理" /> },
          { path: 'data', element: <Placeholder title="数据管理" /> },
          { path: 'billing', element: <Placeholder title="服务订阅" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/inbox" replace /> },
])
