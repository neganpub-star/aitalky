import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  Avatar, Button, Checkbox, Input, InputNumber, Radio, Select, Spin, Switch, Upload, message, theme,
} from 'antd'
import {
  SmileOutlined, AppstoreOutlined, ClockCircleOutlined, EyeOutlined,
  AimOutlined, BellOutlined, GlobalOutlined, MessageOutlined, RollbackOutlined,
  PictureOutlined, RightOutlined, DownOutlined, LoadingOutlined, SettingOutlined, InfoCircleFilled,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getMessengerConfig, saveMessengerConfig, type MessengerConfigVO, type MessengerI18n } from '../../api/messengerConfig'
import { uploadFile } from '../../api/file'
import { langLabel } from '../../constants/languages'
import { hasFunction } from '../../auth/perm'
import MessengerPreview from './MessengerPreview'

// 空配置默认值:后端未就绪/无数据时也能渲染页面供 UI 走查
function emptyConfig(): MessengerConfigVO {
  return {
    brandName: null, logo: null, customDomain: null, badge: null,
    webTitle: null, webIcon: null,
    defaultLanguage: 'zh_CN', enabledLanguages: ['zh_CN', 'en_US'],
    replyTime: 'rtFew', messageRetentionDays: 0,
    popupEnabled: true, popupAllowClose: true,
    sysMsgUnread: true, sysMsgTyping: true, sysMsgMemberRetract: true, customerRetractEnabled: true,
    i18n: [],
  }
}

type ThemeToken = ReturnType<typeof theme.useToken>['token']

