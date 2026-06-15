import { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Descriptions, Input, Modal, Select, Space, Table, Tabs, Tag, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  buildJoinUrl, disableLinkInvite, linkInviteDetail, pageEmailInvites, pageLinkInvites,
  resendEmailInvite, revokeEmailInvite,
  type EmailInviteQuery, type LinkInviteQuery,
} from '../../api/invite'
import { roleLabel } from '../../auth/roleLabel'
import type { EmailInviteVO, LinkInviteDetailVO, LinkInviteVO } from '../../types'

const { RangePicker } = DatePicker

// 邀请记录(对齐现网):邮箱邀请 + 链接邀请 两个 tab,各带 状态/日期/搜索 筛选
export default function Invites() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [tab, setTab] = useState('email')

  const statusTag = (valid: boolean) =>
    valid ? <span style={{ color: token.colorSuccess }}>{t('invite.valid')}</span>
      : <span style={{ color: token.colorTextTertiary }}>{t('invite.invalid')}</span>

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{t('settings.invites')}</div>
      <Tabs activeKey={tab} onChange={setTab}
        items={[
          { key: 'email', label: t('invite.emailInvite'), children: <EmailTab statusTag={statusTag} /> },
          { key: 'link', label: t('invite.linkInvite'), children: <LinkTab statusTag={statusTag} /> },
        ]} />
    </div>
  )
}

// —— 公共筛选条 ——
function Filters({ q, setQ, searchPh }: {
  q: { status?: number; keyword?: string }
  setQ: (patch: { status?: number; startDate?: string; endDate?: string; keyword?: string; page?: number }) => void
  searchPh: string
}) {
  const { t } = useTranslation()
  // 用 RangePicker 回调的格式化字符串(第二参),避免直接依赖 dayjs 类型
  const onRange = (_: unknown, ds: [string, string]) => {
    setQ({ startDate: ds[0] || undefined, endDate: ds[1] || undefined, page: 1 })
  }
  return (
    <Space style={{ marginBottom: 16 }} wrap>
      <Select placeholder={t('invite.status')} allowClear style={{ width: 130 }}
        value={q.status} onChange={(status) => setQ({ status, page: 1 })}
        options={[{ value: 1, label: t('invite.valid') }, { value: 0, label: t('invite.invalid') }]} />
      <RangePicker format="YYYY-MM-DD" onChange={onRange} />
      <Input.Search placeholder={searchPh} allowClear style={{ width: 240 }} enterButton={<SearchOutlined />}
        onSearch={(keyword) => setQ({ keyword, page: 1 })} />
    </Space>
  )
}

