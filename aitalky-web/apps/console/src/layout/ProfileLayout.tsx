import type { CSSProperties } from 'react'
import { Menu, theme } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'

// 个人中心左侧导航(基本资料/偏好设置/系统推送)。独立于团队设置,人人可访问。
export default function ProfileLayout() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const isDark = useAppStore((s) => s.themeMode) === 'dark'
  const panelGray = isDark ? token.colorBgLayout : '#f7f7f7'
  const splitBorder = `0.5px solid ${isDark ? token.colorSplit : 'rgba(0,0,0,0.1)'}`
  const nav = useNavigate()
  const loc = useLocation()

  const items = [
    { key: '/profile/basic', label: t('profile.basic') },
    { key: '/profile/preferences', label: t('profile.preferences') },
    { key: '/profile/push', label: t('profile.push') },
  ]

  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', height: '100%' },
    side: { width: 224, flexShrink: 0, background: panelGray, borderRight: splitBorder, paddingTop: 4 },
    title: { fontWeight: 700, fontSize: 17, padding: '14px 20px' },
    content: { flex: 1, background: panelGray, padding: 24, overflow: 'auto' },
  }

  return (
    <div style={styles.root}>
      <div style={styles.side}>
        <div style={styles.title}>{t('profile.title')}</div>
        <Menu mode="inline" selectedKeys={[loc.pathname]} items={items}
          style={{ border: 'none', background: 'transparent' }} onClick={({ key }) => nav(key)} />
      </div>
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}
