import { useEffect, useState } from 'react'
import { Drawer, Descriptions, Input, Popconfirm, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { pageUsers, setUserStatus, userDetail } from '../api/resources'
import type { AdminAccountDetailVO, AdminAccountVO } from '../types'
import PageCard from '../components/PageCard'

export default function Users() {
  const { t } = useTranslation()
  const [data, setData] = useState<AdminAccountVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<AdminAccountDetailVO | null>(null)

  const load = async (p = page, kw = keyword) => {
    setLoading(true)
    try {
      const r = await pageUsers({ page: p, size: 10, keyword: kw || undefined })
      setData(r.records)
      setTotal(r.total)
      setPage(r.current)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load(1) }, [])

  const toggle = async (u: AdminAccountVO) => {
    await setUserStatus(u.id, u.status === 1 ? 0 : 1)
    message.success(t('common.saved'))
    load()
  }

  const columns: ColumnsType<AdminAccountVO> = [
    { title: t('users.email'), dataIndex: 'email' },
    { title: t('users.username'), dataIndex: 'username', render: (v) => v || '-' },
    { title: t('users.inviteCode'), dataIndex: 'inviteCode', render: (v) => v || '-' },
    { title: t('users.projectCount'), dataIndex: 'projectCount', width: 110 },
    {
      title: t('common.status'), dataIndex: 'status', width: 90,
      render: (s: number) => <Tag color={s === 1 ? 'green' : 'red'}>{s === 1 ? t('common.enabled') : t('common.disabled')}</Tag>,
    },
    {
      title: t('common.operation'), width: 160,
      render: (_, u) => (
        <Space>
          <a onClick={() => userDetail(u.id).then(setDetail)}>{t('common.detail')}</a>
          <Popconfirm
            title={u.status === 1 ? t('users.disableConfirm') : t('users.enableConfirm')}
            onConfirm={() => toggle(u)}
          >
            <a style={{ color: u.status === 1 ? '#ff4d4f' : undefined }}>
              {u.status === 1 ? t('common.disabled') : t('common.enabled')}
            </a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.users')}>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder={t('users.keyword')}
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
        pagination={{ current: page, total, pageSize: 10, onChange: (p) => load(p), showTotal: (t2) => `${t2}` }}
      />
      <Drawer
        title={t('common.detail')}
        width={520}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t('users.email')}>{detail.email}</Descriptions.Item>
              <Descriptions.Item label={t('users.username')}>{detail.username || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('users.inviteCode')}>{detail.inviteCode || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>
                <Tag color={detail.status === 1 ? 'green' : 'red'}>{detail.status === 1 ? t('common.enabled') : t('common.disabled')}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <h4 style={{ marginTop: 20 }}>{t('users.joinedProjects')}</h4>
            <Table
              rowKey="projectId"
              size="small"
              pagination={false}
              dataSource={detail.projects}
              columns={[
                { title: t('users.project'), dataIndex: 'projectName', render: (v) => v || '-' },
                { title: t('users.nickname'), dataIndex: 'nickname', render: (v) => v || '-' },
                { title: t('users.role'), dataIndex: 'roleName', render: (v) => v || '-' },
              ]}
            />
          </>
        )}
      </Drawer>
    </PageCard>
  )
}
