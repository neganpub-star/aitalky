import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { deleteRole, listFunctions, listRoles, saveRole } from '../api/resources'
import type { FunctionDef, RoleVO } from '../types'
import PageCard from '../components/PageCard'
import FormSection from '../components/FormSection'

export default function Roles() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<RoleVO[]>([])
  const [functions, setFunctions] = useState<FunctionDef[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RoleVO | null>(null)
  const [form] = Form.useForm()

  // 功能码 → 当前语言显示名(勾选项/表格标签共用)
  const fnLabel = useMemo(() => {
    const en = i18n.language === 'en_US'
    return (code: string) => {
      const f = functions.find((x) => x.code === code)
      return f ? (en ? f.enName : f.zhName) : code
    }
  }, [functions, i18n.language])

  const load = async () => {
    setLoading(true)
    try { setData(await listRoles()) } finally { setLoading(false) }
  }
  useEffect(() => {
    listFunctions().then(setFunctions)
    load()
  }, [])

  const openModal = (r?: RoleVO) => {
    setEditing(r || null)
    form.setFieldsValue(r ? { name: r.name, permissions: r.permissions } : { name: '', permissions: [] })
    setOpen(true)
  }
  const submit = async () => {
    const v = await form.validateFields()
    await saveRole({ ...v, id: editing?.id })
    message.success(t('common.saved'))
    setOpen(false)
    load()
  }
  const remove = async (r: RoleVO) => {
    try {
      await deleteRole(r.id)
      message.success(t('common.deleted'))
      load()
    } catch {
      // 后端 ROLE_IN_USE 已被全局拦截弹错;此处兜底提示
    }
  }

  const columns: ColumnsType<RoleVO> = [
    { title: t('roles.name'), dataIndex: 'name', width: 180 },
    {
      title: t('roles.permissions'), dataIndex: 'permissions',
      render: (ps: string[]) => (ps && ps.length
        ? <Space size={[4, 4]} wrap>{ps.map((p) => <Tag key={p}>{fnLabel(p)}</Tag>)}</Space>
        : '-'),
    },
    { title: t('roles.adminCount'), dataIndex: 'adminCount', width: 100 },
    {
      title: t('common.operation'), width: 150,
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>{t('common.edit')}</Button>
          <Popconfirm title={t('common.deleteConfirm')} disabled={r.adminCount > 0} onConfirm={() => remove(r)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={r.adminCount > 0}>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageCard title={t('nav.roles')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('common.add')}</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal title={t('nav.roles')} open={open} onOk={submit} onCancel={() => setOpen(false)} width={560} destroyOnClose>
        <Form form={form} layout="vertical">
          <FormSection title={t('roles.name')} first>
            <Form.Item name="name" label={t('roles.name')} rules={[{ required: true }]}><Input /></Form.Item>
          </FormSection>
          <FormSection title={t('roles.permissions')}>
            <Form.Item name="permissions" label={t('roles.permTip')} style={{ marginBottom: 0 }}>
              <Checkbox.Group style={{ width: '100%' }}>
                <Space direction="vertical" size={10}>
                  {functions.map((f) => (
                    <Checkbox key={f.code} value={f.code}>
                      {i18n.language === 'en_US' ? f.enName : f.zhName}
                      <span style={{ marginLeft: 6, opacity: 0.45, fontSize: 12 }}>({f.code})</span>
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </Form.Item>
          </FormSection>
        </Form>
      </Modal>
    </PageCard>
  )
}
