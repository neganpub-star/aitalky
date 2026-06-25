import { useEffect, useState } from 'react'
import { Button, Input, Select, Spin, Switch, message, theme } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getMessengerConfig, saveMessengerConfig, type MessengerConfigVO, type MessengerI18n } from '../../api/messengerConfig'
import { langLabel } from '../../constants/languages'
import MessengerPreview from './MessengerPreview'
import { hasFunction } from '../../auth/perm'

// 会话服务 - 紧急通知设置(对齐 aitalky):左=头部总开关+各启用语种内容平铺(/500);右=信使端聊天窗预览(红条随语种变)
export default function UrgentNotice() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const lng = i18n.language
  const canEdit = hasFunction('messenger.setting') // 普通成员只读 → 禁用保存
  const [cfg, setCfg] = useState<MessengerConfigVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewLang, setPreviewLang] = useState('zh_CN')

  useEffect(() => {
    getMessengerConfig()
      .then((c) => { setCfg(c); if (c.defaultLanguage) setPreviewLang(c.defaultLanguage) })
      .catch(() => message.warning(t('mse.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const i18nOf = (lang: string): MessengerI18n =>
    cfg?.i18n.find((x) => x.language === lang)
    || { language: lang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }

  // 紧急通知开关是全局的(任一语种 urgentEnabled 即视为开)
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
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* 左:编辑区 */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 680 }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>{t('mse.urgentTitle')}</div>
        <div style={{ background: token.colorBgContainer, borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '18px 20px' }}>
          {/* 头部:Hi 方框图标 + 标题/副标题 + 总开关 + 收起箭头(对齐现网 img.png) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: `0.5px solid ${token.colorBorderSecondary}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${token.colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: token.colorText, flexShrink: 0 }}>Hi</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: token.colorText }}>{t('mse.urgentCardTitle')}</div>
              <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 2 }}>{t('mse.urgentCardDesc')}</div>
            </div>
            <Switch checked={enabled} onChange={toggleEnabled} />
            <DownOutlined style={{ color: token.colorTextQuaternary, fontSize: 13 }} />
          </div>

          {/* 各语种通知内容平铺(对齐现网 img.png:与总开关无关,恒显示可编辑;开关只控是否在信使端展示) */}
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

          <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
            <Button type="primary" loading={saving} disabled={!canEdit} onClick={save}>{t('common.save')}</Button>
          </div>
        </div>
      </div>

      {/* 右:信使端聊天窗预览(占满剩余区域;语言下拉居右上,预览卡居中,对齐参考系统) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>{t('mse.preview')}</span>
          <Select size="small" value={previewLang} onChange={setPreviewLang} style={{ width: 120 }}
            options={cfg.enabledLanguages.map((c) => ({ value: c, label: langLabel(c, lng) }))} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}>
          <div style={{ width: 372 }}>
            <MessengerPreview mode="chat" data={{
              brandName: cfg.brandName, logo: cfg.logo,
              greeting: i18nOf(previewLang).greeting,
              teamIntro: i18nOf(previewLang).teamIntro,
              replyTime: cfg.replyTime,
              urgentNotice: i18nOf(previewLang).urgentNotice,
              urgentEnabled: enabled,
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
