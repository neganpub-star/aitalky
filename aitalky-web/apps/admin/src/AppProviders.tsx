import type { ReactNode } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useAdminStore } from './store/useAdminStore'

// 统一注入主题(白天/黑夜)与 AntD 语言;随 store 响应式切换
export default function AppProviders({ children }: { children: ReactNode }) {
  const themeMode = useAdminStore((s) => s.themeMode)
  const lang = useAdminStore((s) => s.lang)
  return (
    <ConfigProvider
      locale={lang === 'en_US' ? enUS : zhCN}
      theme={{
        algorithm: themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        // 主色对齐参考后台(Element 蓝),圆角收紧到 4 更显紧凑
        token: { colorPrimary: '#409eff', colorInfo: '#409eff', fontSize: 14, borderRadius: 4 },
        components: {
          // 深色侧栏菜单配色(RuoYi 风:深底 #1a1f2e、悬浮 #263445、子菜单更深、选中蓝)
          Menu: {
            darkItemBg: '#1a1f2e',
            darkSubMenuItemBg: '#141824',
            darkPopupBg: '#1a1f2e',
            darkItemColor: 'rgba(255,255,255,0.72)',
            darkItemHoverBg: '#263445',
            darkItemHoverColor: '#ffffff',
            darkItemSelectedBg: '#409eff',
            darkItemSelectedColor: '#ffffff',
            itemHeight: 48,
            itemMarginInline: 0,
            itemBorderRadius: 0,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}
