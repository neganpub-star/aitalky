import { useEffect, useState } from 'react'
import { Button, Form, Input, Result, Spin, Typography, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthShell from './auth/AuthShell'
import { login, register, sendCode } from '../api/auth'
import { acceptInvite, inviteInfo } from '../api/invite'
import { getToken, saveEnter, saveLogin } from '../auth/session'
import type { InviteInfoVO } from '../types'

const { Title, Text } = Typography

type Mode = 'choose' | 'register' | 'login' | 'nickname'
interface CredVals { email: string; password: string; code: string }
interface NickVals { nickname: string; accessCode?: string }

// 邀请落地页(公开):查邀请信息 → 注册/登录加入 → 设昵称 → 进入工作台
export default function Join() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [info, setInfo] = useState<InviteInfoVO | null>(null)
  const [err, setErr] = useState(false)
  const [mode, setMode] = useState<Mode>('choose')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [form] = Form.useForm()

  useEffect(() => {
    if (!token) { setErr(true); return }
    inviteInfo(token).then(setInfo).catch(() => setErr(true))
    // 已登录(如从"切换项目-待加入"点入):跳过注册/登录,直接到设昵称步
    if (getToken()) setMode('nickname')
  }, [token])

  const startCountdown = () => {
    let n = 60; setCountdown(n)
    const timer = setInterval(() => { n -= 1; setCountdown(n); if (n <= 0) clearInterval(timer) }, 1000)
  }
  const onSendCode = async () => {
    const email = info?.email || form.getFieldValue('email')
    if (!email) { message.warning(t('auth.email')); return }
    try { await sendCode(email, mode === 'register' ? 'REGISTER' : 'LOGIN'); message.success(t('auth.codeSent')) } catch { /* 开发期可用万能码 */ }
    startCountdown()
  }

  // 注册并加入:注册→登录拿账号令牌→去设昵称
  const onRegister = async (v: CredVals) => {
    setLoading(true)
    try {
      await register(v.email, v.password, v.code)
      const r = await login(v.email, v.password, v.code)
      saveLogin(r)
      setMode('nickname')
    } finally { setLoading(false) }
  }
  // 登录并加入
  const onLogin = async (v: CredVals) => {
    setLoading(true)
    try {
      const r = await login(v.email, v.password, v.code)
      saveLogin(r)
      setMode('nickname')
    } finally { setLoading(false) }
  }
  // 设昵称→接受邀请→进入项目
  const onAccept = async (v: NickVals) => {
    setLoading(true)
    try {
      const r = await acceptInvite(token, v.nickname, v.accessCode)
      saveEnter(r, info?.projectName || '')
      message.success(t('invite.joined'))
      nav('/inbox')
    } finally { setLoading(false) }
  }

  if (err) {
    return <AuthShell><Result status="warning" title={t('invite.notFound')} /></AuthShell>
  }
  if (!info) {
    return <AuthShell><div style={{ textAlign: 'center', paddingTop: 40 }}><Spin /></div></AuthShell>
  }
  if (!info.valid) {
    return <AuthShell><Result status="warning" title={info.reason || t('invite.invalid')} /></AuthShell>
  }

  // 邮箱邀请:邮箱锁定为受邀邮箱;链接邀请:自由输入
  const emailLocked = info.type === 'email' && !!info.email

  const credForm = (onFinish: (v: CredVals) => void, submitText: string) => (
    <Form form={form} onFinish={onFinish} requiredMark={false} initialValues={{ email: info.email || '' }}>
      <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('auth.email') }]}>
        <Input size="large" variant="filled" prefix={<MailOutlined />} placeholder={t('auth.email')} disabled={emailLocked} />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: t('auth.password') }]}>
        <Input.Password size="large" variant="filled" prefix={<LockOutlined />} placeholder={t('auth.password')} />
      </Form.Item>
      <Form.Item name="code" rules={[{ required: true, message: t('auth.code') }]}>
        <Input size="large" variant="filled" placeholder={t('auth.code')}
          suffix={countdown > 0 ? <Text type="secondary">{countdown}s</Text> : <a onClick={onSendCode}>{t('auth.getCode')}</a>} />
      </Form.Item>
      <Button type="primary" size="large" htmlType="submit" loading={loading} block>{submitText}</Button>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <a onClick={() => { setMode('choose'); form.resetFields() }}>{t('auth.back')}</a>
      </div>
    </Form>
  )

  return (
    <AuthShell>
      {mode === 'choose' && (
        <div style={{ textAlign: 'center' }}>
          <Title style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>
            {t('invite.inviteYouJoin', { project: info.projectName })}
          </Title>
          <Text type="secondary">{t('invite.invitedBy', { name: info.inviterName || '-', role: info.roleName || '-' })}</Text>
          <div style={{ marginTop: 32 }}>
            <Button type="primary" size="large" block onClick={() => { form.resetFields(); setMode('register') }}>
              {t('invite.registerJoin')}
            </Button>
            <div style={{ marginTop: 14 }}>
              <Text type="secondary">{t('invite.hasAccount')}</Text>{' '}
              <a onClick={() => { form.resetFields(); setMode('login') }}>{t('invite.loginJoin')}</a>
            </div>
          </div>
        </div>
      )}

      {mode === 'register' && (
        <>
          <Title style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>{t('invite.welcomeJoin', { project: info.projectName })}</Title>
          {credForm(onRegister, t('invite.registerJoin'))}
        </>
      )}
      {mode === 'login' && (
        <>
          <Title style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>{t('invite.welcomeJoin', { project: info.projectName })}</Title>
          {credForm(onLogin, t('invite.loginJoin'))}
        </>
      )}
      {mode === 'nickname' && (
        <>
          <Title style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>{t('invite.welcomeTeam', { project: info.projectName })}</Title>
          <Text type="secondary">{t('invite.setNicknameHint')}</Text>
          <Form form={form} onFinish={onAccept} requiredMark={false} style={{ marginTop: 24 }}>
            <Form.Item name="nickname" rules={[{ required: true, max: 40, message: t('invite.nicknamePh') }]}>
              <Input size="large" variant="filled" maxLength={40} showCount placeholder={t('invite.nicknamePh')} />
            </Form.Item>
            {info.needCode && (
              <Form.Item name="accessCode" rules={[{ required: true, message: t('invite.accessCodePh') }]}>
                <Input size="large" variant="filled" placeholder={t('invite.accessCodePh')} />
              </Form.Item>
            )}
            <Button type="primary" size="large" htmlType="submit" loading={loading} block>{t('invite.joinTeam')}</Button>
          </Form>
        </>
      )}
    </AuthShell>
  )
}
