import { useEffect, useState } from 'react'
import { Button, Input, Select, Switch, Checkbox, Drawer, Upload, Popover, Modal, message, theme, Spin } from 'antd'
import {
  LeftOutlined, SettingFilled, BgColorsOutlined, ProfileOutlined, DownOutlined, RightOutlined, PlusOutlined,
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
import WikiContentPanel from './WikiContentPanel'

const THEME_COLORS = ['#2f6bff', '#5c6b77', '#3b5bdb', '#3a93c9', '#2f9e44', '#f59f00', '#e03131', '#ff6b6b', '#7048e8']

// wiki 站点编辑(对齐参考最新版 img_11/12/13):手风琴三面板——站点配置/样式配置/内容配置 同页内联折叠。
export default function WikiSiteEdit() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const { id = '' } = useParams()
  const canDelete = hasFunction('wiki.app.delete')

  const [loading, setLoading] = useState(true)
  const [site, setSite] = useState<WikiSiteDetailVO | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({ site: true, style: false, content: false })
  const [styleOpen, setStyleOpen] = useState(false)

  const load = () => { setLoading(true); getSite(id).then(setSite).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(load, [id])

  const langOptions = allLanguages().map((l) => ({ value: l.code, label: langLabel(l.code, i18n.language) }))
  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }))

  const doDelete = () => {
    Modal.confirm({
      title: t('wiki.deleteAppConfirm'), content: t('wiki.deleteAppDesc'), okType: 'danger',
      okText: t('common.delete'), cancelText: t('common.cancel'),
      onOk: async () => { await deleteSite(id); message.success(t('common.deleted')); nav('/wiki/sites') },
    })
  }

  if (loading || !site) return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>
  const siteName = site.i18ns.find((x) => x.lang === site.defaultLang)?.appName || '-'

  // 手风琴面板外壳
  const panel = (key: string, icon: React.ReactNode, title: string, desc: string, body: React.ReactNode) => (
    <div style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      <div onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', cursor: 'pointer' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: token.colorFillTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <div style={{ fontSize: 13, color: token.colorTextTertiary, marginTop: 4 }}>{desc}</div>
        </div>
        {open[key] ? <DownOutlined style={{ color: token.colorTextQuaternary }} /> : <RightOutlined style={{ color: token.colorTextQuaternary }} />}
      </div>
      {open[key] && <div style={{ borderTop: `1px solid ${token.colorSplit}`, padding: 24 }}>{body}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}` }}>
        <LeftOutlined style={{ fontSize: 16, cursor: 'pointer', marginRight: 12 }} onClick={() => nav('/wiki/sites')} />
        <div style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>{siteName}</div>
        <Button type="primary" style={{ marginRight: 12 }} disabled={!site.shareCode}
          onClick={() => site.shareCode && window.open(`${location.origin}/#/wiki-site/${site.shareCode}`, '_blank')}>{t('wiki.previewSite')}</Button>
        <Button danger disabled={!canDelete || site.isDefault === 1} onClick={doDelete}>{t('wiki.deleteApp')}</Button>
      </div>

      <div style={{ padding: 24, maxWidth: 1400 }}>
        {panel('site', <SettingFilled />, t('wiki.siteConfig'), t('wiki.siteConfigDesc'),
          <SiteConfigPanel site={site} langOptions={langOptions} onSaved={load} />)}
        {panel('style', <BgColorsOutlined />, t('wiki.styleConfig'), t('wiki.styleConfigDesc'),
          <SiteStylePanel site={site} onEdit={() => setStyleOpen(true)} />)}
        {panel('content', <ProfileOutlined />, t('wiki.contentConfig'), t('wiki.contentConfigDesc'),
          <WikiContentPanel siteId={id} langs={site.multiLang === 1 ? ['zh_CN', 'en_US'] : [site.defaultLang]} />)}
      </div>

      <SiteStyleDrawer open={styleOpen} onClose={() => setStyleOpen(false)} site={site} langOptions={langOptions}
        canManage={hasFunction('wiki.app.style')} onSaved={() => { setStyleOpen(false); load() }} />
    </div>
  )
}

