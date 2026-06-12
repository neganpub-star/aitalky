import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Alert, Button, message } from 'antd'
import {
  DesktopOutlined, AppleFilled, AndroidFilled, RightOutlined, DownOutlined, CopyOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { getMessengerConfig } from '../../api/messengerConfig'

// API管理(对齐 ByteTrack live-现网截图 img_18):手风琴 Web端/IOS端/Android端;Web端展示 AppID/Host + 接入说明
// 只读展示页;AppID 取自当前项目,Host 取自信使配置的自定义域名
export default function ApiManage() {
  const { t } = useTranslation()
  const projectId = useAppStore((s) => s.projectId)
  const projects = useAppStore((s) => s.projects)
  const appId = projects.find((p) => p.id === projectId)?.appId || 'U8PZhhCG'
  const [host, setHost] = useState('https://msg.example.top')
  const [openKey, setOpenKey] = useState<string | null>('web')

  useEffect(() => {
    getMessengerConfig().then((c) => { if (c.customDomain) setHost(c.customDomain) }).catch(() => undefined)
  }, [])

  const copy = (text: string) => { navigator.clipboard?.writeText(text); message.success(t('common.confirm')) }

  const styles: Record<string, CSSProperties> = {
    h1: { fontWeight: 700, fontSize: 20, marginBottom: 20 },
    cardHead: { display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', cursor: 'pointer' },
    cardTitle: { fontWeight: 600, fontSize: 15, color: 'rgba(0,0,0,0.88)' },
    cardBody: { padding: '4px 20px 24px 64px' },
    kvLabel: { color: 'rgba(0,0,0,0.45)', fontSize: 13, marginRight: 8 },
    code: { display: 'inline-block', background: '#fff7e6', color: '#d46b08', padding: '2px 8px', borderRadius: 4 },
  }

  // 移动端密钥卡内容(IOS/Android 同结构,差异:AppKey 占位、接入说明文案/代码)。AppKey 暂为静态占位,接入后由系统生成
  const keyBody = (intro: string, codeText: string) => (
    <>
      <Alert type="warning" showIcon style={{ marginBottom: 22, fontSize: 13 }} message={t('api.resetWarn')} />
      <div style={{ fontSize: 15, fontWeight: 600 }}>{t('api.yourAppKey')}</div>
      <div style={{ margin: '14px 0', fontSize: 14 }}>
        <span style={styles.kvLabel}>{t('api.appId')}：</span>
        <span style={{ fontWeight: 500 }}>{appId}</span>
        <CopyOutlined onClick={() => copy(appId)} style={{ color: '#1677ff', cursor: 'pointer', marginLeft: 8 }} />
      </div>
      <div style={{ marginBottom: 14, fontSize: 14 }}>
        <span style={styles.kvLabel}>{t('api.appKey')}：</span>
        <span style={{ color: 'rgba(0,0,0,0.35)' }}>{t('api.appKeyPending')}</span>
      </div>
      <div style={{ marginBottom: 16, fontSize: 14 }}>
        <span style={styles.kvLabel}>{t('api.host')}：</span>
        <span style={{ fontWeight: 500 }}>{host}</span>
        <CopyOutlined onClick={() => copy(host)} style={{ color: '#1677ff', cursor: 'pointer', marginLeft: 8 }} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button type="primary">{t('api.viewGuide')}</Button>
        <Button danger disabled>{t('api.resetAppKey')}</Button>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, margin: '24px 0 14px' }}>{t('api.accessDesc')}</div>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', lineHeight: 2.1 }}>
        <div>{intro}</div>
        <div style={{ marginTop: 6 }}><code style={styles.code}>{codeText}</code></div>
        <div style={{ marginTop: 10 }}>{t('api.viewDoc')}</div>
      </div>
    </>
  )

  const Card = ({ k, icon, title, body, comingSoon }: {
    k: string; icon: ReactNode; title: string; body?: ReactNode; comingSoon?: boolean
  }) => {
    const open = openKey === k
    return (
      <div style={{ background: '#fff', borderRadius: 10, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', border: open ? '1px solid #1677ff' : '1px solid transparent' }}>
        <div style={styles.cardHead} onClick={() => { if (comingSoon) { message.info(t('api.comingSoon')); return } setOpenKey(open ? null : k) }}>
          <span style={{ fontSize: 24, color: 'rgba(0,0,0,0.85)' }}>{icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={styles.cardTitle}>{title}</div></div>
          {open ? <DownOutlined style={{ color: 'rgba(0,0,0,0.45)' }} /> : <RightOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
        </div>
        {open && body && <div style={styles.cardBody}>{body}</div>}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1180 }}>
      <div style={styles.h1}>{t('api.title')}</div>

      <Card k="web" icon={<DesktopOutlined />} title={t('api.web')} body={
        <>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{t('api.yourAppId')}</div>
          <div style={{ margin: '14px 0', fontSize: 14 }}>
            <span style={styles.kvLabel}>{t('api.appId')}：</span>
            <span style={{ fontWeight: 500 }}>{appId}</span>
            <CopyOutlined onClick={() => copy(appId)} style={{ color: '#1677ff', cursor: 'pointer', marginLeft: 8 }} />
          </div>
          <div style={{ marginBottom: 16, fontSize: 14 }}>
            <span style={styles.kvLabel}>{t('api.host')}：</span>
            <span style={{ fontWeight: 500 }}>{host}</span>
            <CopyOutlined onClick={() => copy(host)} style={{ color: '#1677ff', cursor: 'pointer', marginLeft: 8 }} />
          </div>
          <Button type="primary">{t('api.viewGuide')}</Button>

          <div style={{ fontSize: 15, fontWeight: 600, margin: '24px 0 14px' }}>{t('api.accessDesc')}</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', lineHeight: 2.1 }}>
            <div>{t('api.accessIntro')}</div>
            <div>{t('api.accessStep1')}</div>
            <div>
              {t('api.accessStep2Pre')}
              <code style={{ background: '#fff7e6', color: '#d46b08', padding: '2px 8px', borderRadius: 4, margin: '0 6px' }}>{`new bytetrack({ appId: ${appId} })`}</code>
              {t('api.accessStep2Suf')}
            </div>
            <div>{t('api.accessStep3')}</div>
          </div>
        </>
      } />

      <Card k="ios" icon={<AppleFilled />} title={t('api.ios')} body={keyBody(t('api.iosIntro'), t('api.iosCode'))} />
      <Card k="android" icon={<AndroidFilled />} title={t('api.android')} body={keyBody(t('api.androidIntro'), t('api.androidCode'))} />
    </div>
  )
}
