import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { login, sendCode } from '../api/auth'
import { saveLogin } from '../auth/session'

const { Title, Text } = Typography

/** 登录页:邮箱 + 密码 + 邮箱验证码(2FA)。开发期可用万能码 888888 */
export default function Login() {
  const nav = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const onSendCode = async () => {
    try {
      const email = await form.validateFields(['email'])
      await sendCode(email.email, 'LOGIN')
      message.success('验证码已发送(开发期可直接用 888888)')
      let n = 60
      setCountdown(n)
      const t = setInterval(() => {
        n -= 1
        setCountdown(n)
        if (n <= 0) clearInterval(t)
      }, 1000)
    } catch {
      /* 校验失败由表单提示 */
    }
  }

  const onFinish = async (v: { email: string; password: string; code: string }) => {
    setLoading(true)
    try {
      const r = await login(v.email, v.password, v.code)
      saveLogin(r)
      message.success('登录成功')
      nav('/projects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <Card style={styles.card} variant="borderless">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ marginBottom: 4 }}>aitalky 坐席工作台</Title>
          <Text type="secondary">登录你的客服账号</Text>
        </div>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input size="large" prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
            <Input
              size="large"
              prefix={<SafetyOutlined />}
              placeholder="邮箱验证码"
              addonAfter={
                <Button type="link" style={{ padding: 0 }} disabled={countdown > 0} onClick={onSendCode}>
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item style={{ marginTop: 8 }}>
            <Button type="primary" size="large" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">还没有账号?</Text> <Link to="/register">注册</Link>
        </div>
      </Card>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg,#eef2ff 0%,#f5f7fb 100%)',
  },
  card: { width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', borderRadius: 12 },
}
