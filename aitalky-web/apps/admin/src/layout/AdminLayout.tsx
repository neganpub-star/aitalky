import { useEffect, useMemo } from 'react'
import { Layout, Menu, Avatar, Dropdown, Switch, theme } from 'antd'
import {
  DashboardOutlined, UserOutlined, ProjectOutlined, GiftOutlined,
  AppstoreOutlined, FileTextOutlined, TranslationOutlined,
  GlobalOutlined, BulbOutlined, PoweroffOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../store/useAdminStore'
import { changeLang } from '../i18n'
import { getMe } from '../api/auth'

// 平台后管外壳:左侧菜单(按权限过滤)+ 顶栏(语言/主题/退出)
export default function AdminLayout() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const loc = useLocation()
  const themeMode = useAdminStore((s) => s.themeMode)
  const toggleTheme = useAdminStore((s) => s.toggleTheme)
  const lang = useAdminStore((s) => s.lang)
  const permissions = useAdminStore((s) => s.permissions)
  const username = useAdminStore((s) => s.username)
  const realName = useAdminStore((s) => s.realName)
  const roleName = useAdminStore((s) => s.roleName)
  const setProfile = useAdminStore((s) => s.setProfile)
  const logout = useAdminStore((s) => s.logout)

  // 登录后拉一次资料(刷新权限/角色名,防 token 内信息过期)
  useEffect(() => {
    getMe().then((p) => setProfile(p.realName, p.roleName, p.permissions)).catch(() => {})
  }, [setProfile])

  // 菜单项(perm 为空=始终显示)
  const allItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard'), perm: '' },
    { key: '/users', icon: <UserOutlined />, label: t('nav.users'), perm: 'users' },
    { key: '/projects', icon: <ProjectOutlined />, label: t('nav.projects'), perm: 'tenants' },
    { key: '/plans', icon: <GiftOutlined />, label: t('nav.plans'), perm: 'plans' },
    { key: '/addons', icon: <AppstoreOutlined />, label: t('nav.addons'), perm: 'addons' },
    { key: '/agreements', icon: <FileTextOutlined />, label: t('nav.agreements'), perm: 'agreements' },
    { key: '/languages', icon: <TranslationOutlined />, label: t('nav.languages'), perm: 'dict' },
  ]
  const items = useMemo(
    () => allItems.filter((i) => !i.perm || permissions.includes(i.perm)).map(({ key, icon, label }) => ({ key, icon, label })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, lang],
  )

  const display = realName || username || 'admin'
  const userMenu = {
    items: [
      {
        key: 'lang',
        icon: <GlobalOutlined />,
        label: `${t('common.lang')}: ${lang === 'en_US' ? 'English' : '简体中文'}`,
        onClick: () => changeLang(lang === 'en_US' ? 'zh_CN' : 'en_US'),
      },
      {
        key: 'logout',
        icon: <PoweroffOutlined />,
        label: t('common.logout'),
        onClick: () => { logout(); nav('/login') },
      },
    ],
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Layout.Sider theme={themeMode === 'dark' ? 'dark' : 'light'} width={220} style={{ borderRight: `1px solid ${token.colorSplit}` }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: token.colorPrimary }}>
          aitalky Admin
        </div>
        <Menu
          mode="inline"
          theme={themeMode === 'dark' ? 'dark' : 'light'}
          selectedKeys={[items.find((i) => loc.pathname.startsWith(i.key))?.key || '/dashboard']}
          items={items}
          onClick={({ key }) => nav(key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}`, paddingInline: 20, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 18 }}>
          <Switch
            checked={themeMode === 'dark'}
            onChange={toggleTheme}
            checkedChildren={<BulbOutlined />}
            unCheckedChildren={<BulbOutlined />}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={30} style={{ background: token.colorPrimary }}>{display.charAt(0).toUpperCase()}</Avatar>
              <span>
                {display}
                {roleName && <span style={{ color: token.colorTextSecondary, marginLeft: 6, fontSize: 12 }}>({roleName})</span>}
              </span>
            </span>
          </Dropdown>
        </Layout.Header>
        <Layout.Content style={{ padding: 20, overflow: 'auto', background: token.colorBgLayout }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
