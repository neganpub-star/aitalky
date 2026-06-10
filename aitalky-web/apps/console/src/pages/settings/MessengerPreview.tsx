import { Avatar } from 'antd'
import { LeftOutlined, CloseOutlined, ClockCircleOutlined, SoundOutlined, SendOutlined, DownOutlined, PaperClipOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

// 回复时间 key → 预览文案(与信使设置卡选项一致)
const REPLY_KEYS = ['rtFew', 'rtHours', 'rtDay', 'rtUnderMin', 'rtAsap']

export interface PreviewData {
  brandName: string | null
  logo: string | null
  greeting: string | null   // 当前预览语种的问候语
  replyTime: string | null  // 回复时间 key
  urgentNotice: string | null
  urgentEnabled: boolean
}

// 信使端模拟预览。mode=home 首页问候卡(对齐 img_3);mode=chat 聊天窗(对齐紧急通知现网)
// 内容随传入数据(已按预览语种取好)实时变化
export default function MessengerPreview({ data, mode }: { data: PreviewData; mode: 'home' | 'chat' }) {
  const { t } = useTranslation()
  const brand = data.brandName || 'Aitalky'
  const greeting = data.greeting || t('mse.greetingPh')
  const replyText = data.replyTime && REPLY_KEYS.includes(data.replyTime) ? t(`mse.${data.replyTime}`) : t('mse.rtFew')
  const showUrgent = data.urgentEnabled && !!data.urgentNotice?.trim()

  const logoEl = (size: number) => (
    <Avatar size={size} src={data.logo || undefined} shape="square" style={{ background: '#0b1f33', borderRadius: 8 }}>
      {brand.charAt(0)}
    </Avatar>
  )

  if (mode === 'home') {
    // 首页问候卡:渐变头 + 品牌/欢迎语 + 联系我们卡 + 消息卡
    return (
      <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', background: '#fff' }}>
        <div style={{ padding: '24px 20px 26px', background: 'linear-gradient(135deg,#cfe0ff 0%,#e7d9ff 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            {logoEl(34)}
            <CloseOutlined style={{ color: '#0b1f33', opacity: 0.5 }} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#0b1f33', lineHeight: 1.3 }}>{brand}</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#0b1f33', lineHeight: 1.3 }}>{greeting}</div>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 联系我们卡 */}
          <div style={{ borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t('mse.pvContact')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={26} style={{ background: '#7aa7ff' }}>U</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('mse.pvContactPreview')}</div>
              </div>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d4f' }} />
            </div>
          </div>
          {/* 消息卡 */}
          <div style={{ borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t('mse.pvMessage')}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{t('mse.pvMessageDesc')}</div>
            </div>
            <SendOutlined style={{ color: '#1677ff' }} />
          </div>
        </div>
      </div>
    )
  }

  // 聊天窗:顶栏(返回/品牌/关闭)+ 团队头像+预计回复时间 + 红色通知条 + 输入框 + 浮动下箭头
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', background: '#fff', minHeight: 460, display: 'flex', flexDirection: 'column' }}>
        {/* 顶栏 */}
        <div style={{ padding: '16px 18px 12px', textAlign: 'center', position: 'relative' }}>
          <LeftOutlined style={{ position: 'absolute', left: 18, top: 18, color: '#666' }} />
          <CloseOutlined style={{ position: 'absolute', right: 18, top: 18, color: '#666' }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>{brand}</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{t('mse.pvSub')}</div>
        </div>
        {/* 团队头像 + 预计回复时间 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0 14px' }}>
          <Avatar.Group>
            <Avatar size={30} style={{ background: '#f56a00' }}>A</Avatar>
            <Avatar size={30} style={{ background: '#7265e6' }}>B</Avatar>
            <Avatar size={30} style={{ background: '#00a2ae' }}>C</Avatar>
          </Avatar.Group>
          <div style={{ fontSize: 12, color: '#666' }}>
            <div>{t('mse.pvReplyLabel')}</div>
            <div><ClockCircleOutlined /> {replyText}</div>
          </div>
        </div>
        {/* 红色紧急通知条 */}
        {showUrgent && (
          <div style={{ background: '#fff1f0', color: '#cf1322', padding: '12px 16px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><SoundOutlined style={{ marginRight: 8 }} />{data.urgentNotice}</span>
            <CloseOutlined style={{ fontSize: 11, opacity: 0.6 }} />
          </div>
        )}
        <div style={{ flex: 1 }} />
        {/* 输入框 */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#bbb', fontSize: 13 }}>{t('mse.pvInput')}</span>
          <span style={{ display: 'flex', gap: 12, color: '#1677ff' }}><PaperClipOutlined style={{ color: '#999' }} /><SendOutlined /></span>
        </div>
      </div>
      {/* 浮动下箭头 */}
      <div style={{ position: 'absolute', right: 4, bottom: -10, width: 40, height: 40, borderRadius: '50%', background: '#1677ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(22,119,255,0.4)' }}>
        <DownOutlined />
      </div>
    </div>
  )
}
