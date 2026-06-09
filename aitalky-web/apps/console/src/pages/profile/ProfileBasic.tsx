import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Avatar, Button, Input, Popconfirm, Spin, Tag, Upload, message, theme } from 'antd'
import { EditOutlined, LoadingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getProfile, leaveProject, updateMyAvatar, updateMyNickname, type ProfileVO } from '../../api/account'
import { uploadFile } from '../../api/file'
import { logout } from '../../auth/session'

// 个人中心 - 基本资料(对齐 ByteTrack):账户信息 + 项目成员信息 + 退出项目
export default function ProfileBasic() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const [data, setData] = useState<ProfileVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [editNick, setEditNick] = useState(false)
  const [nickVal, setNickVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

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

  // 用户名:账户暂无独立 username 字段,用邮箱前缀展示
  const username = data?.email ? data.email.split('@')[0] : '-'

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
      setEditNick(false)
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
        message.success(t('profile.saved'))
      })
      .finally(() => setUploadingAvatar(false))
    return false
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
        <span style={styles.val}>{username}</span>
        <EditOutlined style={styles.icon} onClick={() => message.info(t('settings.wip'))} />
      </div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.email')}:</span>
        <span style={styles.val}>{data.email || '-'}</span>
        <span style={styles.link} onClick={() => message.info(t('settings.wip'))}>{t('profile.change')}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>{t('profile.password')}:</span>
        <span style={styles.val}>••••••</span>
        <span style={styles.link} onClick={() => message.info(t('settings.wip'))}>{t('profile.change')}</span>
        <span style={styles.link} onClick={() => message.info(t('settings.wip'))}>{t('profile.reset')}</span>
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
    </div>
  )
}
