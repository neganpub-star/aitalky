import { useEffect, useState } from 'react'
import { Select, Spin, message, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { getProfile, updatePreferences } from '../../api/account'
import { changeLang } from '../../i18n'

// 个人中心 - 偏好设置:界面语言(落库到成员 language + 即时切换前端)
export default function ProfilePreferences() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [lang, setLang] = useState<string>('zh_CN')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile()
      .then((p) => setLang(p.language || 'zh_CN'))
      .finally(() => setLoading(false))
  }, [])

  const onChange = async (v: string) => {
    setLang(v)
    changeLang(v) // 前端即时切换
    await updatePreferences({ language: v })
    message.success(t('profile.saved'))
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin /></div>

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>{t('profile.preferences')}</div>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>
        <span style={{ width: 96, color: token.colorTextTertiary }}>{t('profile.language')}:</span>
        <Select
          value={lang}
          style={{ width: 200 }}
          onChange={onChange}
          options={[
            { value: 'zh_CN', label: '简体中文' },
            { value: 'en_US', label: 'English' },
          ]}
        />
      </div>
    </div>
  )
}
