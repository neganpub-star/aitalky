import { useEffect, useState } from 'react'
import { Button, Input, Spin, Switch, message } from 'antd'
import { SmileOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getMessengerConfig, saveMessengerConfig, type MessengerConfigVO, type MessengerI18n } from '../../api/messengerConfig'
import { langLabel } from '../../constants/languages'

// 会话服务 - 紧急通知设置(对齐 ByteTrack img_0):头部总开关 + 各启用语种通知内容平铺(/500)
export default function UrgentNotice() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const [cfg, setCfg] = useState<MessengerConfigVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMessengerConfig()
      .then(setCfg)
      .catch(() => message.warning(t('mse.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const i18nOf = (lang: string): MessengerI18n =>
    cfg?.i18n.find((x) => x.language === lang)
    || { language: lang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }

  // 紧急通知开关是全局的(任一语种 urgentEnabled 即视为开);保存时统一写到所有语种
  const enabled = !!cfg?.i18n.some((x) => x.urgentEnabled)

  const patchI18n = (lang: string, p: Partial<MessengerI18n>) => setCfg((c) => {
    if (!c) return c
    const cur = c.i18n.find((x) => x.language === lang)
      || { language: lang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }
    const rest = c.i18n.filter((x) => x.language !== lang)
    return { ...c, i18n: [...rest, { ...cur, ...p }] }
  })

  // 切换总开关:写到所有启用语种
  const toggleEnabled = (on: boolean) => setCfg((c) => {
    if (!c) return c
    const map = new Map(c.i18n.map((x) => [x.language, x]))
    for (const lang of c.enabledLanguages) {
      const cur = map.get(lang) || { language: lang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }
      map.set(lang, { ...cur, urgentEnabled: on })
    }
    return { ...c, i18n: Array.from(map.values()) }
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
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>{t('mse.urgentTitle')}</div>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '18px 20px' }}>
        {/* 头部:标题 + 总开关 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <SmileOutlined style={{ fontSize: 20 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('mse.urgentTitle')}</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>{t('mse.urgentDesc')}</div>
          </div>
          <Switch checked={enabled} onChange={toggleEnabled} />
        </div>

        {/* 各语种通知内容平铺 */}
        {enabled && (
          <div style={{ paddingTop: 16 }}>
            {cfg.enabledLanguages.map((lang) => (
              <div key={lang} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  {langLabel(lang, lng)}
                  {lang === cfg.defaultLanguage && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#1677ff', background: '#e6f0ff', padding: '1px 6px', borderRadius: 4 }}>{t('mse.defaultTag')}</span>
                  )}
                </div>
                <Input.TextArea rows={3} maxLength={500} showCount value={i18nOf(lang).urgentNotice ?? ''}
                  placeholder={t('mse.urgentContentPh')}
                  onChange={(e) => patchI18n(lang, { urgentNotice: e.target.value })} />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
          <Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button>
        </div>
      </div>
    </div>
  )
}
