import { Badge } from 'antd'

// 统一状态指示:圆点 + 文案(启用=绿 / 停用=灰,可选停用红点)
export default function StatusBadge({ active, on, off, offDanger }: {
  active: boolean
  on: string
  off: string
  offDanger?: boolean
}) {
  return <Badge status={active ? 'success' : offDanger ? 'error' : 'default'} text={active ? on : off} />
}
