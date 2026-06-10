import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, message, theme } from 'antd'
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getCaptcha, login } from '../api/auth'
import { useAdminStore } from '../store/useAdminStore'

export default function Login() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const saveLogin = useAdminStore((s) => s.saveLogin)
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImg, setCaptchaImg] = useState('')
  const [loading, setLoading] = useState(false)

  const refreshCaptcha = async () => {
    try {
      const c = await getCaptcha()
      setCaptchaId(c.captchaId)
      setCaptchaImg(c.image)
    } catch {
      /* 弹错已在拦截器处理 */
    }
  }
  useEffect(() => { refreshCaptcha() }, [])

  const onFinish = async (v: { username: string; password: string; captchaCode: string }) => {
    setLoading(true)
    try {
      const r = await login(v.username, v.password, captchaId, v.captchaCode)
      saveLogin(r)
      message.success('OK')
      nav('/dashboard')
    } catch {
      refreshCaptcha() // 失败刷新验证码(一次性已失效)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: token.colorBgLayout }}>
      <Card style={{ width: 380, boxShadow: token.boxShadowSecondary }}>
        <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 24, color: token.colorPrimary }}>
          {t('login.title')}
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder={t('login.usernamePlaceholder')} size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('login.passwordPlaceholder')} size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="captchaCode" rules={[{ required: true }]}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Input prefix={<SafetyOutlined />} placeholder={t('login.captchaPlaceholder')} size="large" />
              <img
                src={captchaImg}
                onClick={refreshCaptcha}
                title={t('login.refreshCaptcha')}
                style={{ height: 40, width: 120, cursor: 'pointer', borderRadius: 6, border: `1px solid ${token.colorBorder}` }}
                alt="captcha"
              />
            </div>
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            {t('login.submit')}
          </Button>
        </Form>
      </Card>
    </div>
  )
}
