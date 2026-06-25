import { useEffect, useState } from 'react'
import { Button, Input, Select, Switch, Checkbox, Drawer, Upload, Popover, Modal, message, theme, Spin } from 'antd'
import {
  LeftOutlined, SettingFilled, BgColorsOutlined, ProfileOutlined, RightOutlined, PlusOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { allLanguages, langLabel } from '../../constants/languages'
import { WIKI_ICONS, renderWikiIcon } from '../../constants/wikiIcons'
import { uploadFile } from '../../api/file'
import {
  getSite, saveSiteConfig, saveSiteStyle, deleteSite, checkSubdomain, type WikiSiteDetailVO,
} from '../../api/wiki'

// 主题色调色板(对齐参考 img-32)
const THEME_COLORS = ['#2f6bff', '#5c6b77', '#3b5bdb', '#3a93c9', '#2f9e44', '#f59f00', '#e03131', '#ff6b6b', '#7048e8']

// wiki 站点编辑 hub(img-26):站点配置 / 样式配置 / 内容配置 三入口。
export default function WikiSiteEdit() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const canDelete = hasFunction('wiki.app.delete')
  const canEditSite = hasFunction('wiki.app.site')
  const canEditStyle = hasFunction('wiki.app.style')

  const [loading, setLoading] = useState(true)
  const [site, setSite] = useState<WikiSiteDetailVO | null>(null)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)

  const load = () => {
    setLoading(true)
    getSite(id).then(setSite).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  const siteName = site?.i18ns.find((x) => x.lang === site?.defaultLang)?.appName || '-'

  const doDelete = () => {
    Modal.confirm({
      title: t('wiki.deleteAppConfirm'),
      content: t('wiki.deleteAppDesc'),
      okType: 'danger',
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        await deleteSite(id)
        message.success(t('common.deleted'))
        nav('/wiki/sites')
      },
    })
  }

  const langOptions = allLanguages().map((l) => ({ value: l.code, label: langLabel(l.code, i18n.language) }))

  const entryCard = (icon: React.ReactNode, title: string, desc: string, onClick: () => void) => (
    <div
      className="at-card-hover"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 12, cursor: 'pointer',
        background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, marginBottom: 16,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: token.colorFillTertiary,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: token.colorText, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ fontSize: 13, color: token.colorTextTertiary, marginTop: 4 }}>{desc}</div>
      </div>
      <RightOutlined style={{ color: token.colorTextQuaternary }} />
    </div>
  )

  if (loading || !site) {
    return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>
  }

  return (
    <div>
      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 24px', background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorSplit}`,
      }}>
        <LeftOutlined style={{ fontSize: 16, cursor: 'pointer', marginRight: 12 }} onClick={() => nav('/wiki/sites')} />
        <div style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>{siteName}</div>
        <Button type="primary" style={{ marginRight: 12 }} onClick={() => message.info(t('wiki.previewWip'))}>{t('wiki.previewSite')}</Button>
        <Button danger disabled={!canDelete || site.isDefault === 1} onClick={doDelete}>{t('wiki.deleteApp')}</Button>
      </div>

      <div style={{ padding: 24, maxWidth: 1200 }}>
        {entryCard(<SettingFilled />, t('wiki.siteConfig'), t('wiki.siteConfigDesc'), () => setCfgOpen(true))}
        {entryCard(<BgColorsOutlined />, t('wiki.styleConfig'), t('wiki.styleConfigDesc'), () => setStyleOpen(true))}
        {entryCard(<ProfileOutlined />, t('wiki.contentConfig'), t('wiki.contentConfigDesc'), () => nav(`/wiki/sites/${id}/content`))}
      </div>

      <SiteConfigDrawer open={cfgOpen} onClose={() => setCfgOpen(false)} site={site} langOptions={langOptions}
        canManage={canEditSite} onSaved={() => { setCfgOpen(false); load() }} />
      <SiteStyleDrawer open={styleOpen} onClose={() => setStyleOpen(false)} site={site} langOptions={langOptions}
        canManage={canEditStyle} onSaved={() => { setStyleOpen(false); load() }} />
    </div>
  )
}

