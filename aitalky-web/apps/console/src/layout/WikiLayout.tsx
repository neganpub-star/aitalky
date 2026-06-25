import type { CSSProperties } from 'react'
import { Menu, theme } from 'antd'
import { AppstoreOutlined, FileTextOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'

// 知识库(wiki)二级侧边栏(对齐参考:左 224 淡灰栏,「Wiki」标题 + 文章管理/应用)。
export default function WikiLayout() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const isDark = useAppStore((s) => s.themeMode) === 'dark'
  const panelGray = isDark ? token.colorBgLayout : '#f7f7f7'
  const splitBorder = `0.5px solid ${isDark ? token.colorSplit : 'rgba(0,0,0,0.1)'}`
  const nav = useNavigate()
  const loc = useLocation()

  const items: MenuProps['items'] = [
    { key: '/wiki/articles', icon: <FileTextOutlined />, label: t('wiki.articleManage') },
    { key: '/wiki/sites', icon: <AppstoreOutlined />, label: t('wiki.apps') },
  ]
  // 文章编辑/站点编辑等子路由归属对应顶级项高亮
  const selected = loc.pathname.startsWith('/wiki/articles') ? '/wiki/articles' : '/wiki/sites'

  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', height: '100%' },
    side: { width: 224, flexShrink: 0, background: panelGray, borderRight: splitBorder, paddingTop: 4 },
    title: { fontWeight: 700, fontSize: 17, padding: '14px 20px' },
    content: { flex: 1, background: token.colorBgLayout, overflow: 'auto' },
  }

  return (
    <div style={styles.root}>
      <div style={styles.side}>
        <div style={styles.title}>Wiki</div>
        <Menu mode="inline" selectedKeys={[selected]} items={items}
          style={{ border: 'none', background: 'transparent' }} onClick={({ key }) => nav(key)} />
      </div>
      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}
