import { useRef, useState } from 'react'
import { Button, Form, Input, Typography, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthShell from './auth/AuthShell'
import { register, sendCode } from '../api/auth'

const { Title, Text } = Typography

// 注册:第一步 邮箱+密码,第二步 邮箱验证码(与登录同款两步式)
export default function Register() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [form] = Form.useForm()
  const [step, setStep] = useState<'cred' | 'code'>('cred')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const creds = useRef<{ email: string; password: string }>({ email: '', password: '' })

  const startCountdown = () => {
    let n = 60
    setCountdown(n)
    const timer = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n <= 0) clearInterval(timer)
    }, 1000)
  }

  const onCred = async (v: { email: string; password: string }) => {
    setLoading(true)
    creds.current = { email: v.email, password: v.password }
    try {
      await sendCode(v.email, 'REGISTER')
      message.success(t('auth.codeSent'))
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
      setStep('code')
      startCountdown()
    }
  }

  const onCode = async (code: string) => {
    setLoading(true)
    try {
      await register(creds.current.email, creds.current.password, code)
      message.success(t('auth.registerOk'))
      nav('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {step === 'cred' ? (
        <>
          <Title style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>{t('auth.registerTitle')}</Title>
          <div style={{ marginBottom: 28 }}>
            <Text type="secondary">{t('auth.haveAccount')}</Text> <Link to="/login">{t('auth.loginNow')}</Link>
          </div>
          <Form form={form} onFinish={onCred} requiredMark={false}>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('auth.email') }]}>
              <Input size="large" variant="filled" prefix={<MailOutlined />} placeholder={t('auth.email')} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, min: 6, message: t('auth.passwordMin') }]}>
              <Input.Password size="large" variant="filled" prefix={<LockOutlined />} placeholder={t('auth.passwordMin')} />
            </Form.Item>
            <Button type="primary" size="large" htmlType="submit" loading={loading} block style={{ marginTop: 8 }}>
              {t('auth.next')}
            </Button>
          </Form>
        </>
      ) : (
        <>
          <Title style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{t('auth.emailVerify')}</Title>
          <div style={{ marginBottom: 28 }}>
            {countdown > 0 ? (
              <Text type="secondary">{t('auth.resendIn', { n: countdown })}</Text>
            ) : (
              <a onClick={() => sendCode(creds.current.email, 'REGISTER').finally(startCountdown)}>{t('auth.resend')}</a>
            )}
          </div>
          <Input.OTP length={6} size="large" onChange={(v) => v.length === 6 && onCode(v)} disabled={loading} />
          <div style={{ marginTop: 24 }}>
            <a onClick={() => setStep('cred')}>{t('auth.back')}</a>
          </div>
        </>
      )}
    </AuthShell>
  )
}
