import { useEffect, useMemo, useState } from 'react'
import { Modal, Input, Avatar, Tag, Empty, theme } from 'antd'
import { SearchOutlined, CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { pageMembers } from '../../api/member'
import { roleLabel } from '../../auth/roleLabel'
import type { MemberVO } from '../../types'

// 添加成员弹窗(对齐 aitalky img_13/img_16):左=可搜索成员列表(可勾选),右=已选成员;确定回传已选
// 普通分配模式 / 专属分配模式 共用
interface Props {
  open: boolean
  initial?: MemberVO[]
  onCancel: () => void
  onOk: (members: MemberVO[]) => void
}

export default function AddTeammateModal({ open, initial, onCancel, onOk }: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [list, setList] = useState<MemberVO[]>([])
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<MemberVO[]>([])

  useEffect(() => {
    if (!open) return
    setSelected(initial ?? [])
    setKeyword('')
    pageMembers({ page: 1, size: 200 })
      .then((r) => setList(r.records ?? []))
      .catch(() => setList([]))
  }, [open, initial])

  const filtered = useMemo(
    () => list.filter((m) => m.nickname.toLowerCase().includes(keyword.trim().toLowerCase())),
    [list, keyword],
  )

  const isSelected = (id: string) => selected.some((s) => s.id === id)
  const toggle = (m: MemberVO) =>
    setSelected((s) => (isSelected(m.id) ? s.filter((x) => x.id !== m.id) : [...s, m]))

  const roleTagColor = (role: string) =>
    role.includes('管理') ? 'orange' : role.includes('负责') ? 'red' : 'default'

  const memberRow = (m: MemberVO, removable?: boolean) => (
    <div key={m.id} onClick={() => toggle(m)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>
      {!removable && (
        <span style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${isSelected(m.id) ? token.colorPrimary : token.colorBorder}`,
          background: isSelected(m.id) ? token.colorPrimary : token.colorBgContainer,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSelected(m.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
        </span>
      )}
      <Avatar size={26} src={m.avatar || undefined}>{m.nickname.charAt(0)}</Avatar>
      <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nickname}</span>
      <Tag color={roleTagColor(m.roleName)} style={{ marginRight: 0, fontSize: 11 }}>{roleLabel(m.roleName, t)}</Tag>
      {removable && <CloseOutlined style={{ fontSize: 11, color: token.colorTextQuaternary }} />}
    </div>
  )

  return (
    <Modal open={open} title={t('conv.addMemberTitle')} width={620} onCancel={onCancel}
      okText={t('conv.add')} cancelText={t('common.cancel')} onOk={() => onOk(selected)}>
      <div style={{ display: 'flex', gap: 16, height: 420 }}>
        {/* 左:成员列表 */}
        <div style={{ flex: 1, minWidth: 0, border: `0.5px solid ${token.colorBorderSecondary}`, borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 10 }}>
            <Input prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />} placeholder={t('conv.searchMemberPh')}
              value={keyword} onChange={(e) => setKeyword(e.target.value)} allowClear />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 6px' }}>
            {filtered.map((m) => memberRow(m))}
          </div>
        </div>
        {/* 右:已选成员 */}
        <div style={{ width: 240, flexShrink: 0, border: `0.5px solid ${token.colorBorderSecondary}`, borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 12px 8px', fontSize: 13, color: token.colorTextSecondary }}>{t('conv.selectedMember')}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 6px' }}>
            {selected.length === 0
              ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 60 }} description={false} />
              : selected.map((m) => memberRow(m, true))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
