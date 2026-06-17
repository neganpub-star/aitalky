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
import Orders from './pages/Orders'
import Coins from './pages/Coins'
import Agreements from './pages/Agreements'
import Languages from './pages/Languages'
import Admins from './pages/Admins'
import Roles from './pages/Roles'

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
      { path: 'orders', element: <Orders /> },
      { path: 'coins', element: <Coins /> },
      { path: 'agreements', element: <Agreements /> },
      { path: 'languages', element: <Languages /> },
      { path: 'admins', element: <Admins /> },
      { path: 'roles', element: <Roles /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
