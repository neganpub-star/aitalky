import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Empty, Input, Modal, Space, Spin, Table, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  createRole, deleteRole, listRoles, renameRole, roleCatalog, rolePermissions, updateRolePermissions,
} from '../../api/role'
import { roleLabel } from '../../auth/roleLabel'
import { hasFunction } from '../../auth/perm'
import type { PermModule, PermNode, RoleVO } from '../../types'

// 角色管理(对齐现网):左栏系统默认 + 自定义角色;右栏权限树(模块/页面/功能 勾选),系统角色只读
export default function RolePage() {
  const { t } = useTranslation()
  const { token } = theme.useToken()

  const [roles, setRoles] = useState<RoleVO[]>([])
  const [catalog, setCatalog] = useState<PermModule[]>([])
  const [current, setCurrent] = useState<RoleVO | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [permLoading, setPermLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 无 role.manage(普通成员只有 role.view)→ 只读:不能改权限/建/删/改名,只能查看
  const canManage = hasFunction('role.manage')
  const readonly = !current || current.isSystem === 1 || !canManage

  const allNodes = useMemo<PermNode[]>(
    () => catalog.flatMap((m) => [...m.pages, ...m.functions]),
    [catalog],
  )

  // 加载角色列表(默认选中第一个系统角色)
  const loadRoles = useCallback(async (selectId?: string) => {
    setLoading(true)
    try {
      const list = await listRoles()
      setRoles(list)
      const pick = (selectId && list.find((r) => r.id === selectId)) || list[0] || null
      setCurrent(pick)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    roleCatalog().then(setCatalog)
    loadRoles()
  }, [loadRoles])

  // 切换角色 → 拉取已勾选权限
  useEffect(() => {
    if (!current) {
      setChecked(new Set())
      return
    }
    setPermLoading(true)
    rolePermissions(current.id)
      .then((p) => setChecked(new Set([...(p.pages || []), ...(p.functions || [])])))
      .finally(() => setPermLoading(false))
  }, [current])

  const toggle = (tokens: string[], on: boolean) => {
    if (readonly) return
    setChecked((prev) => {
      const next = new Set(prev)
      tokens.forEach((tk) => (on ? next.add(tk) : next.delete(tk)))
      return next
    })
  }

  const onSave = async () => {
    if (!current) return
    setSaving(true)
    try {
      const pages = allNodes.filter((n) => n.store === 'page' && checked.has(n.token)).map((n) => n.token)
      const functions = allNodes.filter((n) => n.store === 'function' && checked.has(n.token)).map((n) => n.token)
      await updateRolePermissions(current.id, pages, functions)
      message.success(t('common.done'))
    } finally {
      setSaving(false)
    }
  }

  // 新建 / 重命名(共用输入弹窗)
  const promptName = (title: string, init: string, onOk: (name: string) => Promise<void>) => {
    let val = init
    Modal.confirm({
      title,
      icon: null,
      content: <Input defaultValue={init} maxLength={32} onChange={(e) => (val = e.target.value)} placeholder={t('role.namePh')} />,
      onOk: async () => {
        const name = val.trim()
        if (!name) return Promise.reject()
        await onOk(name)
      },
    })
  }

  const onCreate = () => promptName(t('role.create'), '', async (name) => {
    const r = await createRole(name)
    message.success(t('common.done'))
    await loadRoles(r.id)
  })

  const onRename = (r: RoleVO) => promptName(t('role.rename'), r.name, async (name) => {
    await renameRole(r.id, name)
    message.success(t('common.done'))
    await loadRoles(r.id)
  })

  const onDelete = (r: RoleVO) => Modal.confirm({
    title: t('role.confirmDelete', { name: r.name }),
    okButtonProps: { danger: true },
    onOk: async () => {
      await deleteRole(r.id)
      message.success(t('common.done'))
      await loadRoles()
    },
  })

  const systemRoles = roles.filter((r) => r.isSystem === 1)
  const customRoles = roles.filter((r) => r.isSystem !== 1)

  // —— 权限表列 —— 每行=一个模块,模块/页面/功能 三列
  const cellStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }
  const node = (n: PermNode) => (
    <Checkbox key={n.token} disabled={readonly} checked={checked.has(n.token)}
      onChange={(e) => toggle([n.token], e.target.checked)}>{n.name}</Checkbox>
  )
  const columns: ColumnsType<PermModule> = [
    {
      title: t('role.colModule'), dataIndex: 'name', width: 200,
      render: (_, m) => {
        const tokens = [...m.pages, ...m.functions].map((n) => n.token)
        const all = tokens.every((tk) => checked.has(tk))
        const some = tokens.some((tk) => checked.has(tk))
        return (
          <Checkbox disabled={readonly} checked={all} indeterminate={!all && some}
            onChange={(e) => toggle(tokens, e.target.checked)}>
            <span style={{ fontWeight: 500 }}>{m.name}</span>
          </Checkbox>
        )
      },
    },
    {
      title: t('role.colPage'), width: 240,
      render: (_, m) => <div style={cellStyle}>{m.pages.map(node)}</div>,
    },
    {
      title: t('role.colFunc'),
      render: (_, m) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 32, rowGap: 12, padding: '4px 0' }}>
          {m.functions.length ? m.functions.map(node) : <span style={{ color: token.colorTextQuaternary }}>—</span>}
        </div>
      ),
    },
  ]

  const roleItem = (r: RoleVO, editable: boolean) => {
    const active = current?.id === r.id
    return (
      <div key={r.id} onClick={() => setCurrent(r)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 40, padding: '0 12px', borderRadius: 6, cursor: 'pointer',
          background: active ? token.colorPrimaryBg : 'transparent',
          color: active ? token.colorPrimary : token.colorText,
        }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleLabel(r.name, t)}</span>
        {editable && active && (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <EditOutlined style={{ color: token.colorTextSecondary }} onClick={() => onRename(r)} />
            <DeleteOutlined style={{ color: token.colorError }} onClick={() => onDelete(r)} />
          </Space>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{t('settings.roles')}</div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* 左栏:角色列表 */}
        <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${token.colorBorderSecondary}`, paddingRight: 16 }}>
          <Spin spinning={loading}>
            <div style={{ color: token.colorTextTertiary, fontSize: 12, padding: '0 12px', marginBottom: 4 }}>{t('role.systemGroup')}</div>
            {systemRoles.map((r) => roleItem(r, false))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: token.colorTextTertiary, fontSize: 12, padding: '0 12px', margin: '12px 0 4px' }}>
              <span>{t('role.customGroup')}</span>
              {canManage && <PlusOutlined style={{ cursor: 'pointer', color: token.colorPrimary }} onClick={onCreate} />}
            </div>
            {customRoles.length ? customRoles.map((r) => roleItem(r, canManage))
              : <div style={{ color: token.colorTextQuaternary, fontSize: 13, padding: '8px 12px' }}>{t('role.noCustom')}</div>}
          </Spin>
        </div>

        {/* 右栏:权限树 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{t('role.permissions')}</span>
            {!readonly && <Button type="primary" loading={saving} onClick={onSave}>{t('common.save')}</Button>}
          </div>
          {current ? (
            <Spin spinning={permLoading}>
              <Table<PermModule> rowKey="key" columns={columns} dataSource={catalog} pagination={false} size="middle" />
            </Spin>
          ) : <Empty />}
        </div>
      </div>
    </div>
  )
}
