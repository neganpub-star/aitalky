import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Avatar, Button, Input, InputNumber, Radio, Select, Spin, Switch, Upload, message, theme,
} from 'antd'
import {
  SmileOutlined, AppstoreOutlined, ClockCircleOutlined, EyeOutlined,
  AimOutlined, BellOutlined, GlobalOutlined, PictureOutlined,
  RightOutlined, DownOutlined, LoadingOutlined, SendOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { getMessengerConfig, saveMessengerConfig, type MessengerConfigVO, type MessengerI18n } from '../../api/messengerConfig'
import { uploadFile } from '../../api/file'

// 语言展示名(信使配置启用语种用)
const LANG_LABELS: Record<string, string> = {
  zh_CN: '简体中文', en_US: 'English', zh_TW: '繁體中文', ja_JP: '日本語', ko_KR: '한국어',
}
const langLabel = (code: string) => LANG_LABELS[code] || code

// 空配置默认值:后端未就绪/无数据时也能渲染页面供 UI 走查
function emptyConfig(): MessengerConfigVO {
  return {
    brandName: null, logo: null, customDomain: null, badge: null,
    webTitle: null, webIcon: null,
    defaultLanguage: 'zh_CN', enabledLanguages: ['zh_CN', 'en_US'],
    replyTime: 'replyTimeFew', messageRetentionDays: 0,
    popupEnabled: true, popupAllowClose: true, i18n: [],
  }
}

// 会话服务 - 信使设置(对齐 ByteTrack img-81):中间卡片 accordion + 右侧 widget 实时预览
export default function Messenger() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [cfg, setCfg] = useState<MessengerConfigVO>(emptyConfig())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>('welcome')
  const [editLang, setEditLang] = useState('zh_CN')
  const [uploading, setUploading] = useState<string | null>(null) // logo|webIcon

  useEffect(() => {
    getMessengerConfig()
      .then((c) => { setCfg({ ...emptyConfig(), ...c }); if (c.defaultLanguage) setEditLang(c.defaultLanguage) })
      .catch(() => message.warning(t('mse.loadFailed'))) // 后端未就绪时用默认值,不阻塞 UI
      .finally(() => setLoading(false))
  }, [t])

  // 取/改某语言的多语言内容(不存在则即时补一条)
  const curI18n: MessengerI18n = useMemo(() => {
    return cfg.i18n.find((x) => x.language === editLang)
      || { language: editLang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }
  }, [cfg.i18n, editLang])

  const patch = (p: Partial<MessengerConfigVO>) => setCfg((c) => ({ ...c, ...p }))
  const patchI18n = (p: Partial<MessengerI18n>) => setCfg((c) => {
    const rest = c.i18n.filter((x) => x.language !== editLang)
    return { ...c, i18n: [...rest, { ...curI18n, ...p }] }
  })

  const save = async () => {
    setSaving(true)
    try {
      await saveMessengerConfig(cfg)
      message.success(t('mse.saved'))
    } finally {
      setSaving(false)
    }
  }

  // 图片上传(logo / webIcon)→ MinIO → 回填 URL
  const beforeUpload = (field: 'logo' | 'webIcon') => (file: File) => {
    if (!file.type.startsWith('image/')) { message.warning(t('profile.avatarTypeError')); return false }
    if (file.size > 1024 * 1024) { message.warning(t('profile.avatarSizeError')); return false }
    setUploading(field)
    uploadFile(file)
      .then((url) => patch({ [field]: url } as Partial<MessengerConfigVO>))
      .finally(() => setUploading(null))
    return false
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin /></div>
  }

  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', gap: 24, alignItems: 'flex-start' },
    left: { flex: 1, minWidth: 0, maxWidth: 660 },
    h1: { fontWeight: 700, fontSize: 20, marginBottom: 20 },
    right: { width: 340, flexShrink: 0 },
    previewLabel: { color: token.colorTextTertiary, fontSize: 13, marginBottom: 12 },
    cardHead: {
      display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer',
    },
    cardIcon: {
      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: token.colorPrimaryBg, color: token.colorPrimary, fontSize: 17,
    },
    cardTitle: { fontWeight: 600, fontSize: 14, color: token.colorText },
    cardDesc: { fontSize: 12, color: token.colorTextTertiary, marginTop: 2 },
    cardBody: { padding: '4px 18px 18px 66px' },
    fieldLabel: { fontWeight: 600, fontSize: 13, margin: '14px 0 8px' },
    tip: { color: token.colorTextTertiary, fontSize: 12, marginTop: 6 },
    switchRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0' },
    actions: { marginTop: 18, display: 'flex', gap: 10 },
  }

  // 单张卡片(自绘以贴合 ByteTrack:白底圆角、图标、标题副标题、展开箭头)
  const Card = ({ k, icon, title, desc, body, onlyComingSoon }: {
    k: string; icon: ReactNode; title: string; desc: string; body?: ReactNode; onlyComingSoon?: boolean
  }) => {
    const open = openKey === k
    return (
      <div style={{
        background: token.colorBgContainer, borderRadius: 10, marginBottom: 12,
        boxShadow: token.boxShadowTertiary, overflow: 'hidden',
      }}>
        <div
          style={styles.cardHead}
          onClick={() => { if (onlyComingSoon) { message.info(t('mse.comingSoon')); return } setOpenKey(open ? null : k) }}
        >
          <div style={styles.cardIcon}>{icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.cardTitle}>{title}</div>
            <div style={styles.cardDesc}>{desc}</div>
          </div>
          {open ? <DownOutlined style={{ color: token.colorTextTertiary }} /> : <RightOutlined style={{ color: token.colorTextQuaternary }} />}
        </div>
        {open && body && <div style={styles.cardBody}>{body}</div>}
      </div>
    )
  }

  // 语言选择器(欢迎信息卡片内,切换正在编辑的语言)
  const langSelect = (
    <Select
      size="small" value={editLang} onChange={setEditLang} style={{ width: 140 }}
      options={cfg.enabledLanguages.map((c) => ({ value: c, label: langLabel(c) }))}
    />
  )

  const saveBtns = (
    <div style={styles.actions}>
      <Button type="primary" loading={saving} onClick={save}>{t('common.save')}</Button>
    </div>
  )

  // 图片上传块(logo / webIcon)
  const imgUpload = (field: 'logo' | 'webIcon', size: number, tip: string) => (
    <>
      <Upload showUploadList={false} accept="image/*" beforeUpload={beforeUpload(field)} disabled={uploading === field}>
        <div style={{
          width: size, height: size, borderRadius: 8, border: `1px dashed ${token.colorBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
          background: token.colorFillQuaternary,
        }}>
          {uploading === field
            ? <LoadingOutlined style={{ color: token.colorPrimary }} />
            : cfg[field]
              ? <img src={cfg[field] as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <PictureOutlined style={{ fontSize: 20, color: token.colorTextQuaternary }} />}
        </div>
      </Upload>
      <div style={styles.tip}>{tip}</div>
    </>
  )

  return (
    <div style={styles.root}>
      {/* 左:卡片列表 */}
      <div style={styles.left}>
        <div style={styles.h1}>{t('mse.title')}</div>

        {/* 品牌名称与 LOGO(信使端首页顶部展示) */}
        <Card k="brand" icon={<AppstoreOutlined />} title={t('mse.brandTitle')} desc={t('mse.brandDesc')} body={
          <>
            <div style={styles.fieldLabel}>{t('mse.brandName')}</div>
            <Input maxLength={64} value={cfg.brandName ?? ''} placeholder={t('mse.brandNamePh')}
              onChange={(e) => patch({ brandName: e.target.value })} />
            <div style={styles.fieldLabel}>{t('mse.logo')}</div>
            {imgUpload('logo', 72, t('mse.logoTip'))}
            {saveBtns}
          </>
        } />

        {/* 欢迎信息(多语言:问候语 + 团队介绍) */}
        <Card k="welcome" icon={<SmileOutlined />} title={t('mse.welcomeTitle')} desc={t('mse.welcomeDesc')} body={
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{langSelect}</div>
            <div style={styles.fieldLabel}>{t('mse.greeting')}</div>
            <Input maxLength={64} value={curI18n.greeting ?? ''} placeholder={t('mse.greetingPh')}
              onChange={(e) => patchI18n({ greeting: e.target.value })} />
            <div style={styles.fieldLabel}>{t('mse.teamIntro')}</div>
            <Input.TextArea rows={2} maxLength={512} value={curI18n.teamIntro ?? ''} placeholder={t('mse.teamIntroPh')}
              onChange={(e) => patchI18n({ teamIntro: e.target.value })} />
            {saveBtns}
          </>
        } />

        {/* Wiki 集成(本轮占位) */}
        <Card k="wiki" icon={<AppstoreOutlined />} title={t('mse.wikiTitle')} desc={t('mse.wikiDesc')} onlyComingSoon />

        {/* 回复时间预期 */}
        <Card k="reply" icon={<ClockCircleOutlined />} title={t('mse.replyTimeTitle')} desc={t('mse.replyTimeDesc')} body={
          <>
            <div style={styles.fieldLabel}>{t('mse.replyTime')}</div>
            <Select style={{ width: 240 }} value={cfg.replyTime ?? 'replyTimeFew'}
              onChange={(v) => patch({ replyTime: v })}
              options={[
                { value: 'replyTimeFew', label: t('mse.replyTimeFew') },
                { value: 'replyTimeHours', label: t('mse.replyTimeHours') },
                { value: 'replyTimeDay', label: t('mse.replyTimeDay') },
              ]} />
            {saveBtns}
          </>
        } />

        {/* 消息查看时间(保存天数) */}
        <Card k="retention" icon={<EyeOutlined />} title={t('mse.retentionTitle')} desc={t('mse.retentionDesc')} body={
          <>
            <Radio.Group style={{ marginTop: 14 }} value={cfg.messageRetentionDays > 0 ? 'limited' : 'unlimited'}
              onChange={(e) => patch({ messageRetentionDays: e.target.value === 'limited' ? 7 : 0 })}>
              <Radio value="unlimited">{t('mse.retentionUnlimited')}</Radio>
              <Radio value="limited">{t('mse.retentionLimited')}</Radio>
            </Radio.Group>
            {cfg.messageRetentionDays > 0 && (
              <div style={{ marginTop: 14 }}>
                <InputNumber min={1} max={999999} value={cfg.messageRetentionDays}
                  onChange={(v) => patch({ messageRetentionDays: v || 1 })}
                  addonAfter={t('mse.retentionDays')} />
                <div style={styles.tip}>{t('mse.retentionTip')}</div>
              </div>
            )}
            {saveBtns}
          </>
        } />

        {/* 启动器样式(本轮占位) */}
        <Card k="launcher" icon={<AimOutlined />} title={t('mse.launcherTitle')} desc={t('mse.launcherDesc')} onlyComingSoon />

        {/* 偏好设置(弹窗通知) */}
        <Card k="pref" icon={<BellOutlined />} title={t('mse.prefTitle')} desc={t('mse.prefDesc')} body={
          <>
            <div style={styles.switchRow}>
              <Switch checked={cfg.popupEnabled} onChange={(v) => patch({ popupEnabled: v })} />
              <div>
                <div style={styles.cardTitle}>{t('mse.newMsgNotify')}</div>
                <div style={styles.cardDesc}>{t('mse.newMsgNotifyDesc')}</div>
              </div>
            </div>
            <div style={styles.switchRow}>
              <Switch checked={cfg.popupAllowClose} onChange={(v) => patch({ popupAllowClose: v })} />
              <div>
                <div style={styles.cardTitle}>{t('mse.allowClose')}</div>
                <div style={styles.cardDesc}>{t('mse.allowCloseDesc')}</div>
              </div>
            </div>
            {saveBtns}
          </>
        } />

        {/* 自定义网站标题和图标 */}
        <Card k="web" icon={<GlobalOutlined />} title={t('mse.webTitleTitle')} desc={t('mse.webTitleDesc')} body={
          <>
            <div style={styles.fieldLabel}>{t('mse.webIcon')}</div>
            {imgUpload('webIcon', 48, t('mse.webIconTip'))}
            <div style={styles.fieldLabel}>{t('mse.webTitleLabel')}</div>
            <Input maxLength={64} value={cfg.webTitle ?? ''} placeholder={t('mse.webTitlePh')}
              onChange={(e) => patch({ webTitle: e.target.value })} />
            {saveBtns}
          </>
        } />
      </div>

      {/* 右:信使端 widget 预览(简化版,跟随表单实时变化) */}
      <div style={styles.right}>
        <div style={styles.previewLabel}>{t('mse.preview')}</div>
        <WidgetPreview cfg={cfg} i18n={curI18n} />
      </div>
    </div>
  )
}

// 信使端首页预览(简化还原 img-83:渐变头 + 品牌/欢迎语 + 紧急通知条 + 输入框)
function WidgetPreview({ cfg, i18n }: { cfg: MessengerConfigVO; i18n: MessengerI18n }) {
  const { t } = useTranslation()
  const brand = cfg.brandName || 'Aitalky'
  const greeting = i18n.greeting || t('mse.greetingPh')
  const intro = i18n.teamIntro || t('mse.teamIntroPh')
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', background: '#fff',
    }}>
      <div style={{ padding: '28px 22px 30px', background: 'linear-gradient(135deg,#cfe0ff 0%,#e7d9ff 100%)' }}>
        <Avatar size={40} src={cfg.logo || undefined} shape="square"
          style={{ background: '#0b1f33', borderRadius: 10, marginBottom: 16 }}>
          {brand.charAt(0)}
        </Avatar>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0b1f33', lineHeight: 1.3 }}>{brand}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0b1f33', lineHeight: 1.3 }}>{greeting}</div>
      </div>
      <div style={{ padding: 16 }}>
        {i18n.urgentEnabled && i18n.urgentNotice && (
          <div style={{
            background: '#fff7e6', border: '1px solid #ffe7ba', color: '#ad6800',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 12,
          }}>⚠ {i18n.urgentNotice}</div>
        )}
        <div style={{
          border: '1px solid #eee', borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#222' }}>{greeting}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{intro}</div>
          </div>
          <SendOutlined style={{ color: '#1677ff' }} />
        </div>
      </div>
    </div>
  )
}
