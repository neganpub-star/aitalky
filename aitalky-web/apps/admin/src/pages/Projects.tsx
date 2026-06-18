import { useEffect, useState } from 'react'
import { Button, Input, Space, Table, Tag } from 'antd'
import { CrownOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { pageProjects } from '../api/resources'
import type { AdminProjectVO } from '../types'
import PageCard from '../components/PageCard'
import StatusBadge from '../components/StatusBadge'
import SubscriptionDrawer from './SubscriptionDrawer'

export default function Projects() {
  const { t } = useTranslation()
  const [data, setData] = useState<AdminProjectVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [subProject, setSubProject] = useState<AdminProjectVO | null>(null)  // 订阅抽屉

  const load = async (p = page, kw = keyword) => {
    setLoading(true)
    try {
      const r = await pageProjects({ page: p, size: 10, keyword: kw || undefined })
      setData(r.records)
      setTotal(r.total)
      setPage(r.current)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load(1) }, [])

  const columns: ColumnsType<AdminProjectVO> = [
    { title: t('projects.name'), dataIndex: 'name' },
    { title: t('projects.appId'), dataIndex: 'appId' },
    { title: t('projects.owner'), dataIndex: 'ownerEmail', render: (v) => v || '-' },
    { title: t('projects.members'), dataIndex: 'memberCount', width: 90 },
    { title: t('projects.site'), dataIndex: 'site', width: 80, render: (v) => v || '-' },
    {
      title: t('projects.private'), dataIndex: 'isPrivate', width: 90,
      render: (v: number) => (v === 1 ? <Tag color="purple">{t('common.yes')}</Tag> : '-'),
    },
    {
      title: t('common.status'), dataIndex: 'status', width: 110,
      render: (s: number) => <StatusBadge active={s === 1} on={t('common.enabled')} off={t('common.disabled')} offDanger />,
    },
    {
      title: t('common.operation'), width: 110,
      render: (_, p) => (
        <Button type="link" size="small" icon={<CrownOutlined />} onClick={() => setSubProject(p)}>
          {t('sub.title')}
        </Button>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.projects')}>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder={t('projects.keyword')}
          allowClear
          enterButton
          style={{ width: 300 }}
          onSearch={(v) => { setKeyword(v); load(1, v) }}
        />
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ current: page, total, pageSize: 10, onChange: (p) => load(p) }}
      />
      <SubscriptionDrawer project={subProject} onClose={() => setSubProject(null)} />
    </PageCard>
  )
}
