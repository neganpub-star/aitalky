import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Select, Drawer, Popover, message, theme, Spin } from 'antd'
import { PlusOutlined, CheckCircleFilled, MinusCircleFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../../auth/perm'
import { allLanguages, langLabel } from '../../constants/languages'
import { WIKI_ICONS, DEFAULT_WIKI_ICON, renderWikiIcon } from '../../constants/wikiIcons'
import { listSites, createSite, checkSubdomain, type WikiSiteVO } from '../../api/wiki'

// wiki 应用列表(对齐参考 img-21):默认应用 + 自定义应用 卡片网格。
export default function WikiSites() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const canCreate = hasFunction('wiki.app.create')

  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<WikiSiteVO[]>([])

  // 创建弹框状态
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [iconKey, setIconKey] = useState(DEFAULT_WIKI_ICON)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [defaultLang, setDefaultLang] = useState('zh_CN')
  const [appName, setAppName] = useState('')
  const [subdomain, setSubdomain] = useState('')

  const load = () => {
    setLoading(true)
    listSites().then(setSites).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const defaultApps = useMemo(() => sites.filter((s) => s.isDefault === 1), [sites])
  const customApps = useMemo(() => sites.filter((s) => s.isDefault !== 1), [sites])

  const openCreate = () => {
    setIconKey(DEFAULT_WIKI_ICON)
    setDefaultLang('zh_CN')
    setAppName('')
    setSubdomain('')
    setOpen(true)
  }

  const submit = async () => {
    if (!appName.trim()) { message.warning(t('wiki.appNameRequired')); return }
    if (subdomain && !/^[a-zA-Z0-9]+$/.test(subdomain)) { message.warning(t('wiki.subdomainInvalid')); return }
    setSaving(true)
    try {
      if (subdomain) {
        const ok = await checkSubdomain(subdomain)
        if (!ok) { message.warning(t('wiki.subdomainTaken')); setSaving(false); return }
      }
      await createSite({ icon: iconKey, defaultLang, appName: appName.trim(), subdomain: subdomain || null })
      message.success(t('profile.saved'))
      setOpen(false)
      load()
    } catch {
      // 错误已由 client 拦截器提示
    } finally {
      setSaving(false)
    }
  }

  // 分享:复制对外站点链接(按站点 shareCode,对应 HashRouter 公开路由)
  const share = (s: WikiSiteVO) => {
    const url = `${location.origin}/#/wiki-site/${s.shareCode || s.id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    message.success(t('wiki.shareCopied'))
  }

  const card = (s: WikiSiteVO) => {
    const enabled = s.enabled === 1
    return (
      <div
        key={s.id}
        className="at-card-hover"
        onClick={() => nav(`/wiki/sites/${s.id}`)}
        style={{
          width: 300, padding: 20, borderRadius: 12, cursor: 'pointer',
          background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex', flexDirection: 'column', minHeight: 168,
        }}
      >
        <div style={{ marginBottom: 28 }}>{renderWikiIcon(s.icon, { size: 30, grayscale: !enabled })}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: enabled ? token.colorText : token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.name || '-'}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: token.colorTextTertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.description || ''}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: enabled ? '#52c41a' : token.colorTextQuaternary }}>
            {enabled ? <CheckCircleFilled /> : <MinusCircleFilled />}
            {enabled ? t('wiki.enabled') : t('wiki.disabled')}
          </span>
          {enabled && (
            <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); share(s) }}>
              {t('wiki.share')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const iconPicker = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, width: 280 }}>
      {WIKI_ICONS.map((ic) => (
        <div
          key={ic.key}
          onClick={() => { setIconKey(ic.key); setIconPickerOpen(false) }}
          style={{
            width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            border: `1px solid ${iconKey === ic.key ? token.colorPrimary : token.colorBorderSecondary}`,
            background: iconKey === ic.key ? token.colorPrimaryBg : 'transparent',
          }}
        >
          {renderWikiIcon(ic.key, { size: 22 })}
        </div>
      ))}
    </div>
  )

  const langOptions = allLanguages().map((l) => ({ value: l.code, label: langLabel(l.code, i18n.language) }))

  const section = (title: string, list: WikiSiteVO[]) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{title}</div>
      {list.length === 0
        ? <div style={{ color: token.colorTextTertiary, fontSize: 13 }}>{t('wiki.noApps')}</div>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{list.map(card)}</div>}
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{t('wiki.apps')}</div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('wiki.createApp')}</Button>
        )}
      </div>

      {loading
        ? <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>
        : <>{section(t('wiki.defaultApps'), defaultApps)}{section(t('wiki.customApps'), customApps)}</>}

      <Drawer
        open={open}
        title={t('wiki.createApp')}
        width={560}
        onClose={() => setOpen(false)}
        footer={<div style={{ textAlign: 'right' }}><Button type="primary" loading={saving} onClick={submit}>{t('common.save')}</Button></div>}
      >
        <div style={{
          background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: '#874d00', margin: '0 0 20px',
        }}>
          {t('wiki.createTip')}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8, fontSize: 14 }}>{t('wiki.appIcon')}</div>
          <Popover content={iconPicker} trigger="click" open={iconPickerOpen} onOpenChange={setIconPickerOpen} placement="bottomLeft">
            <div style={{
              width: 56, height: 56, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${token.colorBorder}`, cursor: 'pointer',
            }}>
              {renderWikiIcon(iconKey, { size: 30 })}
            </div>
          </Popover>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8, fontSize: 14 }}>{t('wiki.defaultLang')}</div>
          <Select value={defaultLang} onChange={setDefaultLang} options={langOptions} style={{ width: 260 }} showSearch optionFilterProp="label" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8, fontSize: 14 }}>{t('wiki.appName')}</div>
          <Input value={appName} onChange={(e) => setAppName(e.target.value)} maxLength={40} placeholder={t('wiki.appNamePlaceholder')} />
        </div>

        <div style={{ background: token.colorFillQuaternary, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>{t('wiki.subdomain')}</div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 10, lineHeight: 1.6 }}>{t('wiki.subdomainHint')}</div>
          <Input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="example" />
        </div>
      </Drawer>
    </div>
  )
}
