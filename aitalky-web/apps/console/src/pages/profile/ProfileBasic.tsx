import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Avatar, Button, Form, Input, Modal, Popconfirm, Spin, Tag, Upload, message, theme } from 'antd'
import { CopyOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  changeMyEmail,
  changeMyPassword,
  getProfile,
  leaveProject,
  resetMyPassword,
  updateMyAvatar,
  updateMyNickname,
  updateMyUsername,
  type ProfileVO,
} from '../../api/account'
import { sendCode } from '../../api/auth'
import { uploadFile } from '../../api/file'
import { logout } from '../../auth/session'
import { useAppStore } from '../../store/useAppStore'

type ModalKind = null | 'email' | 'password' | 'reset'

// 个人中心 - 基本资料(对齐 ByteTrack):账户信息(用户名/邮箱/密码/邀请码) + 项目成员信息 + 退出项目
export default function ProfileBasic() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const [data, setData] = useState<ProfileVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [editNick, setEditNick] = useState(false)
  const [nickVal, setNickVal] = useState('')
  const [editUser, setEditUser] = useState(false)
  const [userVal, setUserVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const setMember = useAppStore((s) => s.setMember)

  const load = async () => {
    setLoading(true)
    try {
      setData(await getProfile())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const saveNick = async () => {
    const v = nickVal.trim()
    if (!v) {
      message.warning(t('profile.nicknameRequired'))
      return
    }
    setSaving(true)
    try {
      await updateMyNickname(v)
      setData((d) => (d ? { ...d, nickname: v } : d))
      setMember(v, data?.avatar ?? undefined) // 同步左下角头像栏昵称
      setEditNick(false)
      message.success(t('profile.saved'))
    } finally {
      setSaving(false)
    }
  }

  const saveUser = async () => {
    const v = userVal.trim()
    if (!v) {
      message.warning(t('profile.usernameRequired'))
      return
    }
    setSaving(true)
    try {
      await updateMyUsername(v)
      setData((d) => (d ? { ...d, username: v } : d))
      setEditUser(false)
      message.success(t('profile.saved'))
    } finally {
      setSaving(false)
    }
  }

  // 头像:选图片 → 上传 MinIO → 拿 URL → 落库。beforeUpload 返回 false 阻止 antd 默认上传(自己传)
  const beforeAvatarUpload = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      message.warning(t('profile.avatarTypeError'))
      return false
    }
    if (file.size > 2 * 1024 * 1024) {
      message.warning(t('profile.avatarSizeError'))
      return false
    }
    setUploadingAvatar(true)
    uploadFile(file)
      .then(async (url) => {
        await updateMyAvatar(url)
        setData((d) => (d ? { ...d, avatar: url } : d))
        setMember(data?.nickname ?? undefined, url) // 同步左下角头像栏头像
        message.success(t('profile.saved'))
      })
      .finally(() => setUploadingAvatar(false))
    return false
  }

  const copyInvite = async () => {
    if (!data?.inviteCode) return
    try {
      await navigator.clipboard.writeText(data.inviteCode)
      message.success(t('profile.copied'))
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  const onLeave = async () => {
    if (data?.owner) {
      message.warning(t('profile.ownerCannotLeave'))
      return
    }
    setLeaving(true)
    try {
      await leaveProject()
      // 退出后登录态失效,回项目选择页重新进入其它项目
      logout()
      nav('/projects')
    } finally {
      setLeaving(false)
    }
  }

  if (loading || !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin /></div>
  }

  const styles: Record<string, CSSProperties> = {
    page: { maxWidth: 720 },
    h1: { fontWeight: 700, fontSize: 20, marginBottom: 24 },
    section: { fontWeight: 700, fontSize: 16, margin: '28px 0 16px' },
    row: { display: 'flex', alignItems: 'center', minHeight: 30, marginBottom: 14, fontSize: 14 },
    label: { width: 96, flexShrink: 0, color: token.colorTextTertiary },
    val: { color: token.colorText },
    link: { color: token.colorPrimary, cursor: 'pointer', marginLeft: 20 },
    icon: { color: token.colorPrimary, cursor: 'pointer', marginLeft: 16 },
    warn: {
      background: token.colorWarningBg, border: `1px solid ${token.colorWarningBorder}`,
      borderRadius: 8, padding: '12px 16px', color: token.colorText, fontSize: 13, margin: '8px 0 20px', maxWidth: 640,
    },
  }

  return (
    <div style={styles.page}>
      <div style={styles.h1}>{t('profile.basic')}</div>

      {/* 账户信息 */}
      <div style={styles.section}>{t('profile.accountInfo')}</div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.username')}:</span>
        {editUser ? (
          <Input
            size="small"
            autoFocus
            value={userVal}
            disabled={saving}
            style={{ width: 220 }}
            onChange={(e) => setUserVal(e.target.value)}
            onPressEnter={saveUser}
            onBlur={saveUser}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditUser(false) }}
          />
        ) : (
          <>
            <span style={styles.val}>{data.username || '-'}</span>
            <EditOutlined style={styles.icon} onClick={() => { setUserVal(data.username || ''); setEditUser(true) }} />
          </>
        )}
      </div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.email')}:</span>
        <span style={styles.val}>{data.email || '-'}</span>
        <span style={styles.link} onClick={() => setModal('email')}>{t('profile.change')}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.password')}:</span>
        <span style={styles.val}>••••••</span>
        <span style={styles.link} onClick={() => setModal('password')}>{t('profile.change')}</span>
        <span style={styles.link} onClick={() => setModal('reset')}>{t('profile.reset')}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.inviteCode')}:</span>
        <span style={styles.val}>{data.inviteCode || '-'}</span>
        {data.inviteCode && <CopyOutlined style={styles.icon} onClick={copyInvite} />}
      </div>

      {/* 项目成员信息 */}
      <div style={styles.section}>{t('profile.projectMemberInfo')}</div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.currentProject')}:</span>
        <span style={styles.val}>{data.projectName || '-'}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.nickname')}:</span>
        {editNick ? (
          <Input
            size="small"
            autoFocus
            value={nickVal}
            disabled={saving}
            style={{ width: 220 }}
            onChange={(e) => setNickVal(e.target.value)}
            onPressEnter={saveNick}
            onBlur={saveNick}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditNick(false) }}
          />
        ) : (
          <>
            <span style={styles.val}>{data.nickname || '-'}</span>
            {data.roleName && <Tag color="orange" style={{ marginLeft: 12 }}>{data.roleName}</Tag>}
            <EditOutlined style={styles.icon} onClick={() => { setNickVal(data.nickname || ''); setEditNick(true) }} />
          </>
        )}
      </div>
      <div style={{ ...styles.row, alignItems: 'flex-start' }}>
        <span style={{ ...styles.label, marginTop: 6 }}>{t('profile.avatar')}:</span>
        <Upload showUploadList={false} accept="image/*" beforeUpload={beforeAvatarUpload} disabled={uploadingAvatar}>
          <div style={{ position: 'relative', cursor: uploadingAvatar ? 'default' : 'pointer' }}>
            <Avatar size={84} src={data.avatar || undefined} style={{ background: token.colorPrimary, fontSize: 30 }}>
              {(data.nickname || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <span style={{ position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: '50%', background: token.colorBgElevated, boxShadow: token.boxShadowTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploadingAvatar ? <LoadingOutlined style={{ fontSize: 12, color: token.colorPrimary }} /> : <EditOutlined style={{ fontSize: 12, color: token.colorPrimary }} />}
            </span>
          </div>
        </Upload>
      </div>

      {/* 退出项目 */}
      <div style={styles.section}>{t('profile.leaveTitle')}</div>
      <div style={styles.warn}>⚠ {t('profile.leaveWarn')}</div>
      {data.owner ? (
        <Button type="primary" disabled title={t('profile.ownerCannotLeave')}>{t('profile.leaveBtn')}</Button>
      ) : (
        <Popconfirm title={t('profile.leaveConfirm')} okText={t('common.confirm')} cancelText={t('common.cancel')} onConfirm={onLeave}>
          <Button type="primary" danger loading={leaving}>{t('profile.leaveBtn')}</Button>
        </Popconfirm>
      )}

      {/* 更改邮箱 / 更改密码 / 重置密码 弹窗 */}
      <ChangeEmailModal open={modal === 'email'} onClose={() => setModal(null)} onDone={(email) => { setData((d) => (d ? { ...d, email } : d)); setModal(null) }} />
      <ChangePasswordModal open={modal === 'password'} onClose={() => setModal(null)} />
      <ResetPasswordModal open={modal === 'reset'} email={data.email || ''} onClose={() => setModal(null)} />
    </div>
  )
}

// 发送验证码按钮(带 60s 倒计时)
function SendCodeButton({ getEmail, scene }: { getEmail: () => string; scene: 'REGISTER' | 'RESET_PWD' }) {
  const { t } = useTranslation()
  const [countdown, setCountdown] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const send = async () => {
    const email = getEmail()
    if (!email) {
      message.warning(t('profile.emailRequired'))
      return
    }
    try {
      await sendCode(email, scene)
      message.success(t('profile.codeSent'))
      let n = 60
      setCountdown(n)
      timer.current = setInterval(() => {
        n -= 1
        setCountdown(n)
        if (n <= 0 && timer.current) clearInterval(timer.current)
      }, 1000)
    } catch {
      /* 错误已由全局拦截器提示 */
    }
  }

  return (
    <Button disabled={countdown > 0} onClick={send}>
      {countdown > 0 ? t('profile.resendIn', { n: countdown }) : t('profile.getCode')}
    </Button>
  )
}

// 更改邮箱:新邮箱 + 发往新邮箱的验证码
function ChangeEmailModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (email: string) => void }) {
  const { t } = useTranslation()
  const [form] = Form.useForm<{ email: string; code: string }>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!open) form.resetFields() }, [open, form])

  const submit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      await changeMyEmail(v.email, v.code)
      message.success(t('profile.saved'))
      onDone(v.email)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={t('profile.changeEmailTitle')} open={open} onCancel={onClose} onOk={submit} confirmLoading={submitting} okText={t('common.confirm')} cancelText={t('common.cancel')} destroyOnClose>
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
        <Form.Item name="email" label={t('profile.newEmail')} rules={[{ required: true, type: 'email', message: t('profile.emailRequired') }]}>
          <Input placeholder={t('profile.newEmail')} />
        </Form.Item>
        <Form.Item label={t('profile.verifyCode')} required>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="code" noStyle rules={[{ required: true, message: t('profile.codeRequired') }]}>
              <Input placeholder={t('profile.verifyCode')} />
            </Form.Item>
            <SendCodeButton scene="REGISTER" getEmail={() => form.getFieldValue('email') || ''} />
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}

