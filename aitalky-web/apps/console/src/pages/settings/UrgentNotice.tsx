import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Select, Spin, Switch, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { getMessengerConfig, saveMessengerConfig, type MessengerConfigVO, type MessengerI18n } from '../../api/messengerConfig'

const LANG_LABELS: Record<string, string> = {
  zh_CN: '简体中文', en_US: 'English', zh_TW: '繁體中文', ja_JP: '日本語', ko_KR: '한국어',
}

// 会话服务 - 紧急通知设置:按语言设置 urgentEnabled / urgentNotice(复用信使配置接口)
export default function UrgentNotice() {
  const { t } = useTranslation()
  const [cfg, setCfg] = useState<MessengerConfigVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editLang, setEditLang] = useState('zh_CN')

  useEffect(() => {
    getMessengerConfig()
      .then((c) => { setCfg(c); if (c.defaultLanguage) setEditLang(c.defaultLanguage) })
      .catch(() => message.warning(t('mse.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const cur: MessengerI18n = useMemo(() => {
    return cfg?.i18n.find((x) => x.language === editLang)
      || { language: editLang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }
  }, [cfg, editLang])

  const patchI18n = (p: Partial<MessengerI18n>) => setCfg((c) => {
    if (!c) return c
    const rest = c.i18n.filter((x) => x.language !== editLang)
    return { ...c, i18n: [...rest, { ...cur, ...p }] }
  })

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    try {
      await saveMessengerConfig(cfg)
      message.success(t('mse.saved'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !cfg) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin /></div>
  }

  return (
    <Card title={t('mse.urgentTitle')} variant="borderless"
      extra={<Select size="small" value={editLang} onChange={setEditLang} style={{ width: 140 }}
        options={cfg.enabledLanguages.map((c) => ({ value: c, label: LANG_LABELS[c] || c }))} />}>
      <div style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 20 }}>{t('mse.urgentDesc')}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Switch checked={cur.urgentEnabled} onChange={(v) => patchI18n({ urgentEnabled: v })} />
        <span>{t('mse.urgentEnabled')}</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t('mse.urgentContent')}</div>
      <Input.TextArea rows={3} maxLength={512} value={cur.urgentNotice ?? ''} placeholder={t('mse.urgentContentPh')}
        disabled={!cur.urgentEnabled} onChange={(e) => patchI18n({ urgentNotice: e.target.value })} />

      <div style={{ marginTop: 20 }}>
        <Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button>
      </div>
    </Card>
  )
}
