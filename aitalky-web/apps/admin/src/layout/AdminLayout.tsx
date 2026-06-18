import { useEffect, useMemo, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, Tooltip, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined, UserOutlined, ProjectOutlined, GiftOutlined,
  AppstoreOutlined, FileTextOutlined, TranslationOutlined,
  GlobalOutlined, PoweroffOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  CloseOutlined, HomeOutlined, SunOutlined, MoonOutlined, ReloadOutlined,
  TeamOutlined, SafetyCertificateOutlined, ProfileOutlined, WalletOutlined, ControlOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../store/useAdminStore'
import { changeLang } from '../i18n'
import { getMe } from '../api/auth'
import { sidebarColors } from '../AppProviders'
import logo from '../assets/logo.png'

// 平台后管外壳(参考 RuoYi 风):深色侧栏+LOGO / 白顶栏(折叠+面包屑+用户菜单) / 多页签 tags-view / 浅灰内容区
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

  const [collapsed, setCollapsed] = useState(false)
  // 已打开页签(只存 key,标题随语言实时取);概览页常驻不可关
  const [tags, setTags] = useState<string[]>(['/dashboard'])
  const dark = themeMode === 'dark'
  const siderBg = sidebarColors(dark).bg

  // 登录后拉一次资料(刷新权限/角色名,防 token 内信息过期)
  useEffect(() => {
    getMe().then((p) => setProfile(p.realName, p.roleName, p.permissions)).catch(() => {})
  }, [setProfile])

  // 兜底:整页底色随主题(防短内容时 body 露白);同时挂表格斑马纹/悬停色变量(明暗自动适配)
  useEffect(() => {
    document.body.style.background = token.colorBgLayout
    const root = document.documentElement
    root.style.setProperty('--row-stripe', token.colorFillAlter)
    root.style.setProperty('--row-hover', token.colorFillSecondary)
  }, [token.colorBgLayout, token.colorFillAlter, token.colorFillSecondary])

  // 菜单项(perm 为空=始终显示;group 为空=顶层不分组)
  const allItems = useMemo(() => [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard'), perm: '', group: '' },
    { key: '/users', icon: <UserOutlined />, label: t('nav.users'), perm: 'users', group: 'ops' },
    { key: '/projects', icon: <ProjectOutlined />, label: t('nav.projects'), perm: 'tenants', group: 'ops' },
    { key: '/orders', icon: <ProfileOutlined />, label: t('nav.orders'), perm: 'orders', group: 'ops' },
    { key: '/plans', icon: <GiftOutlined />, label: t('nav.plans'), perm: 'plans', group: 'catalog' },
    { key: '/addons', icon: <AppstoreOutlined />, label: t('nav.addons'), perm: 'addons', group: 'catalog' },
    { key: '/coins', icon: <WalletOutlined />, label: t('nav.coins'), perm: 'orders', group: 'catalog' },
    { key: '/configs', icon: <ControlOutlined />, label: t('nav.params'), perm: 'config', group: 'system' },
    { key: '/agreements', icon: <FileTextOutlined />, label: t('nav.agreements'), perm: 'agreements', group: 'system' },
    { key: '/languages', icon: <TranslationOutlined />, label: t('nav.languages'), perm: 'dict', group: 'system' },
    { key: '/admins', icon: <TeamOutlined />, label: t('nav.admins'), perm: 'admins', group: 'access' },
    { key: '/roles', icon: <SafetyCertificateOutlined />, label: t('nav.roles'), perm: 'roles', group: 'access' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lang])
  // 分组定义(顺序即菜单顺序);父级图标复用已导入图标
  const groupDefs = useMemo(() => [
    { key: 'g-ops', icon: <ProjectOutlined />, label: t('nav.gOps'), group: 'ops' },
    { key: 'g-catalog', icon: <GiftOutlined />, label: t('nav.gCatalog'), group: 'catalog' },
    { key: 'g-system', icon: <ControlOutlined />, label: t('nav.gSystem'), group: 'system' },
    { key: 'g-access', icon: <SafetyCertificateOutlined />, label: t('nav.gAccess'), group: 'access' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lang])
  // 构建分组菜单:顶层项(group='')直出,其余按分组折叠为子菜单
  const items = useMemo(() => {
    const has = (i: { perm: string }) => !i.perm || permissions.includes(i.perm)
    const toItem = ({ key, icon, label }: { key: string; icon: JSX.Element; label: string }) => ({ key, icon, label })
    const result: NonNullable<MenuProps['items']> = []
    allItems.filter((i) => i.group === '' && has(i)).forEach((i) => result.push(toItem(i)))
    groupDefs.forEach((gr) => {
      const children = allItems.filter((i) => i.group === gr.group && has(i)).map(toItem)
      if (children.length) result.push({ key: gr.key, icon: gr.icon, label: gr.label, children })
    })
    return result
  }, [allItems, groupDefs, permissions])
  const titleOf = (key: string) => allItems.find((i) => i.key === key)?.label || key

  // 当前激活菜单 key(最长前缀匹配)
  const activeKey = useMemo(() => {
    const hit = allItems.filter((i) => loc.pathname.startsWith(i.key)).sort((a, b) => b.key.length - a.key.length)[0]
    return hit?.key || '/dashboard'
  }, [allItems, loc.pathname])

  // 进入新路由自动追加页签
  useEffect(() => {
    setTags((prev) => (prev.includes(activeKey) ? prev : [...prev, activeKey]))
  }, [activeKey])

  const closeTag = (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTags((prev) => {
      const next = prev.filter((k) => k !== key)
      if (key === activeKey) nav(next[next.length - 1] || '/dashboard')
      return next
    })
  }

  const display = realName || username || 'admin'
  const userMenu = {
    items: [
      {
        key: 'lang',
        icon: <GlobalOutlined />,
        label: `${t('common.lang')}: ${lang === 'en_US' ? 'English' : '简体中文'}`,
        onClick: () => changeLang(lang === 'en_US' ? 'zh_CN' : 'en_US'),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <PoweroffOutlined />,
        label: t('common.logout'),
        onClick: () => { logout(); nav('/login') },
      },
    ],
  }

  return (
    <Layout style={{ height: '100vh', background: token.colorBgLayout }}>
      <Layout.Sider
        className="admin-sider"
        width={210}
        collapsedWidth={64}
        collapsed={collapsed}
        theme={dark ? 'dark' : 'light'}
        style={{
          background: siderBg, overflow: 'hidden',
          borderRight: dark ? 'none' : `1px solid ${token.colorSplit}`,
          boxShadow: dark ? '2px 0 8px rgba(0,0,0,0.3)' : '2px 0 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* LOGO 区 */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '0 12px', overflow: 'hidden', whiteSpace: 'nowrap',
          borderBottom: dark ? 'none' : `1px solid ${token.colorSplit}`,
        }}>
          <img src={logo} alt="aitalky" style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, objectFit: 'cover' }} />
          {!collapsed && <span style={{ color: token.colorText, fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>aitalky</span>}
        </div>
        <Menu
          mode="inline"
          theme={dark ? 'dark' : 'light'}
          style={{ background: siderBg, borderInlineEnd: 'none', height: 'calc(100% - 56px)', overflowY: 'auto' }}
          selectedKeys={[activeKey]}
          defaultOpenKeys={['g-ops', 'g-catalog', 'g-system', 'g-access']}
          items={items}
          onClick={({ key }) => nav(key)}
        />
      </Layout.Sider>

      <Layout>
        {/* 顶栏:折叠 + 面包屑 |（右）主题/用户 */}
        <Layout.Header style={{
          height: 56, lineHeight: '56px', paddingInline: 16, background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorSplit}`, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span
            onClick={() => setCollapsed((c) => !c)}
            style={{ fontSize: 18, cursor: 'pointer', color: token.colorText, display: 'flex' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>
          <Breadcrumb
            items={[
              { title: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><HomeOutlined />{t('nav.dashboard')}</span> },
              ...(activeKey !== '/dashboard' ? [{ title: titleOf(activeKey) }] : []),
            ]}
          />
          <div style={{ flex: 1 }} />
          <Tooltip title={t('common.refresh')}>
            <span onClick={() => nav(0)} style={{ fontSize: 16, cursor: 'pointer', color: token.colorTextSecondary, display: 'flex' }}>
              <ReloadOutlined />
            </span>
          </Tooltip>
          <Tooltip title={themeMode === 'dark' ? t('common.lightMode') : t('common.darkMode')}>
            <span onClick={toggleTheme} style={{ fontSize: 17, cursor: 'pointer', color: token.colorTextSecondary, display: 'flex' }}>
              {themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            </span>
          </Tooltip>
          <Dropdown menu={userMenu} placement="bottomRight">
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={30} style={{ background: token.colorPrimary, flexShrink: 0 }}>{display.charAt(0).toUpperCase()}</Avatar>
              <span style={{ color: token.colorText }}>
                {display}
                {roleName && <span style={{ color: token.colorTextSecondary, marginLeft: 6, fontSize: 12 }}>({t(`roleNames.${roleName}`, roleName)})</span>}
              </span>
            </span>
          </Dropdown>
        </Layout.Header>

        {/* tags-view 多页签 */}
        <div
          className="tags-view"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorSplit}`,
            // CSS 变量供 index.css 中的 .tag-item 边框使用,适配明暗
            ['--tag-border' as string]: token.colorBorderSecondary,
          }}
        >
          {tags.map((key) => (
            <span
              key={key}
              className={`tag-item${key === activeKey ? ' active' : ''}`}
              style={key !== activeKey ? { color: token.colorText } : undefined}
              onClick={() => nav(key)}
            >
              {titleOf(key)}
              {key !== '/dashboard' && (
                <CloseOutlined className="tag-close" onClick={(e) => closeTag(key, e)} />
              )}
            </span>
          ))}
        </div>

        <Layout.Content style={{ padding: 16, overflow: 'auto', background: token.colorBgLayout }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
