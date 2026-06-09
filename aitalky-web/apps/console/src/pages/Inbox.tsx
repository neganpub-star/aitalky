import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Empty, Tag, Typography, Descriptions, Card, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { whoami } from '../api/auth'
import { getCtx } from '../auth/session'
import { hasFunction } from '../auth/perm'
import type { WhoAmI } from '../types'

const { Text } = Typography

// 收件箱:参照 ByteTrack 三栏(分类视图 / 会话列表 / 聊天)。
// 会话/消息后端尚未开发,这里先放占位 + 当前登录上下文(联调验证项目级 token 生效)。
export default function Inbox() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const ctx = getCtx()
  const [me, setMe] = useState<WhoAmI | null>(null)

  // 分类按权限显示:我的/提及我的 人人可见;未分配/全部 需对应功能权限(菜单隔离)
  const categories = [
    { key: 'mine', label: t('inbox.mine'), visible: true },
    { key: 'mention', label: t('inbox.mention'), visible: true },
    { key: 'unassigned', label: t('inbox.unassigned'), visible: hasFunction('inbox.viewUnassigned') },
    { key: 'all', label: t('inbox.all'), visible: hasFunction('inbox.viewAll') },
  ].filter((c) => c.visible)

  useEffect(() => {
    whoami().then(setMe).catch(() => undefined)
  }, [])

  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', height: '100%' },
    col1: { width: 200, background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}`, padding: 12 },
    col2: { width: 320, background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}`, padding: 12 },
    col3: { flex: 1, background: token.colorBgLayout },
    colTitle: { fontWeight: 600, fontSize: 15, padding: '4px 8px 12px' },
    catItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 6, cursor: 'pointer' },
  }

  return (
    <div style={styles.root}>
      <div style={styles.col1}>
        <div style={styles.colTitle}>{t('inbox.title')}</div>
        {categories.map((c) => (
          <div key={c.key} style={styles.catItem}>
            <span>{c.label}</span>
            <Tag>0</Tag>
          </div>
        ))}
      </div>

      <div style={styles.col2}>
        <div style={styles.colTitle}>{t('inbox.all')}</div>
        <Empty style={{ marginTop: 80 }} description="暂无会话(会话/消息模块开发中)" />
      </div>

      <div style={styles.col3}>
        <Card title="工作台联调信息" style={{ maxWidth: 560, margin: '40px auto' }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="项目">{ctx.projectName}</Descriptions.Item>
            <Descriptions.Item label="角色"><Tag color="blue">{ctx.roleName}</Tag></Descriptions.Item>
            <Descriptions.Item label="projectId">{me?.projectId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="memberId">{me?.memberId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="功能权限">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(me?.functions || []).map((f) => <Tag key={f}>{f}</Tag>)}
              </div>
            </Descriptions.Item>
          </Descriptions>
          <Text type="secondary">↑ 来自 GET /api/whoami,证明项目级 token + 多租户上下文已生效。</Text>
        </Card>
      </div>
    </div>
  )
}
