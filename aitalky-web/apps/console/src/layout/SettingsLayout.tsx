import type { CSSProperties } from 'react'
import { Menu, theme } from 'antd'
import { MessageOutlined, TeamOutlined, DatabaseOutlined, WalletOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../auth/perm'
import { useAppStore } from '../store/useAppStore'

// 设置区左侧分组导航(参照 ByteTrack);按功能权限过滤,空分组自动隐藏(菜单隔离)
export default function SettingsLayout() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const isDark = useAppStore((s) => s.themeMode) === 'dark'
  const panelGray = isDark ? token.colorBgLayout : '#f7f7f7'
  const splitBorder = `0.5px solid ${isDark ? token.colorSplit : 'rgba(0,0,0,0.1)'}`
  const nav = useNavigate()
  const loc = useLocation()

  const groups = [
    {
      key: 'mse', icon: <MessageOutlined />, label: t('settings.messengerSetting'),
      children: [
        { key: '/settings/messenger', label: t('settings.basicSetting'), func: 'messenger.setting' },
        { key: '/settings/quick-replies', label: t('settings.quickReply'), func: 'messenger.setting' },
        { key: '/settings/blacklist', label: t('settings.blacklist'), func: 'messenger.setting' },
      ],
    },
    {
      key: 'team', icon: <TeamOutlined />, label: t('settings.teamSetting'),
      children: [
        { key: '/settings/team', label: t('settings.basicInfo'), func: 'project.setting' },
        { key: '/settings/members', label: t('settings.members'), func: 'member.manage' },
        { key: '/settings/invites', label: t('settings.invites'), func: 'member.manage' },
        { key: '/settings/roles', label: t('settings.roles'), func: 'role.manage' },
      ],
    },
    {
      key: 'data', icon: <DatabaseOutlined />, label: t('settings.dataManage'),
      children: [{ key: '/settings/data', label: t('settings.dataManage'), func: 'project.setting' }],
    },
    {
      key: 'sub', icon: <WalletOutlined />, label: t('settings.subscription'),
      children: [{ key: '/settings/billing', label: t('settings.subscription'), func: 'billing.manage' }],
    },
  ]

  const items = groups
    .map((g) => {
      const children = g.children.filter((c) => hasFunction(c.func))
      return children.length ? { key: g.key, icon: g.icon, label: g.label, children } : null
    })
    .filter(Boolean) as MenuProps['items']

  const styles: Record<string, CSSProperties> = {
    // 与收件箱第2栏(分类视图)一致:宽 216、淡灰底、淡分隔线 —— 切换页面时不跳变
    root: { display: 'flex', height: '100%' },
    side: { width: 224, flexShrink: 0, background: panelGray, borderRight: splitBorder, paddingTop: 4 },
    title: { fontWeight: 700, fontSize: 17, padding: '14px 20px' },
    content: { flex: 1, background: panelGray, padding: 24, overflow: 'auto' },
  }

  return (
    <div style={styles.root}>
      <div style={styles.side}>
        <div style={styles.title}>{t('settings.title')}</div>
        <Menu mode="inline" selectedKeys={[loc.pathname]} defaultOpenKeys={['team']} items={items}
          style={{ border: 'none', background: 'transparent' }} onClick={({ key }) => nav(key)} />
      </div>
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}
