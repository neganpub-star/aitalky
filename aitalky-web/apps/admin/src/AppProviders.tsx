import type { ReactNode } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useAdminStore } from './store/useAdminStore'

// 统一注入主题(白天/黑夜)与 AntD 语言;随 store 响应式切换
// 侧栏配色随主题:白天浅色侧栏(白底)、黑夜深色侧栏;供布局/菜单共用
export const sidebarColors = (dark: boolean) =>
  dark
    ? { bg: '#141414', subBg: '#0d0d0d', hover: '#2d2d2d' }
    : { bg: '#ffffff', subBg: '#ffffff', hover: '#f0f1f5' }

export default function AppProviders({ children }: { children: ReactNode }) {
  const themeMode = useAdminStore((s) => s.themeMode)
  const lang = useAdminStore((s) => s.lang)
  const sc = sidebarColors(themeMode === 'dark')
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
            darkItemBg: sc.bg,
            darkSubMenuItemBg: sc.subBg,
            darkPopupBg: sc.bg,
            darkItemColor: 'rgba(255,255,255,0.72)',
            darkItemHoverBg: sc.hover,
            darkItemHoverColor: '#ffffff',
            darkItemSelectedBg: '#409eff',
            darkItemSelectedColor: '#ffffff',
            itemHeight: 48,
            itemMarginInline: 0,
            itemBorderRadius: 0,
          },
          // 表格更舒展:行高加大、表头分隔线隐藏、表头字重加粗(颜色仍随明暗算法)
          Table: {
            cellPaddingBlock: 14,
            headerSplitColor: 'transparent',
            headerBorderRadius: 8,
            fontWeightStrong: 600,
          },
          Card: { borderRadiusLG: 10 },
          // 列表操作链接更紧凑
          Tag: { borderRadiusSM: 4 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}