// ============ 站点配置抽屉(img-27)============
function SiteConfigDrawer({ open, onClose, site, langOptions, canManage, onSaved }: {
  open: boolean; onClose: () => void; site: WikiSiteDetailVO
  langOptions: { value: string; label: string }[]; canManage: boolean; onSaved: () => void
}) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [enabled, setEnabled] = useState(false)
  const [icon, setIcon] = useState<string | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [defaultLang, setDefaultLang] = useState('zh_CN')
  const [enEnabled, setEnEnabled] = useState(false)
  const [subdomain, setSubdomain] = useState('')
  const [domainProto, setDomainProto] = useState('https://')
  const [domainHost, setDomainHost] = useState('')
  const [favicon, setFavicon] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEnabled(site.enabled === 1)
    setIcon(site.icon)
    setDefaultLang(site.defaultLang)
    setEnEnabled(site.multiLang === 1)
    setSubdomain(site.subdomain || '')
    const cd = site.customDomain || ''
    if (cd.startsWith('http://')) { setDomainProto('http://'); setDomainHost(cd.slice(7)) }
    else { setDomainProto('https://'); setDomainHost(cd.startsWith('https://') ? cd.slice(8) : cd) }
    setFavicon(site.favicon)
  }, [open, site])

  const save = async () => {
    if (subdomain && !/^[a-zA-Z0-9]+$/.test(subdomain)) { message.warning(t('wiki.subdomainInvalid')); return }
    setSaving(true)
    try {
      if (subdomain && subdomain !== site.subdomain) {
        const ok = await checkSubdomain(subdomain, site.id)
        if (!ok) { message.warning(t('wiki.subdomainTaken')); setSaving(false); return }
      }
      await saveSiteConfig(site.id, {
        enabled: enabled ? 1 : 0, icon, defaultLang, multiLang: enEnabled ? 1 : 0,
        subdomain: subdomain || null,
        customDomain: domainHost ? domainProto + domainHost : null,
        favicon,
      })
      message.success(t('profile.saved'))
      onSaved()
    } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }

  const onUploadFavicon = async (file: File) => {
    try { setFavicon(await uploadFile(file)) } catch { /* 拦截器已提示 */ }
    return false
  }

  const label = (s: string) => <div style={{ fontSize: 14, margin: '20px 0 8px' }}>{s}</div>
  const iconPicker = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, width: 280 }}>
      {WIKI_ICONS.map((ic) => (
        <div key={ic.key} onClick={() => { setIcon(ic.key); setIconPickerOpen(false) }}
          style={{
            width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            border: `1px solid ${icon === ic.key ? token.colorPrimary : token.colorBorderSecondary}`,
            background: icon === ic.key ? token.colorPrimaryBg : 'transparent',
          }}>{renderWikiIcon(ic.key, { size: 22 })}</div>
      ))}
    </div>
  )

  return (
    <Drawer
      title={t('wiki.siteConfig')} width={560} open={open} onClose={onClose}
      footer={canManage && (
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>{t('common.cancel')}</Button>
          <Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button>
        </div>
      )}
    >
      {label(t('wiki.appStatus'))}
      <Switch checked={enabled} onChange={setEnabled} checkedChildren={t('wiki.enabled')} unCheckedChildren={t('wiki.disabled')} />

      {label(t('wiki.appIcon'))}
      <Popover content={iconPicker} trigger="click" open={iconPickerOpen} onOpenChange={setIconPickerOpen} placement="bottomLeft">
        <div style={{ width: 56, height: 56, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${token.colorBorder}`, cursor: 'pointer' }}>
          {renderWikiIcon(icon, { size: 30 })}
        </div>
      </Popover>

      {label(t('wiki.defaultLang'))}
      <Select value={defaultLang} onChange={setDefaultLang} options={langOptions} style={{ width: '100%' }} showSearch optionFilterProp="label" />

      {label(t('wiki.multiLang'))}
      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: '10px 14px' }}>
        <Checkbox checked disabled style={{ marginRight: 16 }}>{langLabel('zh_CN')}</Checkbox>
        <Checkbox checked={enEnabled} onChange={(e) => setEnEnabled(e.target.checked)}>English</Checkbox>
      </div>

      <div style={{ background: token.colorFillQuaternary, borderRadius: 8, padding: 16, marginTop: 24 }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>{t('wiki.domain')}</div>
        <Input addonBefore={`${location.host}/`} value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="example" />

        <div style={{ fontSize: 14, margin: '20px 0 6px' }}>{t('wiki.customDomain')}</div>
        <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 10, lineHeight: 1.6 }}>{t('wiki.customDomainHint')}</div>
        <Input
          addonBefore={<Select value={domainProto} onChange={setDomainProto} style={{ width: 92 }} options={[{ value: 'https://', label: 'https://' }, { value: 'http://', label: 'http://' }]} />}
          value={domainHost} onChange={(e) => setDomainHost(e.target.value)} placeholder="docs.example.com"
        />
      </div>

      {label('Favicon')}
      <Upload listType="picture-card" showUploadList={false} accept=".ico,.png,.jpg,.jpeg" beforeUpload={onUploadFavicon}>
        {favicon ? <img src={favicon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PlusOutlined />}
      </Upload>
    </Drawer>
  )
}

// ============ 样式配置抽屉(img-32)============
function SiteStyleDrawer({ open, onClose, site, langOptions, canManage, onSaved }: {
  open: boolean; onClose: () => void; site: WikiSiteDetailVO
  langOptions: { value: string; label: string }[]; canManage: boolean; onSaved: () => void
}) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [lang, setLang] = useState(site.defaultLang)
  const [logo, setLogo] = useState<string | null>(null)
  const [brandShort, setBrandShort] = useState('')
  const [appName, setAppName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [themeColor, setThemeColor] = useState<string>(THEME_COLORS[0])
  const [saving, setSaving] = useState(false)

  // 切换语言时回填该语言文案(全局字段 logo/产品简称/主题色不随语言变)
  const fillForLang = (lng: string) => {
    const i = site.i18ns.find((x) => x.lang === lng)
    setAppName(i?.appName || '')
    setTitle(i?.title || '')
    setDescription(i?.description || '')
  }
  useEffect(() => {
    if (!open) return
    setLang(site.defaultLang)
    setLogo(site.logo)
    setBrandShort(site.brandShort || '')
    setThemeColor(site.themeColor || THEME_COLORS[0])
    fillForLang(site.defaultLang)
  }, [open, site])

  const onChangeLang = (lng: string) => { setLang(lng); fillForLang(lng) }

  const save = async () => {
    setSaving(true)
    try {
      await saveSiteStyle(site.id, { lang, logo, brandShort, appName, title, description, themeColor })
      message.success(t('profile.saved'))
      onSaved()
    } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }

  const onUploadLogo = async (file: File) => {
    try { setLogo(await uploadFile(file)) } catch { /* 拦截器已提示 */ }
    return false
  }

  const groupTitle = (s: string) => (
    <div style={{ background: token.colorFillQuaternary, padding: '8px 12px', borderRadius: 6, fontSize: 13, color: token.colorTextSecondary, margin: '20px 0 12px' }}>{s}</div>
  )
  const label = (s: string) => <div style={{ fontSize: 14, margin: '14px 0 8px' }}>{s}</div>

  return (
    <Drawer
      title={t('wiki.styleEdit')} width={560} open={open} onClose={onClose}
      footer={canManage && (
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>{t('common.cancel')}</Button>
          <Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button>
        </div>
      )}
    >
      {groupTitle(t('wiki.langSetting'))}
      {label(t('wiki.lang'))}
      <Select value={lang} onChange={onChangeLang} options={langOptions} style={{ width: 260 }} showSearch optionFilterProp="label" />

      {groupTitle(t('wiki.headerSetting'))}
      {label(t('wiki.appLogo'))}
      <Upload listType="picture-card" showUploadList={false} accept=".png,.jpg,.jpeg" beforeUpload={onUploadLogo}>
        {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PlusOutlined />}
      </Upload>
      {label(t('wiki.brandShort'))}
      <Input value={brandShort} onChange={(e) => setBrandShort(e.target.value)} />
      {label(t('wiki.appName'))}
      <Input value={appName} onChange={(e) => setAppName(e.target.value)} maxLength={40} />

      {groupTitle(t('wiki.bannerText'))}
      {label(t('wiki.bannerTitle'))}
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      {label(t('wiki.bannerDesc'))}
      <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

      {groupTitle(t('wiki.color'))}
      {label(t('wiki.themeColor'))}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {THEME_COLORS.map((c) => (
          <div key={c} onClick={() => setThemeColor(c)}
            style={{
              width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14,
              boxShadow: themeColor === c ? `0 0 0 2px ${token.colorBgContainer}, 0 0 0 4px ${c}` : 'none',
            }}>{themeColor === c ? '✓' : ''}</div>
        ))}
      </div>
    </Drawer>
  )
}
