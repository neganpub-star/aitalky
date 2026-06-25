import type { ReactNode } from 'react'
import {
  BookOutlined, ReadOutlined, BulbOutlined, AppstoreOutlined, ShoppingOutlined,
  GiftOutlined, RocketOutlined, FireOutlined, CrownOutlined, ToolOutlined,
  CodeOutlined, ApiOutlined, ExperimentOutlined, StarOutlined, TrophyOutlined,
  ShopOutlined, CustomerServiceOutlined, FileTextOutlined, BankOutlined, GlobalOutlined,
} from '@ant-design/icons'

// wiki 应用图标库:应用图标只支持从图标库选择(对齐参考,暂不支持自定义上传)。
// 每个图标内置一个品牌色,卡片中按「启用彩色 / 禁用灰色」渲染。
export interface WikiIconDef {
  key: string
  color: string
  node: ReactNode
}

export const WIKI_ICONS: WikiIconDef[] = [
  { key: 'book', color: '#2f6bff', node: <BookOutlined /> },
  { key: 'read', color: '#1aa7a0', node: <ReadOutlined /> },
  { key: 'bulb', color: '#f5a623', node: <BulbOutlined /> },
  { key: 'app', color: '#7b61ff', node: <AppstoreOutlined /> },
  { key: 'shopping', color: '#ff6b6b', node: <ShoppingOutlined /> },
  { key: 'gift', color: '#eb5fae', node: <GiftOutlined /> },
  { key: 'rocket', color: '#3a7afe', node: <RocketOutlined /> },
  { key: 'fire', color: '#ff7a45', node: <FireOutlined /> },
  { key: 'crown', color: '#f7b500', node: <CrownOutlined /> },
  { key: 'tool', color: '#e8503a', node: <ToolOutlined /> },
  { key: 'code', color: '#52c41a', node: <CodeOutlined /> },
  { key: 'api', color: '#13c2c2', node: <ApiOutlined /> },
  { key: 'experiment', color: '#9254de', node: <ExperimentOutlined /> },
  { key: 'star', color: '#fadb14', node: <StarOutlined /> },
  { key: 'trophy', color: '#fa8c16', node: <TrophyOutlined /> },
  { key: 'shop', color: '#eb2f96', node: <ShopOutlined /> },
  { key: 'service', color: '#2f54eb', node: <CustomerServiceOutlined /> },
  { key: 'doc', color: '#1677ff', node: <FileTextOutlined /> },
  { key: 'bank', color: '#722ed1', node: <BankOutlined /> },
  { key: 'global', color: '#0fbf7e', node: <GlobalOutlined /> },
]

const ICON_MAP: Record<string, WikiIconDef> = Object.fromEntries(WIKI_ICONS.map((i) => [i.key, i]))

/** 默认图标(无 icon 时回退) */
export const DEFAULT_WIKI_ICON = 'book'

export function wikiIconDef(key: string | null | undefined): WikiIconDef {
  return (key && ICON_MAP[key]) || ICON_MAP[DEFAULT_WIKI_ICON]
}

/** 渲染应用图标:grayscale=true 显示灰色(禁用态) */
export function renderWikiIcon(key: string | null | undefined, opts?: { size?: number; grayscale?: boolean }): ReactNode {
  const def = wikiIconDef(key)
  const size = opts?.size ?? 28
  const color = opts?.grayscale ? '#bfbfbf' : def.color
  return <span style={{ fontSize: size, color, display: 'inline-flex' }}>{def.node}</span>
}
