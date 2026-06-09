import type { CSSProperties, ReactNode } from 'react'
import { Dropdown, theme, Tooltip } from 'antd'
import { GlobalOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import logo from '../../assets/logo.png'
import { changeLang } from '../../i18n'
import { useAppStore } from '../../store/useAppStore'

// 登录/注册共用外壳:纯色全屏 + 左上角品牌 LOGO + 右上角主题/语言 + 居中表单块(参照 ByteTrack)
export default function AuthShell({ children }: { children: ReactNode }) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const lang = useAppStore((s) => s.lang)
  const themeMode = useAppStore((s) => s.themeMode)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const isDark = themeMode === 'dark'

  const styles: Record<string, CSSProperties> = {
    root: { minHeight: '100vh', background: token.colorBgContainer, position: 'relative' },
    topbar: {
      position: 'absolute', top: 0, left: 0, right: 0, height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
    },
    brand: { display: 'flex', alignItems: 'center', gap: 8 },
    brandText: { fontSize: 20, fontWeight: 700, letterSpacing: 0.5, color: token.colorText },
    actions: { display: 'flex', alignItems: 'center', gap: 20 },
    themeBtn: { color: token.colorTextSecondary, fontSize: 17, cursor: 'pointer', display: 'flex' },
    lang: { color: token.colorTextSecondary, fontSize: 14, cursor: 'pointer' },
    center: { width: 400, margin: '0 auto', paddingTop: '20vh' },
  }

  return (
    <div style={styles.root}>
      <div style={styles.topbar}>
        <div style={styles.brand}>
          <img src={logo} alt="aitalky" width={26} height={26} />
          <span style={styles.brandText}>aitalky</span>
        </div>
        <div style={styles.actions}>
          {/* 主题切换:未登录态没有头像菜单,在此提供入口,避免被持久化的暗色"锁住" */}
          <Tooltip title={isDark ? t('nav.lightMode') : t('nav.darkMode')}>
            <span style={styles.themeBtn} onClick={toggleTheme}>
              {isDark ? <SunOutlined /> : <MoonOutlined />}
            </span>
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                { key: 'zh_CN', label: '简体中文', onClick: () => changeLang('zh_CN') },
                { key: 'en_US', label: 'English', onClick: () => changeLang('en_US') },
              ],
            }}
          >
            <span style={styles.lang}>
              <GlobalOutlined style={{ marginRight: 6 }} />
              {lang === 'en_US' ? 'English' : '简体中文'}
            </span>
          </Dropdown>
        </div>
      </div>
      <div style={styles.center}>{children}</div>
    </div>
  )
}