// 单张设置卡(必须放模块作用域:若定义在组件内,每次渲染都生成新组件类型→React 卸载重建整卡→卡内输入框失焦/只进一字/滚动跳顶)
function SettingCard({ token, styles, open, onClick, icon, title, desc, body }: {
  token: ThemeToken; styles: Record<string, CSSProperties>; open: boolean; onClick: () => void
  icon: ReactNode; title: string; desc: string; body?: ReactNode
}) {
  return (
    <div style={{ background: token.colorBgContainer, borderRadius: 10, marginBottom: 14, border: `1px solid ${token.colorBorder}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
      <div style={styles.cardHead} onClick={onClick}>
        <span style={{ fontSize: 20, color: token.colorText }}>{icon}</span>
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

// 会话服务 - 信使设置(对齐 aitalky img_1):中间卡片 accordion + 右侧 widget 实时预览
// 卡片顺序:欢迎信息 → Wiki → 回复时间 → 消息查看时间 → 启动器样式 → 系统消息显示 → 偏好设置 → 客户撤回权限 → 网站标题图标
export default function Messenger() {
  const { t, i18n } = useTranslation()
  const { token } = theme.useToken()
  const canEdit = hasFunction('messenger.setting') // 普通成员只读 → 禁用保存
  const lng = i18n.language
  const nav = useNavigate()
  const [cfg, setCfg] = useState<MessengerConfigVO>(emptyConfig())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [previewLang, setPreviewLang] = useState('zh_CN')
  const [uploading, setUploading] = useState(false) // webIcon

  useEffect(() => {
    getMessengerConfig()
      .then((c) => { setCfg({ ...emptyConfig(), ...c }); if (c.defaultLanguage) setPreviewLang(c.defaultLanguage) })
      .catch(() => message.warning(t('mse.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const patch = (p: Partial<MessengerConfigVO>) => setCfg((c) => ({ ...c, ...p }))

  // 取某语言的多语言内容(不存在则给空壳)
  const i18nOf = (lang: string): MessengerI18n =>
    cfg.i18n.find((x) => x.language === lang)
    || { language: lang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }

  const patchI18n = (lang: string, p: Partial<MessengerI18n>) => setCfg((c) => {
    const cur = c.i18n.find((x) => x.language === lang)
      || { language: lang, greeting: null, teamIntro: null, urgentNotice: null, urgentEnabled: false }
    const rest = c.i18n.filter((x) => x.language !== lang)
    return { ...c, i18n: [...rest, { ...cur, ...p }] }
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

  // 网站图标上传 → MinIO → 回填 URL
  const beforeIconUpload = (file: File) => {
    if (!file.type.startsWith('image/')) { message.warning(t('profile.avatarTypeError')); return false }
    if (file.size > 1024 * 1024) { message.warning(t('profile.avatarSizeError')); return false }
    setUploading(true)
    uploadFile(file).then((url) => patch({ webIcon: url })).finally(() => setUploading(false))
    return false
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin /></div>
  }

  // 预览形态随当前展开卡片切换(对齐现网):系统消息/客户撤回→会话演示;偏好设置→浏览器弹窗;其余→首页
  const previewMode: 'home' | 'demo' | 'popup' =
    openKey === 'sysmsg' || openKey === 'retract' ? 'demo'
      : openKey === 'pref' ? 'popup'
        : 'home'

  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', gap: 24, alignItems: 'flex-start' },
    left: { flex: 1, minWidth: 0, maxWidth: 680 },
    h1: { fontWeight: 700, fontSize: 20, marginBottom: 20 },
    right: { flex: 1, minWidth: 0 },
    previewLabel: { color: token.colorTextTertiary, fontSize: 13 },
    cardHead: { display: 'flex', alignItems: 'center', gap: 16, padding: '28px 20px', cursor: 'pointer' },
    cardTitle: { fontWeight: 600, fontSize: 14, color: token.colorText },
    cardDesc: { fontSize: 12, color: token.colorTextTertiary, marginTop: 2 },
    cardBody: { padding: '4px 18px 18px 60px' },
    fieldLabel: { fontWeight: 600, fontSize: 13, margin: '14px 0 8px' },
    tip: { color: token.colorTextTertiary, fontSize: 12, marginTop: 6 },
    switchRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0' },
    actions: { marginTop: 18, display: 'flex', gap: 10 },
  }

  // 卡片公共属性:注入主题/样式/展开态/点击(展开切换或占位提示)。卡片本体见模块作用域 SettingCard
  const cardProps = (k: string, onlyComingSoon?: boolean) => ({
    token, styles, open: openKey === k,
    onClick: () => { if (onlyComingSoon) { message.info(t('mse.comingSoon')); return } setOpenKey(openKey === k ? null : k) },
  })

  // 卡片底部 取消 + 保存
  const saveBtns = (
    <div style={styles.actions}>
      <Button onClick={() => setOpenKey(null)}>{t('common.cancel')}</Button>
      <Button type="primary" loading={saving} disabled={!canEdit} onClick={save}>{t('common.save')}</Button>
    </div>
  )

  return (
    <div style={styles.root}>
      {/* 左:卡片列表 */}
      <div style={styles.left}>
        <div style={styles.h1}>{t('mse.title')}</div>

        {/* 欢迎信息:项目信息(只读)+ 各语种问候语平铺 */}
        <SettingCard {...cardProps('welcome')} icon={<SmileOutlined />} title={t('mse.welcomeTitle')} desc={t('mse.welcomeDesc')} body={
          <>
            {/* 项目信息(只读,品牌=项目名称/LOGO) */}
            <div style={styles.fieldLabel}>{t('mse.projectInfo')}</div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8 }}>
              {t('mse.projectInfoDesc')}
              <a onClick={() => nav('/settings/team')}>{t('mse.goModify')}</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: token.colorFillTertiary, borderRadius: 8, padding: '8px 12px', maxWidth: 360 }}>
              <Avatar size={28} src={cfg.logo || undefined} shape="square" style={{ background: '#0b1f33', borderRadius: 6 }}>
                {(cfg.brandName || 'A').charAt(0)}
              </Avatar>
              <span style={{ fontSize: 14 }}>{cfg.brandName || '--'}</span>
            </div>

            {/* 问候语:所有启用语种平铺 */}
            <div style={styles.fieldLabel}>{t('mse.greeting')}</div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 10 }}>{t('mse.greetingSectionDesc')}</div>
            {cfg.enabledLanguages.map((lang) => (
              <div key={lang} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  {langLabel(lang, lng)}
                  {lang === cfg.defaultLanguage && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#1677ff', background: '#e6f0ff', padding: '1px 6px', borderRadius: 4 }}>{t('mse.defaultTag')}</span>
                  )}
                </div>
                <Input size="large" maxLength={100} showCount value={i18nOf(lang).greeting ?? ''} placeholder={t('mse.greetingPh')}
                  style={{ maxWidth: 420, fontSize: 13 }}
                  onChange={(e) => patchI18n(lang, { greeting: e.target.value })} />
              </div>
            ))}

            {/* 团队介绍:所有启用语种平铺(对齐参考,问候语下方;展示在信使聊天头部副标题) */}
            <div style={styles.fieldLabel}>{t('mse.teamIntro')}</div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 10 }}>{t('mse.teamIntroDesc')}</div>
            {cfg.enabledLanguages.map((lang) => (
              <div key={lang} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  {langLabel(lang, lng)}
                  {lang === cfg.defaultLanguage && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#1677ff', background: '#e6f0ff', padding: '1px 6px', borderRadius: 4 }}>{t('mse.defaultTag')}</span>
                  )}
                </div>
                <Input.TextArea maxLength={200} showCount rows={2} value={i18nOf(lang).teamIntro ?? ''} placeholder={t('mse.teamIntroPh')}
                  style={{ maxWidth: 420, fontSize: 13 }}
                  onChange={(e) => patchI18n(lang, { teamIntro: e.target.value })} />
              </div>
            ))}

            {/* 浏览器翻译干扰预览提示(对齐参考) */}
            <div style={{ display: 'flex', gap: 8, background: token.colorWarningBg, border: `1px solid ${token.colorWarningBorder}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: token.colorTextSecondary, marginTop: 18, maxWidth: 420 }}>
              <InfoCircleFilled style={{ color: '#faad14', marginTop: 2, flexShrink: 0 }} />
              <span>{t('mse.browserTranslateNote')}</span>
            </div>

            {/* 信使已支持多种语言 + 跳转语言配置(常规设置) */}
            <div style={{ marginTop: 18, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>{t('mse.langSupported')}</div>
              <a onClick={() => nav('/settings/general')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: token.colorPrimary, fontWeight: 500 }}>
                <SettingOutlined />{t('mse.langConfig')}
              </a>
            </div>
            {saveBtns}
          </>
        } />

        {/* Wiki 集成(占位) */}
        <SettingCard {...cardProps('wiki', true)} icon={<AppstoreOutlined />} title={t('mse.wikiTitle')} desc={t('mse.wikiDesc')} />

        {/* 回复时间预期(5 选项) */}
        <SettingCard {...cardProps('reply')} icon={<ClockCircleOutlined />} title={t('mse.replyTimeTitle')} desc={t('mse.replyTimeDesc')} body={
          <>
            <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}
              value={cfg.replyTime ?? 'rtFew'} onChange={(e) => patch({ replyTime: e.target.value })}>
              <Radio value="rtFew">{t('mse.rtFew')}</Radio>
              <Radio value="rtHours">{t('mse.rtHours')}</Radio>
              <Radio value="rtDay">{t('mse.rtDay')}</Radio>
              <Radio value="rtUnderMin">{t('mse.rtUnderMin')}</Radio>
              <Radio value="rtAsap">{t('mse.rtAsap')}</Radio>
            </Radio.Group>
            {saveBtns}
          </>
        } />

        {/* 消息查看时间(保存天数) */}
        <SettingCard {...cardProps('retention')} icon={<EyeOutlined />} title={t('mse.retentionTitle')} desc={t('mse.retentionDesc')} body={
          <>
            <Radio.Group style={{ marginTop: 14 }} value={cfg.messageRetentionDays > 0 ? 'limited' : 'unlimited'}
              onChange={(e) => patch({ messageRetentionDays: e.target.value === 'limited' ? 7 : 0 })}>
              <Radio value="unlimited">{t('mse.retentionUnlimited')}</Radio>
              <Radio value="limited">{t('mse.retentionLimited')}</Radio>
            </Radio.Group>
            {cfg.messageRetentionDays > 0 && (
              <div style={{ marginTop: 14 }}>
                <InputNumber min={1} max={9999} value={cfg.messageRetentionDays}
                  onChange={(v) => patch({ messageRetentionDays: v || 1 })} addonAfter={t('mse.retentionDays')} />
                <div style={styles.tip}>{t('mse.retentionTip')}</div>
              </div>
            )}
            {saveBtns}
          </>
        } />

        {/* 启动器样式(占位) */}
        <SettingCard {...cardProps('launcher', true)} icon={<AimOutlined />} title={t('mse.launcherTitle')} desc={t('mse.launcherDesc')} />

        {/* 系统消息显示 */}
        <SettingCard {...cardProps('sysmsg')} icon={<MessageOutlined />} title={t('mse.sysMsgTitle')} desc={t('mse.sysMsgDesc')} body={
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <Checkbox checked={cfg.sysMsgUnread} onChange={(e) => patch({ sysMsgUnread: e.target.checked })}>{t('mse.sysUnread')}</Checkbox>
              <Checkbox checked={cfg.sysMsgTyping} onChange={(e) => patch({ sysMsgTyping: e.target.checked })}>{t('mse.sysTyping')}</Checkbox>
              <Checkbox checked={cfg.sysMsgMemberRetract} onChange={(e) => patch({ sysMsgMemberRetract: e.target.checked })}>{t('mse.sysMemberRetract')}</Checkbox>
            </div>
            <div style={styles.tip}>{t('mse.sysMsgNote')}</div>
            {saveBtns}
          </>
        } />

        {/* 偏好设置(弹窗通知) */}
        <SettingCard {...cardProps('pref')} icon={<BellOutlined />} title={t('mse.prefTitle')} desc={t('mse.prefDesc')} body={
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

        {/* 客户撤回消息权限 */}
        <SettingCard {...cardProps('retract')} icon={<RollbackOutlined />} title={t('mse.retractTitle')} desc={t('mse.retractDesc')} body={
          <>
            <div style={{ marginTop: 14 }}>
              <Checkbox checked={cfg.customerRetractEnabled} onChange={(e) => patch({ customerRetractEnabled: e.target.checked })}>{t('mse.retractCheck')}</Checkbox>
            </div>
            <div style={styles.tip}>{t('mse.sysMsgNote')}</div>
            {saveBtns}
          </>
        } />

        {/* 自定义网站标题和图标 */}
        <SettingCard {...cardProps('web')} icon={<GlobalOutlined />} title={t('mse.webTitleTitle')} desc={t('mse.webTitleDesc')} body={
          <>
            <div style={styles.fieldLabel}>{t('mse.webIcon')}</div>
            <Upload showUploadList={false} accept="image/*" beforeUpload={beforeIconUpload} disabled={uploading}>
              <div style={{ width: 48, height: 48, borderRadius: 8, border: `1px dashed ${token.colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: token.colorFillTertiary }}>
                {uploading ? <LoadingOutlined style={{ color: token.colorPrimary }} />
                  : cfg.webIcon ? <img src={cfg.webIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <PictureOutlined style={{ fontSize: 18, color: token.colorTextQuaternary }} />}
              </div>
            </Upload>
            <div style={styles.tip}>{t('mse.webIconTip')}</div>
            <div style={styles.fieldLabel}>{t('mse.webTitleLabel')}</div>
            <Input maxLength={80} showCount value={cfg.webTitle ?? ''} placeholder={t('mse.webTitlePh')}
              onChange={(e) => patch({ webTitle: e.target.value })} />
            {saveBtns}
          </>
        } />
      </div>

      {/* 右:信使端预览 —— 按当前展开卡片切换形态(对齐现网):
          系统消息显示/客户撤回→会话演示;偏好设置→浏览器弹窗;其余→首页问候卡 */}
      <div style={styles.right}>
        {/* 预览头部:标题 + 语言下拉,下方贯穿分隔线(对齐 aitalky) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <span style={styles.previewLabel}>{previewMode === 'home' ? t('mse.preview') : t('mse.previewSide')}</span>
          {previewMode === 'home' && (
            <Select size="small" value={previewLang} onChange={setPreviewLang} style={{ width: 120 }}
              options={cfg.enabledLanguages.map((c) => ({ value: c, label: langLabel(c, lng) }))} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <div style={{ width: 372 }}>
            <MessengerPreview mode={previewMode} data={{
              brandName: cfg.brandName, logo: cfg.logo,
              greeting: i18nOf(previewLang).greeting,
              replyTime: cfg.replyTime,
              urgentNotice: i18nOf(previewLang).urgentNotice,
              urgentEnabled: i18nOf(previewLang).urgentEnabled,
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
