import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Tooltip, message, theme } from 'antd'
import {
  UserOutlined, LockOutlined, SafetyOutlined, SunOutlined, MoonOutlined, GlobalOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getCaptcha, login } from '../api/auth'
import { changeLang } from '../i18n'
import { useAdminStore } from '../store/useAdminStore'
import logo from '../assets/logo.png'

export default function Login() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const saveLogin = useAdminStore((s) => s.saveLogin)
  const themeMode = useAdminStore((s) => s.themeMode)
  const toggleTheme = useAdminStore((s) => s.toggleTheme)
  const lang = useAdminStore((s) => s.lang)
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

  const dark = themeMode === 'dark'
  // 登录 hero 始终深色渐变(主题切换时卡片明暗变化即可见);夜间更深一档
  const bg = dark
    ? 'linear-gradient(135deg, #0d1119 0%, #182542 55%, #1f5aa8 150%)'
    : 'linear-gradient(135deg, #1a1f2e 0%, #2b3a67 55%, #409eff 140%)'

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28,
      background: bg, position: 'relative',
    }}>
      {/* 右上角:主题 / 语言切换(登录页也可用) */}
      <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 14 }}>
        <Tooltip title={dark ? t('common.lightMode') : t('common.darkMode')}>
          <span onClick={toggleTheme} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, cursor: 'pointer', display: 'flex' }}>
            {dark ? <SunOutlined /> : <MoonOutlined />}
          </span>
        </Tooltip>
        <Tooltip title={lang === 'en_US' ? '切换中文' : 'Switch to English'}>
          <span
            onClick={() => changeLang(lang === 'en_US' ? 'zh_CN' : 'en_US')}
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <GlobalOutlined style={{ fontSize: 16 }} />
            {lang === 'en_US' ? '中文' : 'EN'}
          </span>
        </Tooltip>
      </div>

      {/* 品牌区:LOGO + 名称(对齐坐席端 LOGO)+ 副标语 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="aitalky" style={{ width: 46, height: 46, borderRadius: 11 }} />
          <span style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>aitalky</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: 2 }}>{t('login.brandTagline')}</span>
      </div>

      <Card style={{ width: 388, boxShadow: '0 16px 48px rgba(0,0,0,0.28)', borderRadius: 14 }} styles={{ body: { padding: '32px 32px 28px' } }}>
        <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 24, color: token.colorText }}>
          {t('login.title')}
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder={t('login.usernamePlaceholder')} size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('login.passwordPlaceholder')} size="large" autoComplete="current-password" />
          </Form.Item>
          {/* 外层只做布局(无 name);内层 noStyle 的 Form.Item 单独绑定 captchaCode 到 Input,
              图作为同级兄弟,避免表单绑定被注入到 div 上导致输入框绑不上值 */}
          <Form.Item required style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Form.Item name="captchaCode" noStyle rules={[{ required: true, message: t('login.captchaPlaceholder') }]}>
                <Input prefix={<SafetyOutlined />} placeholder={t('login.captchaPlaceholder')} size="large" />
              </Form.Item>
              {captchaImg ? (
                <img
                  src={captchaImg}
                  onClick={refreshCaptcha}
                  title={t('login.refreshCaptcha')}
                  style={{ height: 40, width: 120, cursor: 'pointer', borderRadius: 6, border: `1px solid ${token.colorBorder}`, flexShrink: 0 }}
                  alt={t('login.captcha')}
                />
              ) : (
                <div
                  onClick={refreshCaptcha}
                  style={{ height: 40, width: 120, flexShrink: 0, cursor: 'pointer', borderRadius: 6, border: `1px solid ${token.colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: token.colorTextSecondary }}
                >
                  {t('login.refreshCaptcha')}
                </div>
              )}
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
