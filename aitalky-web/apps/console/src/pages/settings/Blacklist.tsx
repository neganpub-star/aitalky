import { useCallback, useEffect, useState } from 'react'
import { Input, Popconfirm, Table, message, theme } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { pageBlacklist, removeBlacklist, type BlacklistVO } from '../../api/blacklist'
import { hasFunction } from '../../auth/perm'

// 信使设置 - 黑名单:顶部搜索 + 列表 + 移除(加入入口在会话详情面板「加入黑名单」)。列对齐参考系统
export default function Blacklist() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const canEdit = hasFunction('blacklist.manage') // 普通成员只读 → 不可移出
  const [data, setData] = useState<BlacklistVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pageBlacklist(page, 10, keyword)
      setData(res.records)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => { load() }, [load])

  const onRemove = async (id: string) => {
    await removeBlacklist(id)
    message.success(t('common.confirm'))
    load()
  }

  // MID 脱敏:保留首尾各3位,中间 ****(对齐参考系统 b3a****c71)
  const maskMid = (v: string | null) => {
    if (!v) return '--'
    return v.length <= 6 ? v : `${v.slice(0, 3)}****${v.slice(-3)}`
  }
  const dash = (v: string | null) => v || '--'

  const columns: ColumnsType<BlacklistVO> = [
    { title: t('blacklist.uid'), dataIndex: 'uid', render: dash },
    { title: t('blacklist.mid'), dataIndex: 'mid', render: maskMid },
    { title: t('blacklist.customerName'), dataIndex: 'customerName', render: dash },
    { title: t('blacklist.contact'), dataIndex: 'contact', render: dash },
    { title: t('blacklist.email'), dataIndex: 'email', render: dash },
    { title: t('blacklist.location'), dataIndex: 'location', render: dash },
    { title: t('blacklist.operator'), dataIndex: 'operatorName', render: dash },
    {
      title: t('blacklist.blacklistTime'),
      dataIndex: 'createTime',
      width: 170,
      render: (v: string | null) => (v ? v.replace('T', ' ').slice(0, 16) : '--'),
    },
    {
      title: t('blacklist.action'),
      width: 120,
      render: (_, r) => (canEdit ? (
        <Popconfirm title={t('blacklist.removeConfirm')} okText={t('common.confirm')} cancelText={t('common.cancel')} onConfirm={() => onRemove(r.id)}>
          <a>{t('blacklist.remove')}</a>
        </Popconfirm>
      ) : <span style={{ color: token.colorTextQuaternary }}>—</span>),
    },
  ]

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>{t('blacklist.title')}</div>
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
        placeholder={t('blacklist.searchPh')}
        style={{ width: 360, marginBottom: 16 }}
        onChange={(e) => { setPage(1); setKeyword(e.target.value) }}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        locale={{ emptyText: t('blacklist.empty') }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true }}
      />
    </div>
  )
}
