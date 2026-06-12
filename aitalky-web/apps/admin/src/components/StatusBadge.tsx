import { Badge } from 'antd'

// 统一状态指示:圆点 + 文案(启用=绿 / 停用=灰,可选停用红点)
export default function StatusBadge({ active, on, off, offDanger }: {
  active: boolean
  on: string
  off: string
  offDanger?: boolean
}) {
  // 文案套 nowrap:英文较长(Enabled/Disabled)时防止圆点与文字换行堆叠
  return (
    <Badge
      status={active ? 'success' : offDanger ? 'error' : 'default'}
      text={<span style={{ whiteSpace: 'nowrap' }}>{active ? on : off}</span>}
    />
  )
}
