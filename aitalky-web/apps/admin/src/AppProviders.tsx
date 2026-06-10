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
        token: { colorPrimary: '#2f54eb', fontSize: 14 },
      }}
    >
      {children}
    </ConfigProvider>
  )
}
