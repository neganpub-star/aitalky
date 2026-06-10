import { createHashRouter, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAdminStore } from './store/useAdminStore'
import AdminLayout from './layout/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Projects from './pages/Projects'
import Plans from './pages/Plans'
import Addons from './pages/Addons'
import Agreements from './pages/Agreements'
import Languages from './pages/Languages'

/** 需登录(有 token) */
function RequireAuth({ children }: { children: ReactNode }) {
  return useAdminStore.getState().token ? <>{children}</> : <Navigate to="/login" replace />
}

export const router = createHashRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'users', element: <Users /> },
      { path: 'projects', element: <Projects /> },
      { path: 'plans', element: <Plans /> },
      { path: 'addons', element: <Addons /> },
      { path: 'agreements', element: <Agreements /> },
      { path: 'languages', element: <Languages /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
