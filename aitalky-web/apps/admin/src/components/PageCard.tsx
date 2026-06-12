import type { ReactNode } from 'react'
import { Card, theme } from 'antd'

// 统一页面卡片:强调色标题条 + 圆角 + 轻阴影,各内页共用,替代朴素的 <Card title>
export default function PageCard({ title, extra, children }: {
  title: ReactNode
  extra?: ReactNode
  children: ReactNode
}) {
  const { token } = theme.useToken()
  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 10, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}
      styles={{
        header: { borderBottom: `1px solid ${token.colorSplit}`, minHeight: 54 },
        body: { paddingTop: 20 },
      }}
      title={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700 }}>
          <span style={{ width: 4, height: 16, borderRadius: 2, background: token.colorPrimary, flexShrink: 0 }} />
          {title}
        </span>
      )}
      extra={extra}
    >
      {children}
    </Card>
  )
}
