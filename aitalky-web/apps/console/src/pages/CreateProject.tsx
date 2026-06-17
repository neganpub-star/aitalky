import { useState } from 'react'
import { Button, Form, Input, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthShell from './auth/AuthShell'
import { createProject, sendCode } from '../api/auth'
import { getCtx, patchCtx } from '../auth/session'

const { Title, Text } = Typography

interface CreateVals {
  name: string
  code: string
}

// 创建项目(对齐 aitalky「创建项目.」整页;去掉我们没有的站点选择/私有化,保留邮箱验证码)
export default function CreateProject() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [form] = Form.useForm<CreateVals>()
  const ctx = getCtx()
  const email = ctx.email || ''
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const startCountdown = () => {
    let n = 60
    setCountdown(n)
    const timer = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n <= 0) clearInterval(timer)
    }, 1000)
  }

  const onGetCode = async () => {
    if (countdown > 0 || !email) return
    try { await sendCode(email, 'SENSITIVE'); message.success(t('auth.codeSent')) } catch { /* 开发期可用万能码 */ }
    startCountdown()
  }

  const onCreate = async (v: CreateVals) => {
    setLoading(true)
    try {
      const p = await createProject(v.name.trim(), v.code.trim())
      patchCtx({ projects: [...(ctx.projects || []), p] }) // 同步项目列表,返回选择页即可见
      message.success(t('project.created'))
      nav('/projects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <Title style={{ fontSize: 40, fontWeight: 800, marginBottom: 16 }}>{t('project.create')}.</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 28, lineHeight: 1.7 }}>{t('project.desc')}</Text>

      <Form form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>
        <Form.Item name="name" rules={[{ required: true, message: t('project.name') }]}>
          <Input size="large" variant="filled" maxLength={40} showCount placeholder={t('project.name')} />
        </Form.Item>

        <Form.Item name="code" rules={[{ required: true, message: t('project.codePh') }]}>
          <Input size="large" variant="filled" placeholder={`${t('project.emailVerify')}:${email}`}
            suffix={countdown > 0
              ? <span style={{ color: '#999' }}>{countdown}s</span>
              : <a onClick={onGetCode}>{t('auth.getCode')}</a>} />
        </Form.Item>

        <Button type="primary" size="large" htmlType="submit" loading={loading} block style={{ marginTop: 8 }}>
          {t('project.create')}
        </Button>
        <Button size="large" block style={{ marginTop: 12 }} onClick={() => nav('/projects')}>
          {t('common.cancel')}
        </Button>
      </Form>
    </AuthShell>
  )
}
