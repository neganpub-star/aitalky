import { useEffect, useState } from 'react'
import {
  Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, message,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import {
  deleteAdmin, listRoles, pageAdmins, resetAdminPassword, saveAdmin, setAdminStatus,
} from '../api/resources'
import type { AdminVO, RoleVO } from '../types'
import PageCard from '../components/PageCard'
import StatusBadge from '../components/StatusBadge'
import FormSection from '../components/FormSection'

export default function Admins() {
  const { t } = useTranslation()
  const [data, setData] = useState<AdminVO[]>([])
  const [roles, setRoles] = useState<RoleVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminVO | null>(null)
  const [form] = Form.useForm()
  // 重置密码弹窗
  const [pwdTarget, setPwdTarget] = useState<AdminVO | null>(null)
  const [pwdForm] = Form.useForm()

  const load = async (p = page, kw = keyword) => {
    setLoading(true)
    try {
      const r = await pageAdmins({ page: p, size: 10, keyword: kw || undefined })
      setData(r.records)
      setTotal(r.total)
      setPage(r.current)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    listRoles().then(setRoles)
    load(1)
  }, [])

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }))

  const openModal = (a?: AdminVO) => {
    setEditing(a || null)
    form.setFieldsValue(a
      ? { username: a.username, realName: a.realName, roleId: a.roleId, status: a.status }
      : { username: '', password: '', realName: '', roleId: undefined, status: 1 })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    await saveAdmin({ ...v, id: editing?.id })
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }

  const toggle = async (a: AdminVO) => {
    await setAdminStatus(a.id, a.status === 1 ? 0 : 1)
    message.success(t('common.saved'))
    load()
  }

  const submitPwd = async () => {
    const v = await pwdForm.validateFields()
    if (pwdTarget) await resetAdminPassword(pwdTarget.id, v.password)
    message.success(t('admins.resetPwdSuccess'))
    setPwdTarget(null)
    pwdForm.resetFields()
  }

  const columns: ColumnsType<AdminVO> = [
    { title: t('admins.username'), dataIndex: 'username', width: 160 },
    { title: t('admins.realName'), dataIndex: 'realName', render: (v) => v || '-' },
    { title: t('admins.role'), dataIndex: 'roleName', render: (v) => v || '-' },
    {
      title: t('common.status'), dataIndex: 'status', width: 90,
      render: (s: number) => <StatusBadge active={s === 1} on={t('common.enabled')} off={t('common.disabled')} offDanger />,
    },
    {
      title: t('common.operation'), width: 280,
      render: (_, a) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(a)}>{t('common.edit')}</Button>
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => { setPwdTarget(a); pwdForm.resetFields() }}>{t('admins.resetPassword')}</Button>
          <Popconfirm
            title={a.status === 1 ? t('admins.disableConfirm') : t('admins.enableConfirm')}
            onConfirm={() => toggle(a)}
          >
            <Button type="link" size="small" danger={a.status === 1}
              icon={a.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}>
              {a.status === 1 ? t('common.disabled') : t('common.enabled')}
            </Button>
          </Popconfirm>
          <Popconfirm title={t('common.deleteConfirm')} onConfirm={async () => { await deleteAdmin(a.id); message.success(t('common.deleted')); load() }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.admins')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('common.add')}</Button>}>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder={t('admins.keyword')}
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

      {/* 新增/编辑 */}
      <Modal title={t('nav.admins')} open={open} onOk={submit} onCancel={() => setOpen(false)} width={520} destroyOnClose>
        <Form form={form} layout="vertical">
          <FormSection title={t('form.basic')} first>
            <Form.Item name="username" label={t('admins.username')} rules={[{ required: true }]}>
              <Input disabled={!!editing} />
            </Form.Item>
            {!editing && (
              <Form.Item name="password" label={t('admins.password')} rules={[{ required: true }]}>
                <Input.Password placeholder={t('admins.passwordPlaceholder')} />
              </Form.Item>
            )}
            <Form.Item name="realName" label={t('admins.realName')}><Input /></Form.Item>
            <Form.Item name="roleId" label={t('admins.role')} rules={[{ required: true }]}>
              <Select options={roleOptions} placeholder={t('admins.role')} />
            </Form.Item>
            <Form.Item name="status" label={t('common.status')} valuePropName="checked" getValueFromEvent={(c) => (c ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })} style={{ marginBottom: 0 }}>
              <Switch checkedChildren={t('common.enabled')} unCheckedChildren={t('common.disabled')} />
            </Form.Item>
          </FormSection>
        </Form>
      </Modal>

      {/* 重置密码 */}
      <Modal title={t('admins.resetPassword')} open={!!pwdTarget} onOk={submitPwd} onCancel={() => setPwdTarget(null)} width={420} destroyOnClose>
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="password" label={`${t('admins.newPassword')}${pwdTarget ? ` - ${pwdTarget.username}` : ''}`} rules={[{ required: true }]}>
            <Input.Password placeholder={t('admins.newPasswordPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </PageCard>
  )
}