// 更改密码:旧密码 + 新密码 + 确认
function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [form] = Form.useForm<{ oldPassword: string; newPassword: string; confirm: string }>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!open) form.resetFields() }, [open, form])

  const submit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      await changeMyPassword(v.oldPassword, v.newPassword)
      message.success(t('profile.saved'))
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={t('profile.changePasswordTitle')} open={open} onCancel={onClose} onOk={submit} confirmLoading={submitting} okText={t('common.confirm')} cancelText={t('common.cancel')} destroyOnClose>
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
        <Form.Item name="oldPassword" label={t('profile.oldPassword')} rules={[{ required: true, message: t('profile.oldPasswordRequired') }]}>
          <Input.Password placeholder={t('profile.oldPassword')} />
        </Form.Item>
        <Form.Item name="newPassword" label={t('profile.newPassword')} rules={[{ required: true, min: 6, max: 32, message: t('profile.passwordRule') }]}>
          <Input.Password placeholder={t('profile.passwordRule')} />
        </Form.Item>
        <Form.Item name="confirm" label={t('profile.confirmPassword')} dependencies={['newPassword']} rules={[
          { required: true, message: t('profile.confirmPassword') },
          ({ getFieldValue }) => ({
            validator: (_, value) => (!value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error(t('profile.passwordMismatch')))),
          }),
        ]}>
          <Input.Password placeholder={t('profile.confirmPassword')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// 重置密码:发往本账号邮箱的验证码 + 新密码 + 确认
function ResetPasswordModal({ open, email, onClose }: { open: boolean; email: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [form] = Form.useForm<{ code: string; newPassword: string; confirm: string }>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!open) form.resetFields() }, [open, form])

  const submit = async () => {
    const v = await form.validateFields()
    setSubmitting(true)
    try {
      await resetMyPassword(v.code, v.newPassword)
      message.success(t('profile.saved'))
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={t('profile.resetPasswordTitle')} open={open} onCancel={onClose} onOk={submit} confirmLoading={submitting} okText={t('common.confirm')} cancelText={t('common.cancel')} destroyOnClose>
      <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginBottom: 12 }}>{t('profile.resetTip', { email })}</div>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label={t('profile.verifyCode')} required>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="code" noStyle rules={[{ required: true, message: t('profile.codeRequired') }]}>
              <Input placeholder={t('profile.verifyCode')} />
            </Form.Item>
            <SendCodeButton scene="RESET_PWD" getEmail={() => email} />
          </div>
        </Form.Item>
        <Form.Item name="newPassword" label={t('profile.newPassword')} rules={[{ required: true, min: 6, max: 32, message: t('profile.passwordRule') }]}>
          <Input.Password placeholder={t('profile.passwordRule')} />
        </Form.Item>
        <Form.Item name="confirm" label={t('profile.confirmPassword')} dependencies={['newPassword']} rules={[
          { required: true, message: t('profile.confirmPassword') },
          ({ getFieldValue }) => ({
            validator: (_, value) => (!value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error(t('profile.passwordMismatch')))),
          }),
        ]}>
          <Input.Password placeholder={t('profile.confirmPassword')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
