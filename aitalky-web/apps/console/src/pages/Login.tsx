import { useRef, useState } from 'react'
import { Button, Checkbox, Form, Input, Typography, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthShell from './auth/AuthShell'
import { login, sendCode } from '../api/auth'
import { saveLogin } from '../auth/session'

const { Title, Text } = Typography

// 登录:第一步 邮箱+密码,第二步 邮箱验证码(参照 aitalky 两步式;开发期验证码用 888888)
export default function Login() {
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
      await sendCode(v.email, 'LOGIN')
      message.success(t('auth.codeSent'))
    } catch {
      /* 发码失败不阻断:开发期可用万能码 */
    } finally {
      setLoading(false)
      setStep('code')
      startCountdown()
    }
  }

  const onCode = async (code: string) => {
    setLoading(true)
    try {
      const r = await login(creds.current.email, creds.current.password, code)
      saveLogin(r)
      message.success(t('auth.loginOk'))
      nav('/projects')
    } finally {
      setLoading(false)
    }
  }

  const resend = () => {
    sendCode(creds.current.email, 'LOGIN').finally(startCountdown)
  }

  return (
    <AuthShell>
      {step === 'cred' ? (
        <>
          <Title style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>{t('auth.welcomeLogin')}</Title>
          <div style={{ marginBottom: 28 }}>
            <Text type="secondary">{t('auth.noAccount')}</Text> <Link to="/register">{t('auth.registerNow')}</Link>
          </div>
          <Form form={form} onFinish={onCred} requiredMark={false}>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('auth.email') }]}>
              <Input size="large" variant="filled" prefix={<MailOutlined />} placeholder={t('auth.email')} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: t('auth.password') }]}>
              <Input.Password size="large" variant="filled" prefix={<LockOutlined />} placeholder={t('auth.password')} />
            </Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Checkbox>{t('auth.rememberMe')}</Checkbox>
              <a style={{ color: '#999' }}>{t('auth.forgotPassword')}</a>
            </div>
            <Button type="primary" size="large" htmlType="submit" loading={loading} block>
              {t('auth.emailLogin')}
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
              <a onClick={resend}>{t('auth.resend')}</a>
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
