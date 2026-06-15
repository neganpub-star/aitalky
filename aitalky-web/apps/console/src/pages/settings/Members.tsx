import { useCallback, useEffect, useState } from 'react'
import {
  Avatar, Button, Dropdown, Form, Input, Modal, Select, Space, Table, message, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CrownFilled, DeleteOutlined, EditOutlined, LockOutlined, MoreOutlined, PictureOutlined,
  PlusOutlined, SearchOutlined, UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  deleteMember, listRoles, pageMembers, renameMember,
  updateMemberAvatar, updateMemberRole, updateMemberStatus, type MemberQuery,
} from '../../api/member'
import InviteMemberModal from './InviteMemberModal'
import { roleLabel } from '../../auth/roleLabel'
import type { MemberVO, RoleVO } from '../../types'

const OWNER_ROLE = '负责人'

// 邮箱脱敏:本地部分保留前 3 位 + ****,与现网展示一致(wky****@126.com)
function maskEmail(email?: string) {
  if (!email) return '-'
  const at = email.indexOf('@')
  if (at <= 0) return email
  const local = email.slice(0, at)
  const keep = local.slice(0, Math.min(3, local.length))
  return `${keep}****${email.slice(at)}`
}

// 成员管理(对齐现网):扁平页(标题+邀请成员) + 筛选 + 成员表(调整角色/重命名/禁用启用/改头像/删除)
export default function Members() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [data, setData] = useState<MemberVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<RoleVO[]>([])
  const [query, setQuery] = useState<MemberQuery>({ page: 1, size: 10 })

  // 弹窗状态
  const [roleModal, setRoleModal] = useState<MemberVO | null>(null)
  const [renameModal, setRenameModal] = useState<MemberVO | null>(null)
  const [avatarModal, setAvatarModal] = useState<MemberVO | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pageMembers(query)
      setData(res.records)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { load() }, [load])
  useEffect(() => { listRoles().then(setRoles) }, [])

  const reload = () => setQuery((q) => ({ ...q }))

  const onSubmitRole = async () => {
    const { roleId } = await form.validateFields()
    await updateMemberRole(roleModal!.id, roleId)
    setRoleModal(null)
    message.success(t('member.roleAdjusted'))
    reload()
  }
  const onSubmitRename = async () => {
    const { nickname } = await form.validateFields()
    await renameMember(renameModal!.id, nickname)
    setRenameModal(null)
    message.success(t('member.renamed'))
    reload()
  }
  const onSubmitAvatar = async () => {
    const { avatar } = await form.validateFields()
    await updateMemberAvatar(avatarModal!.id, avatar)
    setAvatarModal(null)
    message.success(t('member.avatarUpdated'))
    reload()
  }

  const toggleStatus = (m: MemberVO) => {
    Modal.confirm({
      title: m.status === 1 ? t('member.confirmDisable') : t('member.confirmEnable'),
      onOk: async () => {
        await updateMemberStatus(m.id, m.status === 1 ? 0 : 1)
        message.success(t('common.ok'))
        reload()
      },
    })
  }
  const removeMember = (m: MemberVO) => {
    Modal.confirm({
      title: t('member.confirmDelete', { name: m.nickname }),
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteMember(m.id)
        message.success(t('member.deleted'))
        reload()
      },
    })
  }

  const openRename = (m: MemberVO) => { setRenameModal(m); form.setFieldsValue({ nickname: m.nickname }) }

  const columns: ColumnsType<MemberVO> = [
    {
      title: t('member.colInfo'), dataIndex: 'nickname',
      render: (_, m) => (
        <Space>
          <Avatar size={32} src={m.avatar || undefined} icon={<UserOutlined />} />
          <span>{m.nickname || '-'}</span>
          {m.roleName === OWNER_ROLE && <CrownFilled style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    { title: t('member.colEmail'), dataIndex: 'email', render: (v) => maskEmail(v) },
    { title: t('member.colRole'), dataIndex: 'roleName', render: (v) => roleLabel(v, t) },
    {
      title: t('member.colOnline'), dataIndex: 'workStatus', width: 140,
      render: (v) => (
        <Space size={6}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: v === 1 ? token.colorSuccess : token.colorTextQuaternary,
          }} />
          <span style={{ color: v === 1 ? token.colorText : token.colorTextSecondary }}>
            {v === 1 ? t('member.online') : t('member.offline')}
          </span>
        </Space>
      ),
    },
    {
      title: t('common.action'), width: 160, align: 'right',
      render: (_, m) => {
        // 负责人:仅可重命名;其他成员:调整角色 | 更多(重命名/禁用启用/改头像/删除)
        if (m.roleName === OWNER_ROLE) {
          return <Button type="link" style={{ padding: 0 }} onClick={() => openRename(m)}>{t('member.rename')}</Button>
        }
        return (
          <Space split={<span style={{ color: token.colorSplit }}>|</span>} size={4}>
            <Button type="link" style={{ padding: 0 }}
              onClick={() => { setRoleModal(m); form.setFieldsValue({ roleId: m.roleId }) }}>{t('member.adjustRole')}</Button>
            <Dropdown menu={{
              items: [
                { key: 'rename', icon: <EditOutlined />, label: t('member.rename'), onClick: () => openRename(m) },
                { key: 'status', icon: <LockOutlined />, label: m.status === 1 ? t('member.disable') : t('member.enable'), onClick: () => toggleStatus(m) },
                { key: 'avatar', icon: <PictureOutlined />, label: t('member.changeAvatar'), onClick: () => { setAvatarModal(m); form.setFieldsValue({ avatar: m.avatar }) } },
                { key: 'delete', icon: <DeleteOutlined />, label: t('member.delete'), danger: true, onClick: () => removeMember(m) },
              ],
            }}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{t('settings.members')}</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>{t('member.invite')}</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <Space wrap>
          <Select
            placeholder={t('member.filterRole')} allowClear style={{ width: 140 }}
            options={roles.map((r) => ({ value: r.id, label: roleLabel(r.name, t) }))}
            onChange={(roleId) => setQuery((q) => ({ ...q, roleId, page: 1 }))}
          />
          <Select
            placeholder={t('member.filterOnline')} allowClear style={{ width: 130 }}
            options={[{ value: 1, label: t('member.online') }, { value: 0, label: t('member.offline') }]}
            onChange={(onlineStatus) => setQuery((q) => ({ ...q, onlineStatus, page: 1 }))}
          />
          <Select
            placeholder={t('member.filterStatus')} allowClear style={{ width: 130 }}
            options={[{ value: 1, label: t('member.enabled') }, { value: 0, label: t('member.disabled') }]}
            onChange={(status) => setQuery((q) => ({ ...q, status, page: 1 }))}
          />
        </Space>
        <Input.Search
          placeholder={t('member.searchPh')} allowClear style={{ width: 260 }} enterButton={<SearchOutlined />}
          onSearch={(keyword) => setQuery((q) => ({ ...q, keyword, page: 1 }))}
        />
      </div>

      <Table<MemberVO>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{
          current: query.page, pageSize: query.size, total,
          showTotal: (n) => t('common.totalN', { n }),
          onChange: (page, size) => setQuery((q) => ({ ...q, page, size })),
        }}
      />

      <Modal title={t('member.adjustRole')} open={!!roleModal} onCancel={() => setRoleModal(null)} onOk={onSubmitRole} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="roleId" label={t('member.role')} rules={[{ required: true }]}>
            {/* 排除「负责人」:负责人全项目唯一,变更走「转让负责人」,不可经调整角色赋予 */}
            <Select options={roles.filter((r) => !(r.isSystem === 1 && r.name === OWNER_ROLE)).map((r) => ({ value: r.id, label: roleLabel(r.name, t) }))} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={t('member.rename')} open={!!renameModal} onCancel={() => setRenameModal(null)} onOk={onSubmitRename} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="nickname" label={t('member.nickname')} rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={t('member.changeAvatar')} open={!!avatarModal} onCancel={() => setAvatarModal(null)} onOk={onSubmitAvatar} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="avatar" label={t('member.avatarUrl')} rules={[{ required: true }]}>
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={reload} />
    </div>
  )
}
