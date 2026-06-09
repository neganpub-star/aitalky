import type { ReactNode } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useAppStore } from './store/useAppStore'

// 暗色下让裸 HTML 文字也跟随主题色(AntD 暗色只作用于组件,需在根节点设默认文字色/背景)
function ThemedRoot({ children }: { children: ReactNode }) {
  const { token } = antdTheme.useToken()
  return (
    <div style={{ color: token.colorText, background: token.colorBgLayout, minHeight: '100vh' }}>
      {children}
    </div>
  )
}

// 统一注入主题(白天/黑夜)与 AntD 语言;随 store 响应式切换
export default function AppProviders({ children }: { children: ReactNode }) {
  const themeMode = useAppStore((s) => s.themeMode)
  const lang = useAppStore((s) => s.lang)
  return (
    <ConfigProvider
      locale={lang === 'en_US' ? enUS : zhCN}
      theme={{
        algorithm: themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#2f54eb', fontSize: 15 },
      }}
    >
      <ThemedRoot>{children}</ThemedRoot>
    </ConfigProvider>
  )
}
