import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Spin, Switch, message, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { getProfile, updatePreferences } from '../../api/account'

// 个人中心 - 系统推送:声音提醒 / 桌面通知(落库到成员 soundEnabled / pushEnabled)
export default function ProfilePush() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [sound, setSound] = useState(true)
  const [push, setPush] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile()
      .then((p) => {
        setSound(p.soundEnabled !== 0)
        setPush(p.pushEnabled !== 0)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveSound = async (v: boolean) => {
    setSound(v)
    await updatePreferences({ soundEnabled: v ? 1 : 0 })
    message.success(t('profile.saved'))
  }
  const savePush = async (v: boolean) => {
    setPush(v)
    await updatePreferences({ pushEnabled: v ? 1 : 0 })
    message.success(t('profile.saved'))
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin /></div>

  const row: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 480, padding: '14px 0', borderBottom: `0.5px solid ${token.colorSplit}` }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>{t('profile.push')}</div>
      <div style={row}>
        <div>
          <div style={{ fontSize: 14 }}>{t('profile.sound')}</div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 2 }}>{t('profile.soundDesc')}</div>
        </div>
        <Switch checked={sound} onChange={saveSound} />
      </div>
      <div style={row}>
        <div>
          <div style={{ fontSize: 14 }}>{t('profile.pushNotify')}</div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 2 }}>{t('profile.pushDesc')}</div>
        </div>
        <Switch checked={push} onChange={savePush} />
      </div>
    </div>
  )
}
