import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Select, Spin, message } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  getMessengerLanguages, saveMessengerLanguages, type MessengerLanguageVO,
} from '../../api/messengerConfig'
import { LANGUAGES, langLabel } from '../../constants/languages'

// 会话服务 - 常规设置:选择支持的语言(默认语言 + 其他语言),对齐 ByteTrack img_24。
// 语种以后端 mse_messenger_language 表为准;可选语种全集来自 constants/languages(后续改后管字典接口)
export default function General() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const [langs, setLangs] = useState<MessengerLanguageVO[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addCode, setAddCode] = useState<string | undefined>()

  const load = async () => {
    setLoading(true)
    try {
      setLangs(await getMessengerLanguages())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  // 持久化新语种集合(覆盖式),成功后用返回的列表刷新
  const persist = async (next: MessengerLanguageVO[]) => {
    setSaving(true)
    try {
      await saveMessengerLanguages(next)
      setLangs(await getMessengerLanguages())
      message.success(t('mse.saved'))
    } finally {
      setSaving(false)
    }
  }

  const defaultLang = useMemo(() => langs.find((l) => l.isDefault)?.language, [langs])
  const others = useMemo(() => langs.filter((l) => !l.isDefault), [langs])
  // 还能添加的语种(全集 - 已启用)
  const addable = useMemo(
    () => LANGUAGES.filter((d) => !langs.some((l) => l.language === d.code)),
    [langs],
  )

  const setDefault = (language: string) =>
    persist(langs.map((l) => ({ ...l, isDefault: l.language === language })))

  const remove = (language: string) =>
    persist(langs.filter((l) => l.language !== language))

  const add = () => {
    if (!addCode) return
    persist([...langs, { language: addCode, isDefault: false }])
    setAddCode(undefined)
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin /></div>
  }

  const sectionTitle: React.CSSProperties = { fontWeight: 600, fontSize: 14, margin: '20px 0 4px' }
  const sectionDesc: React.CSSProperties = { color: 'rgba(0,0,0,0.45)', fontSize: 12, marginBottom: 12 }

  return (
    <Card variant="borderless" style={{ maxWidth: 720 }}>
      {/* 卡片头 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <GlobalOutlined style={{ fontSize: 20 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{t('gen.langCardTitle')}</div>
          <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12, marginTop: 2 }}>{t('gen.langCardDesc')}</div>
        </div>
      </div>

      {/* 默认语言 */}
      <div style={sectionTitle}>{t('gen.defaultLang')}</div>
      <div style={sectionDesc}>{t('gen.defaultLangDesc')}</div>
      <Select
        style={{ width: 220 }}
        value={defaultLang}
        disabled={saving}
        onChange={setDefault}
        options={langs.map((l) => ({ value: l.language, label: langLabel(l.language, lng) }))}
      />

      {/* 其他语言 */}
      <div style={sectionTitle}>{t('gen.otherLang')}</div>
      <div style={sectionDesc}>{t('gen.otherLangDesc')}</div>
      {others.length === 0 && <div style={{ color: 'rgba(0,0,0,0.35)', fontSize: 13, marginBottom: 12 }}>--</div>}
      {others.map((l) => (
        <div key={l.language} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)', maxWidth: 420,
        }}>
          <span style={{ fontSize: 14 }}>{langLabel(l.language, lng)}</span>
          <span>
            <a onClick={() => !saving && setDefault(l.language)}>{t('gen.setDefault')}</a>
            <a style={{ marginLeft: 16, color: '#ff4d4f' }} onClick={() => !saving && remove(l.language)}>{t('gen.remove')}</a>
          </span>
        </div>
      ))}

      {/* 添加语言 */}
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <Select
          style={{ width: 220 }}
          placeholder={t('gen.addLang')}
          value={addCode}
          disabled={saving || addable.length === 0}
          onChange={setAddCode}
          options={addable.map((d) => ({ value: d.code, label: langLabel(d.code, lng) }))}
          notFoundContent={t('gen.allAdded')}
        />
        <Button type="primary" disabled={!addCode || saving} onClick={add}>{t('gen.add')}</Button>
      </div>
    </Card>
  )
}