// —— 邮箱邀请 ——
function EmailTab({ statusTag }: { statusTag: (v: boolean) => React.ReactNode }) {
  const { t } = useTranslation()
  const [data, setData] = useState<EmailInviteVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState<EmailInviteQuery>({ page: 1, size: 10 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await pageEmailInvites(q)
      setData(r.records); setTotal(r.total)
    } finally { setLoading(false) }
  }, [q])
  useEffect(() => { load() }, [load])

  const onRevoke = (id: string) => Modal.confirm({
    title: t('invite.confirmRevoke'),
    onOk: async () => { await revokeEmailInvite(id); message.success(t('common.ok')); load() },
  })
  const onResend = async (id: string) => { await resendEmailInvite(id); message.success(t('invite.inviteSent')); load() }

  const columns: ColumnsType<EmailInviteVO> = [
    { title: t('invite.inviter'), dataIndex: 'inviterName', render: (v) => v || '-' },
    { title: t('invite.emailAddr'), dataIndex: 'email' },
    { title: t('invite.joinRole'), dataIndex: 'roleName', render: (v) => roleLabel(v, t) },
    { title: t('invite.member'), dataIndex: 'memberNickname', render: (v) => v || '-' },
    { title: t('invite.status'), dataIndex: 'valid', render: (v) => statusTag(v) },
    { title: t('invite.sendCount'), dataIndex: 'sendCount' },
    { title: t('invite.createTime'), dataIndex: 'createTime' },
    {
      title: t('common.action'), width: 180,
      render: (_, r) => (
        <Space>
          {r.valid && <Button type="link" style={{ padding: 0 }} onClick={() => onRevoke(r.id)}>{t('invite.revoke')}</Button>}
          <Button type="link" style={{ padding: 0 }} onClick={() => onResend(r.id)}>{t('invite.resend')}</Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Filters q={q} setQ={(p) => setQ((s) => ({ ...s, ...p }))} searchPh={t('invite.searchEmailPh')} />
      <Table<EmailInviteVO> rowKey="id" loading={loading} columns={columns} dataSource={data}
        pagination={{ current: q.page, pageSize: q.size, total, showTotal: (n) => t('common.totalN', { n }),
          onChange: (page, size) => setQ((s) => ({ ...s, page, size })) }} />
    </>
  )
}

// —— 链接邀请 ——
function LinkTab({ statusTag }: { statusTag: (v: boolean) => React.ReactNode }) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [data, setData] = useState<LinkInviteVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState<LinkInviteQuery>({ page: 1, size: 10 })
  const [detail, setDetail] = useState<LinkInviteDetailVO | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await pageLinkInvites(q)
      setData(r.records); setTotal(r.total)
    } finally { setLoading(false) }
  }, [q])
  useEffect(() => { load() }, [load])

  const copy = (tk: string) => { navigator.clipboard?.writeText(buildJoinUrl(tk)); message.success(t('invite.copied')) }
  const onDisable = (id: string) => Modal.confirm({
    title: t('invite.confirmDisable'),
    okButtonProps: { danger: true },
    onOk: async () => { await disableLinkInvite(id); message.success(t('common.ok')); load() },
  })

  const columns: ColumnsType<LinkInviteVO> = [
    { title: t('invite.inviter'), dataIndex: 'inviterName', render: (v) => v || '-' },
    { title: t('invite.joinRole'), dataIndex: 'roleName', render: (v) => roleLabel(v, t) },
    { title: t('invite.joinCount'), dataIndex: 'joinCount' },
    { title: t('invite.status'), dataIndex: 'valid', render: (v) => statusTag(v) },
    { title: t('invite.createTime'), dataIndex: 'createTime' },
    {
      title: t('common.action'), width: 220,
      render: (_, r) => (
        <Space split={<span style={{ color: token.colorSplit }}>|</span>}>
          <Button type="link" style={{ padding: 0 }} onClick={async () => setDetail(await linkInviteDetail(r.id))}>{t('invite.detail')}</Button>
          {r.valid && <Button type="link" style={{ padding: 0 }} onClick={() => copy(r.token)}>{t('invite.copyLink')}</Button>}
          {r.valid && <Button type="link" danger style={{ padding: 0 }} onClick={() => onDisable(r.id)}>{t('invite.disable')}</Button>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Filters q={q} setQ={(p) => setQ((s) => ({ ...s, ...p }))} searchPh={t('invite.searchInviterPh')} />
      <Table<LinkInviteVO> rowKey="id" loading={loading} columns={columns} dataSource={data}
        pagination={{ current: q.page, pageSize: q.size, total, showTotal: (n) => t('common.totalN', { n }),
          onChange: (page, size) => setQ((s) => ({ ...s, page, size })) }} />

      <Modal open={!!detail} title={t('invite.detail')} footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
            <Descriptions.Item label={t('invite.joinProject')}>{detail.projectName}</Descriptions.Item>
            <Descriptions.Item label={t('invite.joinRole')}>{roleLabel(detail.roleName, t)}</Descriptions.Item>
            <Descriptions.Item label={t('invite.joinCount')}>{detail.joinCount}</Descriptions.Item>
            <Descriptions.Item label={t('invite.inviteForm')}>
              {detail.accessType === 1 ? t('invite.private') : t('invite.public')}
            </Descriptions.Item>
            {detail.accessType === 1 && (
              <Descriptions.Item label={t('invite.accessCode')}>
                <Tag>{detail.accessCode}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('invite.status')}>{statusTag(detail.valid)}</Descriptions.Item>
            <Descriptions.Item label={t('invite.link')}>
              <Input.TextArea value={buildJoinUrl(detail.token)} readOnly autoSize />
              <Button size="small" style={{ marginTop: 8 }} onClick={() => copy(detail.token)}>{t('invite.copyLink')}</Button>
            </Descriptions.Item>
            <Descriptions.Item label={t('invite.createTime')}>{detail.createTime}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  )
}
