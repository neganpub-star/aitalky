import type { ReactNode } from 'react'
import { theme } from 'antd'

// 表单分组小标题:左侧强调竖条 + 标题,统一各 Modal 表单的分块视觉(沿用 PageCard 风格)
// first 用于首个分组去掉上间距,避免贴着 Modal 顶部留白过大
export default function FormSection({ title, first, children }: {
  title: ReactNode
  first?: boolean
  children: ReactNode
}) {
  const { token } = theme.useToken()
  return (
    <div style={{ marginTop: first ? 0 : 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        fontSize: 14, fontWeight: 600, color: token.colorText,
      }}>
        <span style={{ width: 3, height: 14, borderRadius: 2, background: token.colorPrimary }} />
        {title}
      </div>
      {children}
    </div>
  )
}