// ============ 站点配置(内联面板,img_11)============
function SiteConfigPanel({ site, langOptions, onSaved }: {
  site: WikiSiteDetailVO; langOptions: { value: string; label: string }[]; onSaved: () => void
}) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const canManage = hasFunction('wiki.app.site')
  const [enabled, setEnabled] = useState(site.enabled === 1)
  const [icon, setIcon] = useState<string | null>(site.icon)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [defaultLang, setDefaultLang] = useState(site.defaultLang)
  const [enEnabled, setEnEnabled] = useState(site.multiLang === 1)
  const [subdomain, setSubdomain] = useState(site.subdomain || '')
  const cd = site.customDomain || ''
  const [domainProto, setDomainProto] = useState(cd.startsWith('http://') ? 'http://' : 'https://')
  const [domainHost, setDomainHost] = useState(cd.replace(/^https?:\/\//, ''))
  const [favicon, setFavicon] = useState<string | null>(site.favicon)
  const [saving, setSaving] = useState(false)

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
        subdomain: subdomain || null, customDomain: domainHost ? domainProto + domainHost : null, favicon,
      })
      message.success(t('profile.saved')); onSaved()
    } catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const onUploadFavicon = async (file: File) => { try { setFavicon(await uploadFile(file)) } catch { /* 拦截器已提示 */ } return false }
  const label = (s: string) => <div style={{ fontSize: 14, margin: '20px 0 8px' }}>{s}</div>
  const iconPicker = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, width: 280 }}>
      {WIKI_ICONS.map((ic) => (
        <div key={ic.key} onClick={() => { setIcon(ic.key); setIconPickerOpen(false) }}
          style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${icon === ic.key ? token.colorPrimary : token.colorBorderSecondary}`, background: icon === ic.key ? token.colorPrimaryBg : 'transparent' }}>{renderWikiIcon(ic.key, { size: 22 })}</div>
      ))}
    </div>
  )

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>{t('wiki.appStatus')}</div>
      <Switch checked={enabled} onChange={setEnabled} checkedChildren={t('wiki.enabled')} unCheckedChildren={t('wiki.disabled')} />
      {label(t('wiki.appIcon'))}
      <Popover content={iconPicker} trigger="click" open={iconPickerOpen} onOpenChange={setIconPickerOpen} placement="bottomLeft">
        <div style={{ width: 56, height: 56, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${token.colorBorder}`, cursor: 'pointer' }}>{renderWikiIcon(icon, { size: 30 })}</div>
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
        <Input addonBefore={<Select value={domainProto} onChange={setDomainProto} style={{ width: 92 }} options={[{ value: 'https://', label: 'https://' }, { value: 'http://', label: 'http://' }]} />}
          value={domainHost} onChange={(e) => setDomainHost(e.target.value)} placeholder="docs.example.com" />
      </div>
      {label('Favicon')}
      <Upload listType="picture-card" showUploadList={false} accept=".ico,.png,.jpg,.jpeg" beforeUpload={onUploadFavicon}>
        {favicon ? <img src={favicon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <PlusOutlined />}
      </Upload>
      {canManage && <div style={{ marginTop: 24 }}><Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button></div>}
    </div>
  )
}

