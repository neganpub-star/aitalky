import type { CSSProperties } from 'react'
import { Avatar, Tooltip, Dropdown, Popover, Divider } from 'antd'
import {
  InboxOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { enterProject } from '../api/auth'
import { getCtx, logout, saveEnter } from '../auth/session'
import type { ProjectBrief } from '../types'

// 参照 ByteTrack:最左为窄图标导航栏;左上角品牌 LOGO 点击弹出「项目切换」面板
const NAV = [
  { key: '/inbox', icon: <InboxOutlined />, label: '收件箱' },
  { key: '/customers', icon: <TeamOutlined />, label: '客户' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '数据' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function MainLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const ctx = getCtx()
  const projects: ProjectBrief[] = ctx.projects || []

  const onSwitch = async (p: ProjectBrief) => {
    if (p.id === ctx.projectId) return
    const r = await enterProject(p.id)
    saveEnter(r, p.name)
    location.reload() // 切项目后刷新,重新加载该项目数据
  }

  const onLogout = () => {
    logout()
    nav('/login')
  }

  // 左上角品牌 LOGO 点击弹出的项目切换面板
  const projectPanel = (
    <div style={{ width: 240 }}>
      <div style={{ padding: '4px 12px', fontWeight: 600 }}>{ctx.projectName}</div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ padding: '0 12px 4px', color: '#999', fontSize: 12 }}>切换项目</div>
      <div style={{ maxHeight: 260, overflow: 'auto' }}>
        {projects.map((p) => {
          const active = p.id === ctx.projectId
          return (
            <div key={p.id} style={styles.projItem} onClick={() => onSwitch(p)}>
              <Avatar shape="square" size={24} style={{ background: '#2f54eb', fontSize: 12 }}>
                {p.name.charAt(0)}
              </Avatar>
              <span style={{ flex: 1, marginLeft: 8 }}>{p.name}</span>
              {active && <CheckOutlined style={{ color: '#2f54eb' }} />}
            </div>
          )
        })}
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={styles.projItem} onClick={() => nav('/projects')}>
        <PlusCircleOutlined style={{ color: '#2f54eb' }} />
        <span style={{ marginLeft: 8 }}>新建项目</span>
      </div>
    </div>
  )

  return (
    <div style={styles.root}>
      <div style={styles.rail}>
        {/* 左上角:品牌 LOGO → 项目切换面板 */}
        <Popover content={projectPanel} trigger="click" placement="rightTop" arrow={false}>
          <div style={styles.brand} title={ctx.projectName}>
            {(ctx.projectName || 'AT').charAt(0).toUpperCase()}
          </div>
        </Popover>

        <div style={styles.navGroup}>
          {NAV.map((n) => {
            const active = loc.pathname.startsWith(n.key)
            return (
              <Tooltip key={n.key} title={n.label} placement="right">
                <div
                  style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}
                  onClick={() => nav(n.key)}
                >
                  {n.icon}
                </div>
              </Tooltip>
            )
          })}
        </div>

        {/* 底部:用户头像 → 退出 */}
        <div style={styles.railBottom}>
          <Dropdown
            menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: onLogout }] }}
            placement="topRight"
          >
            <Avatar style={{ background: '#2f54eb', cursor: 'pointer' }}>
              {(ctx.email || 'U').charAt(0).toUpperCase()}
            </Avatar>
          </Dropdown>
        </div>
      </div>

      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden' },
  rail: {
    width: 56,
    background: '#fff',
    borderRight: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  brand: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: '#2f54eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    marginBottom: 20,
    cursor: 'pointer',
  },
  navGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    color: '#8c8c8c',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  navItemActive: { background: 'rgba(47,84,235,0.1)', color: '#2f54eb' },
  railBottom: { marginTop: 'auto' },
  content: { flex: 1, background: '#fff', overflow: 'auto' },
  projItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
}
