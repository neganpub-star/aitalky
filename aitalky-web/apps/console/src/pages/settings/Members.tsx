import { useCallback, useEffect, useState } from 'react'
import {
  Avatar, Button, Card, Dropdown, Form, Input, Modal, Select, Space, Table, Tag, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CrownFilled, MoreOutlined, PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  deleteMember, listRoles, pageMembers, renameMember,
  updateMemberAvatar, updateMemberRole, updateMemberStatus, type MemberQuery,
} from '../../api/member'
import type { MemberVO, RoleVO } from '../../types'

// 成员管理:列表 + 筛选 + 调整角色/重命名/改头像/禁用启用/删除(参照 ByteTrack 成员管理页)
export default function Members() {
  const nav = useNavigate()
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
    message.success('角色已调整')
    reload()
  }
  const onSubmitRename = async () => {
    const { nickname } = await form.validateFields()
    await renameMember(renameModal!.id, nickname)
    setRenameModal(null)
    message.success('已重命名')
    reload()
  }
  const onSubmitAvatar = async () => {
    const { avatar } = await form.validateFields()
    await updateMemberAvatar(avatarModal!.id, avatar)
    setAvatarModal(null)
    message.success('头像已更新')
    reload()
  }

  const toggleStatus = (m: MemberVO) => {
    Modal.confirm({
      title: m.status === 1 ? '禁用该成员?' : '启用该成员?',
      onOk: async () => {
        await updateMemberStatus(m.id, m.status === 1 ? 0 : 1)
        message.success('操作成功')
        reload()
      },
    })
  }
  const removeMember = (m: MemberVO) => {
    Modal.confirm({
      title: `删除成员「${m.nickname}」?`,
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteMember(m.id)
        message.success('已删除')
        reload()
      },
    })
  }

  const columns: ColumnsType<MemberVO> = [
    {
      title: '成员信息', dataIndex: 'nickname',
      render: (_, m) => (
        <Space>
          <Avatar src={m.avatar || undefined} icon={<UserOutlined />} />
          <span>{m.nickname || '-'}</span>
          {m.roleName === '负责人' && <CrownFilled style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    { title: '邮箱', dataIndex: 'email' },
    { title: '角色', dataIndex: 'roleName', render: (v) => <Tag color="blue">{v}</Tag> },
    {
      title: '在线状态', dataIndex: 'onlineStatus',
      render: (v) => (v === 1
        ? <Tag color="green">在线</Tag>
        : <Tag>离线</Tag>),
    },
    {
      title: '账号状态', dataIndex: 'status',
      render: (v) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
    },
    {
      title: '操作', width: 180,
      render: (_, m) => {
        // 负责人:仅可重命名;其他成员:调整角色 + 更多(重命名/禁用启用/改头像/删除)
        if (m.roleName === '负责人') {
          return (
            <Button type="link" onClick={() => { setRenameModal(m); form.setFieldsValue({ nickname: m.nickname }) }}>
              重命名
            </Button>
          )
        }
        return (
          <Space>
            <Button type="link" onClick={() => { setRoleModal(m); form.setFieldsValue({ roleId: m.roleId }) }}>调整角色</Button>
            <Dropdown menu={{
              items: [
                { key: 'rename', label: '重命名', onClick: () => { setRenameModal(m); form.setFieldsValue({ nickname: m.nickname }) } },
                { key: 'status', label: m.status === 1 ? '禁用' : '启用', onClick: () => toggleStatus(m) },
                { key: 'avatar', label: '修改头像', onClick: () => { setAvatarModal(m); form.setFieldsValue({ avatar: m.avatar }) } },
                { key: 'delete', label: '删除', danger: true, onClick: () => removeMember(m) },
              ],
            }}>
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <Card
      title="成员管理"
      variant="borderless"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/settings/invites')}>邀请成员</Button>}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="角色" allowClear style={{ width: 140 }}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
          onChange={(roleId) => setQuery((q) => ({ ...q, roleId, page: 1 }))}
        />
        <Select
          placeholder="在线状态" allowClear style={{ width: 120 }}
          options={[{ value: 1, label: '在线' }, { value: 0, label: '离线' }]}
          onChange={(onlineStatus) => setQuery((q) => ({ ...q, onlineStatus, page: 1 }))}
        />
        <Select
          placeholder="账号状态" allowClear style={{ width: 120 }}
          options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]}
          onChange={(status) => setQuery((q) => ({ ...q, status, page: 1 }))}
        />
        <Input.Search
          placeholder="请输入成员昵称" allowClear style={{ width: 220 }} enterButton={<SearchOutlined />}
          onSearch={(keyword) => setQuery((q) => ({ ...q, keyword, page: 1 }))}
        />
      </Space>

      <Table<MemberVO>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{
          current: query.page, pageSize: query.size, total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, size) => setQuery((q) => ({ ...q, page, size })),
        }}
      />

      <Modal title="调整角色" open={!!roleModal} onCancel={() => setRoleModal(null)} onOk={onSubmitRole} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="roleId" label="角色" rules={[{ required: true }]}>
            <Select options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title="重命名" open={!!renameModal} onCancel={() => setRenameModal(null)} onOk={onSubmitRename} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title="修改头像" open={!!avatarModal} onCancel={() => setAvatarModal(null)} onOk={onSubmitAvatar} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="avatar" label="头像 URL" rules={[{ required: true }]}>
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