// ============ 样式配置(内联预览 + 编辑抽屉,img_12)============
function SiteStylePanel({ site, onEdit }: { site: WikiSiteDetailVO; onEdit: () => void }) {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const [lang, setLang] = useState(site.defaultLang)
  const canEdit = hasFunction('wiki.app.style')
  const i = site.i18ns.find((x) => x.lang === lang)
  const theme1 = site.themeColor || THEME_COLORS[0]
  const langs = site.multiLang === 1 ? ['zh_CN', 'en_US'] : [site.defaultLang]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{t('wiki.homeStyle')}</div>
        <div style={{ flex: 1 }} />
        {langs.length > 1 && (
          <div style={{ display: 'inline-flex', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 3, marginRight: 12 }}>
            {langs.map((l) => (
              <div key={l} onClick={() => setLang(l)} style={{ padding: '2px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: lang === l ? token.colorPrimaryBg : 'transparent', color: lang === l ? token.colorPrimary : token.colorText }}>{langLabel(l, i18n.language)}</div>
            ))}
          </div>
        )}
        {canEdit && <Button onClick={onEdit}>{t('common.edit')}</Button>}
      </div>
      {/* 首页样式预览(浏览器外壳 + banner) */}
      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ background: token.colorFillTertiary, padding: '8px 12px', fontSize: 12, color: token.colorTextTertiary }}>
          ● ● ● &nbsp;&nbsp;{site.subdomain ? `${location.host}/${site.subdomain}` : 'example/helpcenter'}
        </div>
        <div style={{ background: theme1, color: '#fff', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', marginBottom: 32 }}>
            {site.logo && <img src={site.logo} alt="" style={{ height: 28, borderRadius: 4 }} />}
            <span style={{ fontWeight: 700 }}>{site.brandShort}</span>
            {i?.appName && <span style={{ opacity: 0.85 }}>| {i.appName}</span>}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{i?.title || t('wiki.untitled')}</div>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 24 }}>{i?.description || ''}</div>
          <div style={{ background: 'rgba(255,255,255,.18)', borderRadius: 10, padding: '12px 20px', maxWidth: 560, margin: '0 auto', textAlign: 'left', color: 'rgba(255,255,255,.85)' }}>🔍 {t('wiki.homeSearchPh')}</div>
        </div>
      </div>
    </div>
  )
}

// ============ 样式编辑抽屉(img-32 样式编辑)============
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

  const fillForLang = (lng: string) => {
    const i = site.i18ns.find((x) => x.lang === lng)
    setAppName(i?.appName || ''); setTitle(i?.title || ''); setDescription(i?.description || '')
  }
  useEffect(() => {
    if (!open) return
    setLang(site.defaultLang); setLogo(site.logo); setBrandShort(site.brandShort || '')
    setThemeColor(site.themeColor || THEME_COLORS[0]); fillForLang(site.defaultLang)
  }, [open, site])

  const onChangeLang = (lng: string) => { setLang(lng); fillForLang(lng) }
  const save = async () => {
    setSaving(true)
    try { await saveSiteStyle(site.id, { lang, logo, brandShort, appName, title, description, themeColor }); message.success(t('profile.saved')); onSaved() }
    catch { /* 拦截器已提示 */ } finally { setSaving(false) }
  }
  const onUploadLogo = async (file: File) => { try { setLogo(await uploadFile(file)) } catch { /* 拦截器已提示 */ } return false }
  const groupTitle = (s: string) => <div style={{ background: token.colorFillQuaternary, padding: '8px 12px', borderRadius: 6, fontSize: 13, color: token.colorTextSecondary, margin: '20px 0 12px' }}>{s}</div>
  const label = (s: string) => <div style={{ fontSize: 14, margin: '14px 0 8px' }}>{s}</div>

  return (
    <Drawer title={t('wiki.styleEdit')} width={560} open={open} onClose={onClose}
      footer={canManage && <div style={{ textAlign: 'right' }}><Button onClick={onClose} style={{ marginRight: 8 }}>{t('common.cancel')}</Button><Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button></div>}>
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
          <div key={c} onClick={() => setThemeColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, boxShadow: themeColor === c ? `0 0 0 2px ${token.colorBgContainer}, 0 0 0 4px ${c}` : 'none' }}>{themeColor === c ? '✓' : ''}</div>
        ))}
      </div>
    </Drawer>
  )
}
