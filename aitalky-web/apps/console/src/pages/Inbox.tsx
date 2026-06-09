import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Empty, Tag, Typography, Descriptions, Card } from 'antd'
import { whoami } from '../api/auth'
import { getCtx } from '../auth/session'
import type { WhoAmI } from '../types'

const { Text } = Typography

// 收件箱:参照 ByteTrack 三栏(分类视图 / 会话列表 / 聊天)。
// 会话/消息后端尚未开发,这里先放占位 + 当前登录上下文(联调验证项目级 token 生效)。
const CATEGORIES = [
  { key: 'mine', label: '我的', count: 0 },
  { key: 'mention', label: '提及我的', count: 0 },
  { key: 'unassigned', label: '未分配', count: 0 },
  { key: 'all', label: '全部', count: 0 },
]

export default function Inbox() {
  const ctx = getCtx()
  const [me, setMe] = useState<WhoAmI | null>(null)

  useEffect(() => {
    whoami().then(setMe).catch(() => undefined)
  }, [])

  return (
    <div style={styles.root}>
      {/* 第一栏:分类视图 */}
      <div style={styles.col1}>
        <div style={styles.colTitle}>收件箱</div>
        {CATEGORIES.map((c) => (
          <div key={c.key} style={styles.catItem}>
            <span>{c.label}</span>
            <Tag>{c.count}</Tag>
          </div>
        ))}
      </div>

      {/* 第二栏:会话列表 */}
      <div style={styles.col2}>
        <div style={styles.colTitle}>全部会话</div>
        <Empty style={{ marginTop: 80 }} description="暂无会话(会话/消息模块开发中)" />
      </div>

      {/* 第三栏:聊天 / 当前为联调信息 */}
      <div style={styles.col3}>
        <Card title="工作台联调信息" style={{ maxWidth: 560, margin: '40px auto' }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="项目">{ctx.projectName}</Descriptions.Item>
            <Descriptions.Item label="角色">
              <Tag color="blue">{ctx.roleName}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="projectId">{me?.projectId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="memberId">{me?.memberId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="功能权限">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(me?.functions || []).map((f) => (
                  <Tag key={f}>{f}</Tag>
                ))}
              </div>
            </Descriptions.Item>
          </Descriptions>
          <Text type="secondary">↑ 来自 GET /api/whoami,证明项目级 token + 多租户上下文已生效。</Text>
        </Card>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: { display: 'flex', height: '100%' },
  col1: { width: 200, background: '#fff', borderRight: '1px solid #f0f0f0', padding: 12 },
  col2: { width: 320, background: '#fff', borderRight: '1px solid #f0f0f0', padding: 12 },
  col3: { flex: 1, background: '#f5f7fb' },
  colTitle: { fontWeight: 600, fontSize: 15, padding: '4px 8px 12px' },
  catItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
  },
}
