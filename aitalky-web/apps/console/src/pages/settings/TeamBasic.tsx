import { useEffect, useState } from 'react'
import { Avatar, Button, Input, Select, Spin, Typography, Upload, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { getCurrentProject, transferOwner, updateProject } from '../../api/project'
import { pageMembers } from '../../api/member'
import { uploadFile } from '../../api/file'
import { useAppStore } from '../../store/useAppStore'
import { hasFunction } from '../../auth/perm'
import DangerVerifyModal from './DangerVerifyModal'
import type { MemberVO, ProjectDetailVO } from '../../types'

// 基本信息(对齐现网):Logo + 项目名称 + 负责人 + 保存修改;改名/换Logo/转让 仅负责人
export default function TeamBasic() {
  const { t } = useTranslation()
  const setProject = useAppStore((s) => s.setProject)
  const [detail, setDetail] = useState<ProjectDetailVO | null>(null)
  const [members, setMembers] = useState<MemberVO[]>([])
  const [name, setName] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [ownerMemberId, setOwnerMemberId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const canEdit = hasFunction('project.setting') // 无写权(普通成员只读)→ 禁用保存

  const load = async () => {
    const d = await getCurrentProject()
    setDetail(d); setName(d.name); setLogo(d.logo); setOwnerMemberId(d.ownerMemberId ?? undefined)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { pageMembers({ page: 1, size: 200 }).then((r) => setMembers(r.records)) }, [])

  if (!detail) return <Spin style={{ marginTop: 40 }} />
  const readonly = !detail.isOwner

  const onUpload = async (file: File) => {
    try { setLogo(await uploadFile(file)); message.success(t('team.logoUpdated')) } catch { /* 拦截器已提示 */ }
    return false
  }

  const onSave = async () => {
    // 负责人变更 → 走转让危险流程;否则只更新名称/Logo
    if (ownerMemberId && ownerMemberId !== detail.ownerMemberId) {
      setTransferOpen(true)
      return
    }
    setSaving(true)
    try {
      await updateProject(name, logo)
      setProject(name, logo || undefined) // 同步顶部项目名 + 图标栏 Logo(响应式,无需刷新)
      message.success(t('team.saved'))
      load()
    } finally { setSaving(false) }
  }

  const onTransfer = async (projectName: string, password: string, code: string) => {
    await transferOwner(ownerMemberId!, projectName, password, code)
    message.success(t('team.transferred'))
    load()
  }

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Avatar size={20} src={m.avatar || undefined}>{m.nickname?.charAt(0)}</Avatar>{m.nickname}
      </span>
    ),
  }))
  const newOwnerName = members.find((m) => m.id === ownerMemberId)?.nickname

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>{t('settings.basicInfo')}</div>

      {/* Logo */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 10 }}>Logo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar shape="circle" size={96} src={logo || undefined} style={{ background: '#3a3a3a', fontSize: 22 }}>
            {!logo && (detail.name?.charAt(0) || 'L')}
          </Avatar>
          {!readonly && (
            <div>
              <Upload showUploadList={false} accept=".jpg,.jpeg,.png" beforeUpload={onUpload}>
                <a>{t('team.changeLogo')}</a>
              </Upload>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{t('team.logoHint')}</div>
            </div>
          )}
        </div>
      </div>

      {/* 项目名称 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 10 }}>{t('team.projectName')}</div>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} showCount
          disabled={readonly} style={{ maxWidth: 560 }} />
      </div>

      {/* 负责人 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 10 }}>{t('team.owner')}</div>
        <Select value={ownerMemberId} options={memberOptions} onChange={setOwnerMemberId}
          disabled={readonly} style={{ width: 300 }} />
      </div>

      {!readonly && (
        <Button type="primary" loading={saving} disabled={!canEdit} onClick={onSave}>{t('team.saveChanges')}</Button>
      )}

      <DangerVerifyModal
        open={transferOpen}
        title={<span>⚠ {t('team.transferTitle')}</span>}
        topNode={
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t('team.transferDesc', { project: detail.name, name: newOwnerName || '-' })}
          </Typography.Paragraph>
        }
        onClose={() => setTransferOpen(false)}
        onConfirm={onTransfer}
      />
    </div>
  )
}
