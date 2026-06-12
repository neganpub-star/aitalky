import { useEffect, useState } from 'react'
import { Card, Col, Row, theme } from 'antd'
import { UserOutlined, ProjectOutlined, GiftOutlined, TranslationOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../store/useAdminStore'
import { hasPerm } from '../auth/perm'
import { listLanguages, listPlans, pageProjects, pageUsers } from '../api/resources'

// 概览:欢迎条 + 关键计数卡(按权限拉取,无权限的卡片显示 —)
export default function Dashboard() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const realName = useAdminStore((s) => s.realName)
  const username = useAdminStore((s) => s.username)
  const [stats, setStats] = useState<{ users?: number; projects?: number; plans?: number; languages?: number }>({})

  useEffect(() => {
    if (hasPerm('users')) pageUsers({ page: 1, size: 1 }).then((r) => setStats((s) => ({ ...s, users: r.total }))).catch(() => {})
    if (hasPerm('tenants')) pageProjects({ page: 1, size: 1 }).then((r) => setStats((s) => ({ ...s, projects: r.total }))).catch(() => {})
    if (hasPerm('plans')) listPlans().then((r) => setStats((s) => ({ ...s, plans: r.filter((p) => p.status === 1).length }))).catch(() => {})
    if (hasPerm('dict')) listLanguages().then((r) => setStats((s) => ({ ...s, languages: r.filter((l) => l.status === 1).length }))).catch(() => {})
  }, [])

  // 每张卡一个主题色(图标块底色用浅色调,图标用纯色)
  const cards: { perm: string; icon: ReactNode; label: string; value?: number; color: string; bg: string }[] = [
    { perm: 'users', icon: <UserOutlined />, label: t('dashboard.users'), value: stats.users, color: '#409eff', bg: 'rgba(64,158,255,0.12)' },
    { perm: 'tenants', icon: <ProjectOutlined />, label: t('dashboard.projects'), value: stats.projects, color: '#67c23a', bg: 'rgba(103,194,58,0.12)' },
    { perm: 'plans', icon: <GiftOutlined />, label: t('dashboard.plans'), value: stats.plans, color: '#e6a23c', bg: 'rgba(230,162,60,0.12)' },
    { perm: 'dict', icon: <TranslationOutlined />, label: t('dashboard.languages'), value: stats.languages, color: '#f56c6c', bg: 'rgba(245,108,108,0.12)' },
  ].filter((c) => hasPerm(c.perm))

  return (
    <div>
      {/* 欢迎条 */}
      <div style={{
        background: `linear-gradient(135deg, ${token.colorPrimary} 0%, #2f7cf6 100%)`,
        borderRadius: 8, padding: '22px 28px', marginBottom: 16, color: '#fff',
        boxShadow: '0 2px 12px rgba(64,158,255,0.25)',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{t('dashboard.welcome', { name: realName || username || 'admin' })}</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{t('dashboard.subtitle')}</div>
      </div>

      {/* 计数卡 */}
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col key={c.perm} xs={24} sm={12} md={6}>
            <Card variant="borderless" styles={{ body: { display: 'flex', alignItems: 'center', gap: 16, padding: 20 } }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                background: c.bg, color: c.color, fontSize: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{c.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: token.colorTextSecondary, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, color: token.colorText }}>{c.value ?? '-'}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
