import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic } from 'antd'
import { UserOutlined, ProjectOutlined, GiftOutlined, TranslationOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../store/useAdminStore'
import { hasPerm } from '../auth/perm'
import { listLanguages, listPlans, pageProjects, pageUsers } from '../api/resources'

// 概览:几个关键计数(按权限拉取,无权限的卡片显示 —)
export default function Dashboard() {
  const { t } = useTranslation()
  const realName = useAdminStore((s) => s.realName)
  const username = useAdminStore((s) => s.username)
  const [stats, setStats] = useState<{ users?: number; projects?: number; plans?: number; languages?: number }>({})

  useEffect(() => {
    if (hasPerm('users')) pageUsers({ page: 1, size: 1 }).then((r) => setStats((s) => ({ ...s, users: r.total }))).catch(() => {})
    if (hasPerm('tenants')) pageProjects({ page: 1, size: 1 }).then((r) => setStats((s) => ({ ...s, projects: r.total }))).catch(() => {})
    if (hasPerm('plans')) listPlans().then((r) => setStats((s) => ({ ...s, plans: r.filter((p) => p.status === 1).length }))).catch(() => {})
    if (hasPerm('dict')) listLanguages().then((r) => setStats((s) => ({ ...s, languages: r.filter((l) => l.status === 1).length }))).catch(() => {})
  }, [])

  const cards = [
    { perm: 'users', icon: <UserOutlined />, label: t('dashboard.users'), value: stats.users },
    { perm: 'tenants', icon: <ProjectOutlined />, label: t('dashboard.projects'), value: stats.projects },
    { perm: 'plans', icon: <GiftOutlined />, label: t('dashboard.plans'), value: stats.plans },
    { perm: 'dict', icon: <TranslationOutlined />, label: t('dashboard.languages'), value: stats.languages },
  ].filter((c) => hasPerm(c.perm))

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('dashboard.welcome', { name: realName || username || 'admin' })}</h2>
      <Row gutter={16}>
        {cards.map((c) => (
          <Col key={c.perm} xs={24} sm={12} md={6}>
            <Card>
              <Statistic title={c.label} value={c.value ?? '-'} prefix={c.icon} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
