import { createHashRouter, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Projects from './pages/Projects'
import Inbox from './pages/Inbox'
import MainLayout from './layout/MainLayout'
import { getCtx, getToken } from './auth/session'

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
    ],
  },
  { path: '*', element: <Navigate to="/inbox" replace /> },
])
