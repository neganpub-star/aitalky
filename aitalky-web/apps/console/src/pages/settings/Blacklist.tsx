import { useCallback, useEffect, useState } from 'react'
import { Card, Popconfirm, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { pageBlacklist, removeBlacklist, type BlacklistVO } from '../../api/blacklist'

// 信使设置 - 黑名单:列表 + 移出(加入入口在会话详情面板「加入黑名单」)
export default function Blacklist() {
  const { t } = useTranslation()
  const [data, setData] = useState<BlacklistVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pageBlacklist(page, 10)
      setData(res.records)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const onRemove = async (id: string) => {
    await removeBlacklist(id)
    message.success(t('common.confirm'))
    load()
  }

  const columns: ColumnsType<BlacklistVO> = [
    {
      title: t('blacklist.targetType'),
      dataIndex: 'targetType',
      width: 120,
      render: (v: number) =>
        v === 1 ? <Tag color="red">{t('blacklist.typeUser')}</Tag> : <Tag>{t('blacklist.typeVisitor')}</Tag>,
    },
    { title: t('blacklist.targetValue'), dataIndex: 'targetValue', ellipsis: true },
    { title: t('blacklist.reason'), dataIndex: 'reason', render: (v: string | null) => v || '--' },
    { title: t('blacklist.createTime'), dataIndex: 'createTime', width: 180, render: (v: string | null) => (v ? v.replace('T', ' ').slice(0, 19) : '--') },
    {
      title: t('blacklist.action'),
      width: 90,
      render: (_, r) => (
        <Popconfirm title={t('blacklist.removeConfirm')} okText={t('common.confirm')} cancelText={t('common.cancel')} onConfirm={() => onRemove(r.id)}>
          <a>{t('blacklist.remove')}</a>
        </Popconfirm>
      ),
    },
  ]

  return (
    <Card title={t('blacklist.title')} variant="borderless">
      <div style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 16 }}>{t('blacklist.desc')}</div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        locale={{ emptyText: t('blacklist.empty') }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />
    </Card>
  )
}
