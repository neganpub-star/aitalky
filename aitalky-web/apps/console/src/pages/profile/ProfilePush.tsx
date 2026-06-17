import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Spin, Switch, message, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { getPushSettings, updatePushSettings, type PushSettingsVO } from '../../api/account'

// 个人中心 - 系统推送(对齐 aitalky):4 类消息 x APP/Web 共 8 个开关
export default function ProfilePush() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [data, setData] = useState<PushSettingsVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPushSettings()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  // 单个开关切换:先本地即时反馈,再整体落库(失败回滚)
  const toggle = async (key: keyof PushSettingsVO, v: boolean) => {
    if (!data || saving) return
    const next: PushSettingsVO = { ...data, [key]: v ? 1 : 0 }
    setData(next)
    setSaving(true)
    try {
      await updatePushSettings(next)
    } catch {
      setData(data) // 回滚
      message.error(t('profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin /></div>
  }

  // 4 类消息,每类对应 APP/Web 两个字段
  const rows: { label: string; app: keyof PushSettingsVO; web: keyof PushSettingsVO }[] = [
    { label: t('profile.pushAssigned'), app: 'assignedApp', web: 'assignedWeb' },
    { label: t('profile.pushUnassigned'), app: 'unassignedApp', web: 'unassignedWeb' },
    { label: t('profile.pushMention'), app: 'mentionApp', web: 'mentionWeb' },
    { label: t('profile.pushNewCustomer'), app: 'newCustomerApp', web: 'newCustomerWeb' },
  ]

  const styles: Record<string, CSSProperties> = {
    grid: { maxWidth: 640 },
    head: { display: 'flex', alignItems: 'center', color: token.colorTextTertiary, fontSize: 13, marginBottom: 18 },
    row: { display: 'flex', alignItems: 'center', fontSize: 14, padding: '14px 0' },
    label: { flex: 1, minWidth: 0 },
    col: { width: 90, flexShrink: 0, textAlign: 'left' },
  }

  return (
    <div style={styles.grid}>
      <div style={styles.head}>
        <span style={styles.label}>{t('profile.pushSettings')}</span>
        <span style={styles.col}>APP</span>
        <span style={styles.col}>Web</span>
      </div>
      {rows.map((r) => (
        <div key={r.app} style={styles.row}>
          <span style={{ ...styles.label, color: token.colorText }}>{r.label}</span>
          <span style={styles.col}>
            <Switch checked={data[r.app] === 1} onChange={(v) => toggle(r.app, v)} />
          </span>
          <span style={styles.col}>
            <Switch checked={data[r.web] === 1} onChange={(v) => toggle(r.web, v)} />
          </span>
        </div>
      ))}
    </div>
  )
}
