import { useState } from 'react'
import { Button, Form, Input, Typography, message, theme } from 'antd'
import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthShell from './auth/AuthShell'
import AgreementModal from './settings/AgreementModal'
import { register, sendCode } from '../api/auth'

const { Title, Text } = Typography
// 密码规则:大小写字母 + 数字,8-20 位(对齐参考)
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/

// 注册(单页,对齐参考):邮箱 + 密码 + 确认密码 + 邀请码 + 内联邮箱验证码 + 协议。
export default function Register() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [agreement, setAgreement] = useState<string | null>(null) // 协议弹层 type

  const startCountdown = () => {
    let n = 60
    setCountdown(n)
    const timer = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n <= 0) clearInterval(timer)
    }, 1000)
  }

  // 获取验证码:先校验邮箱单字段,再发码并起 60s 倒计时
  const onGetCode = async () => {
    try {
      await form.validateFields(['email'])
    } catch { return }
    const email = form.getFieldValue('email')
    setSending(true)
    try {
      await sendCode(email, 'REGISTER')
      message.success(t('auth.codeSent'))
      startCountdown()
    } catch { /* 拦截器已提示 */ } finally { setSending(false) }
  }

  const onSubmit = async (v: { email: string; password: string; code: string; inviteCode?: string }) => {
    setLoading(true)
    try {
      await register(v.email, v.password, v.code, v.inviteCode)
      message.success(t('auth.registerOk'))
      nav('/login')
    } catch { /* 拦截器已提示 */ } finally { setLoading(false) }
  }

  return (
    <AuthShell>
      <Title style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>{t('auth.registerTitle')}</Title>
      <div style={{ marginBottom: 28 }}>
        <Text type="secondary">{t('auth.haveAccount')}</Text> <Link to="/login">{t('auth.loginNow')}</Link>
      </div>
      <Form form={form} onFinish={onSubmit} requiredMark={false}>
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('auth.email') }]}>
          <Input size="large" variant="filled" prefix={<MailOutlined />} placeholder={t('auth.email')} />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, pattern: PWD_RE, message: t('auth.passwordRule') }]}>
          <Input.Password size="large" variant="filled" prefix={<LockOutlined />} placeholder={t('auth.passwordRule')} />
        </Form.Item>
        <Form.Item name="confirmPassword" dependencies={['password']} rules={[
          { required: true, message: t('auth.passwordRule') },
          ({ getFieldValue }) => ({
            validator: (_, value) =>
              !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error(t('auth.passwordMismatch'))),
          }),
        ]}>
          <Input.Password size="large" variant="filled" prefix={<LockOutlined />} placeholder={t('auth.confirmPassword')} />
        </Form.Item>
        <Form.Item name="inviteCode">
          <Input size="large" variant="filled" prefix={<SafetyOutlined />} placeholder={t('auth.inviteCode')} />
        </Form.Item>
        <Form.Item name="code" rules={[{ required: true, message: t('auth.code') }]}>
          <Input size="large" variant="filled" prefix={<SafetyOutlined />} placeholder={t('auth.code')}
            suffix={countdown > 0
              ? <span style={{ color: token.colorTextTertiary, fontSize: 14 }}>{t('auth.resendIn', { n: countdown })}</span>
              : <a style={{ fontSize: 14, fontWeight: 600 }} onClick={sending ? undefined : onGetCode}>{t('auth.getCode')}</a>} />
        </Form.Item>
        <Button type="primary" size="large" htmlType="submit" loading={loading} block style={{ marginTop: 8 }}>
          {t('auth.registerTitle').replace('.', '')}
        </Button>
      </Form>
      {/* 协议(对齐参考:注册按钮下方居中) */}
      <div style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: token.colorTextSecondary }}>
        {t('auth.agreePrefix')} <a style={{ color: token.colorPrimary, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setAgreement('terms')}>{t('auth.termsLink')}</a>
        {' '}{t('auth.agreeAnd')}{' '}
        <a style={{ color: token.colorPrimary, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setAgreement('privacy')}>{t('auth.privacyLink')}</a>
      </div>
      <AgreementModal type={agreement || 'terms'} open={!!agreement} onClose={() => setAgreement(null)} />
    </AuthShell>
  )
}
