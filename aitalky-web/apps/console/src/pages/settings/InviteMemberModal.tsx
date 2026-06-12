import { useEffect, useMemo, useState } from 'react'
import { Modal, Input, Select, Radio, Button, Tabs, Typography, message, theme } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { listRoles } from '../../api/member'
import { buildJoinUrl, createEmailInvites, createLinkInvite } from '../../api/invite'
import { getCtx } from '../../auth/session'
import type { RoleVO } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  /** 创建成功(刷新邀请记录) */
  onDone?: () => void
}

// 邀请成员弹窗(对齐现网):邮箱邀请(单个/批量)+ 链接邀请(公开/私密)
export default function InviteMemberModal({ open, onClose, onDone }: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [tab, setTab] = useState('email')
  const [roles, setRoles] = useState<RoleVO[]>([])
  const [roleId, setRoleId] = useState<string>()
  const [loading, setLoading] = useState(false)

  // 邮箱邀请
  const [batch, setBatch] = useState(false)
  const [emailText, setEmailText] = useState('')

  // 链接邀请
  const [accessType, setAccessType] = useState(0)
  const [genLink, setGenLink] = useState<{ url: string; code: string | null } | null>(null)

  // 可选角色:排除「负责人」(不可邀请为负责人)
  const roleOptions = useMemo(
    () => roles.filter((r) => r.name !== '负责人').map((r) => ({ value: r.id, label: r.name })),
    [roles],
  )

  useEffect(() => {
    if (!open) return
    setTab('email'); setBatch(false); setEmailText(''); setAccessType(0); setGenLink(null)
    listRoles().then((rs) => {
      setRoles(rs)
      // 默认选「普通成员」
      const def = rs.find((r) => r.name === '普通成员') ?? rs.find((r) => r.name !== '负责人')
      setRoleId(def?.id)
    })
  }, [open])

  const onInvite = async () => {
    const emails = emailText.split(/[,，\s]+/).map((e) => e.trim()).filter(Boolean)
    if (emails.length === 0) { message.warning(t('invite.emailRequired')); return }
    if (!roleId) { message.warning(t('invite.roleRequired')); return }
    setLoading(true)
    try {
      await createEmailInvites(emails, roleId)
      message.success(t('invite.inviteSent'))
      onDone?.()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const onGenerate = async () => {
    if (!roleId) { message.warning(t('invite.roleRequired')); return }
    setLoading(true)
    try {
      const link = await createLinkInvite(roleId, accessType)
      setGenLink({ url: buildJoinUrl(link.token), code: accessType === 1 ? null : null })
      // 私密链接的验证码在详情里看;生成后这里也展示一次
      onDone?.()
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
    message.success(t('invite.copied'))
  }

  const roleField = (
    <div style={{ marginBottom: 4 }}>
      <div style={{ marginBottom: 8 }}>{t('invite.role')}</div>
      <Select style={{ width: '100%' }} value={roleId} options={roleOptions} onChange={setRoleId} />
    </div>
  )

  // 链接已生成:展示链接 + 复制
  const linkResult = genLink && (
    <div>
      <div style={{ marginBottom: 8, color: token.colorTextSecondary }}>{t('invite.linkGenerated')}</div>
      <Input.TextArea value={genLink.url} readOnly autoSize={{ minRows: 2, maxRows: 3 }} />
      <Button type="primary" icon={<CopyOutlined />} style={{ marginTop: 12 }} onClick={() => copy(genLink.url)}>
        {t('invite.copyLink')}
      </Button>
      {accessType === 1 && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          {t('invite.privateHint')}
        </Typography.Paragraph>
      )}
    </div>
  )

  const emailTab = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span>{t('invite.emailLabel')}</span>
        <a onClick={() => setBatch(!batch)}>{batch ? t('invite.singleInput') : t('invite.batchInput')} →</a>
      </div>
      {batch ? (
        <Input.TextArea value={emailText} onChange={(e) => setEmailText(e.target.value)}
          placeholder={t('invite.batchPh')} autoSize={{ minRows: 4, maxRows: 8 }} />
      ) : (
        <Input value={emailText} onChange={(e) => setEmailText(e.target.value)} placeholder={t('invite.emailPh')} />
      )}
      <div style={{ marginTop: 16 }}>{roleField}</div>
    </div>
  )

  const linkTab = genLink ? linkResult : (
    <div>
      <div style={{ marginBottom: 8 }}>{t('invite.joinProject')}</div>
      <Input value={getCtx().projectName} disabled style={{ marginBottom: 16 }} />
      {roleField}
      <div style={{ marginTop: 16, marginBottom: 8 }}>{t('invite.inviteForm')}</div>
      <Radio.Group value={accessType} onChange={(e) => setAccessType(e.target.value)}>
        <div><Radio value={0}>{t('invite.public')}<span style={{ color: token.colorTextTertiary, marginLeft: 8 }}>{t('invite.publicDesc')}</span></Radio></div>
        <div style={{ marginTop: 8 }}><Radio value={1}>{t('invite.private')}<span style={{ color: token.colorTextTertiary, marginLeft: 8 }}>{t('invite.privateDesc')}</span></Radio></div>
      </Radio.Group>
    </div>
  )

  const footer = tab === 'email'
    ? [
        <Button key="c" onClick={onClose}>{t('common.cancel')}</Button>,
        <Button key="ok" type="primary" loading={loading} onClick={onInvite}>{t('invite.invite')}</Button>,
      ]
    : genLink
      ? [<Button key="done" type="primary" onClick={onClose}>{t('common.done')}</Button>]
      : [
          <Button key="c" onClick={onClose}>{t('common.cancel')}</Button>,
          <Button key="ok" type="primary" loading={loading} onClick={onGenerate}>{t('invite.genLink')}</Button>,
        ]

  return (
    <Modal open={open} onCancel={onClose} footer={footer} width={520} destroyOnClose>
      <Tabs activeKey={tab} onChange={(k) => { setTab(k); setGenLink(null) }}
        items={[
          { key: 'email', label: t('invite.emailInvite'), children: emailTab },
          { key: 'link', label: t('invite.linkInvite'), children: linkTab },
        ]} />
    </Modal>
  )
}
