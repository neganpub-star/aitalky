import { useEffect, useState } from 'react'
import { Button, Select, Spin, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { getProfile, updatePreferences } from '../../api/account'
import { changeLang } from '../../i18n'

// 个人中心 - 偏好设置(对齐 ByteTrack):系统语言 + 保存按钮(点保存才落库并切换前端)
export default function ProfilePreferences() {
  const { t } = useTranslation()
  const [lang, setLang] = useState<string>('zh_CN')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getProfile()
      .then((p) => setLang(p.language || 'zh_CN'))
      .finally(() => setLoading(false))
  }, [])

  const onSave = async () => {
    setSaving(true)
    try {
      await updatePreferences({ language: lang })
      changeLang(lang) // 保存成功后切换前端语言
      message.success(t('profile.saved'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin /></div>

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginBottom: 10 }}>{t('profile.language')}</div>
      <Select
        value={lang}
        style={{ width: 416, maxWidth: '100%' }}
        size="large"
        onChange={setLang}
        options={[
          { value: 'zh_CN', label: '简体中文' },
          { value: 'en_US', label: 'English' },
        ]}
      />
      <div style={{ marginTop: 24 }}>
        <Button type="primary" loading={saving} onClick={onSave}>{t('common.save')}</Button>
      </div>
    </div>
  )
}
