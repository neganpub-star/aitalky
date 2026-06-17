import { Avatar } from 'antd'
import { LeftOutlined, RightOutlined, CloseOutlined, ClockCircleOutlined, SoundOutlined, SendOutlined, DownOutlined, PaperClipOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

// 回复时间 key → 预览文案(与信使设置卡选项一致)
const REPLY_KEYS = ['rtFew', 'rtHours', 'rtDay', 'rtUnderMin', 'rtAsap']

// 团队示例头像(仅预览用占位人脸,与参考系统一致)
const TEAM_FACES = ['https://i.pravatar.cc/96?img=5', 'https://i.pravatar.cc/96?img=11', 'https://i.pravatar.cc/96?img=9']

export interface PreviewData {
  brandName: string | null
  logo: string | null
  greeting: string | null   // 当前预览语种的问候语
  replyTime: string | null  // 回复时间 key
  urgentNotice: string | null
  urgentEnabled: boolean
}

// 信使端模拟预览。home=首页问候卡;chat=紧急通知聊天窗;demo=会话演示(系统消息/撤回卡用);popup=浏览器弹窗(偏好设置卡用)
// home/chat 内容随传入数据实时变化;demo/popup 为静态演示(对齐现网 img_5/img_6/img_7)
export default function MessengerPreview({ data, mode }: { data: PreviewData; mode: 'home' | 'chat' | 'demo' | 'popup' }) {
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
    // 首页问候卡(1:1 对齐 aitalky img_1):整卡渐变上深下浅、白色子卡浮于其上
    // 顶部 LOGO+关闭 → 大号品牌/欢迎语 → 联系我们卡(团队头像组+消息预览+品牌·时间) → 消息卡(右箭头)
    return (
      <div style={{
        borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        // 双层渐变:底层斜向蓝→薄荷色,上层自上而下渐隐到白(子卡区域回到纯白)
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 32%, #ffffff 64%), linear-gradient(120deg,#c7dcff 0%,#dcebe0 100%)',
      }}>
        {/* 顶部:品牌 LOGO + 关闭 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 18px 0' }}>
          {logoEl(30)}
          <CloseOutlined style={{ color: '#0b1f33', opacity: 0.5, fontSize: 16 }} />
        </div>
        {/* 大号品牌 + 欢迎语 */}
        <div style={{ padding: '40px 20px 28px' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0b1f33', lineHeight: 1.32 }}>{brand}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0b1f33', lineHeight: 1.32 }}>{greeting}</div>
        </div>
        {/* 子卡区 */}
        <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 联系我们卡:团队头像组 + 消息预览 + 品牌·时间 + 未读红点 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{t('mse.pvContact')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar.Group size={26}>
                {TEAM_FACES.map((src, i) => <Avatar key={i} size={26} src={src} />)}
              </Avatar.Group>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('mse.pvContactPreview')}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{brand} · {t('mse.pvContactTime')}</div>
              </div>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4d4f', flexShrink: 0 }} />
            </div>
          </div>
          {/* 消息卡:标题 + 引导语 + 右箭头 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t('mse.pvMessage')}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('mse.pvMessageDesc')}</div>
            </div>
            <RightOutlined style={{ color: '#bbb', fontSize: 14, flexShrink: 0 }} />
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'demo') {
    // 会话演示:顶栏(返回+客服名)+ 客户/客服气泡 + 系统撤回提示 + 输入框(对齐 img_5/img_7)
    const agentFace = TEAM_FACES[0]
    // 一条气泡:side=right 客户(浅蓝靠右)/left 客服(灰底带头像)
    const Bubble = ({ side, text, time }: { side: 'left' | 'right'; text: string; time: string }) => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: side === 'right' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexDirection: side === 'right' ? 'row-reverse' : 'row' }}>
          {side === 'left' && <Avatar size={28} src={agentFace} />}
          <div style={{
            maxWidth: 200, padding: '8px 12px', fontSize: 13, lineHeight: 1.5,
            borderRadius: 10, background: side === 'right' ? '#dbeafe' : '#f2f3f5', color: '#1a1a1a',
          }}>{text}</div>
        </div>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, marginRight: side === 'right' ? 36 : 0, marginLeft: side === 'left' ? 36 : 0 }}>{time}</div>
      </div>
    )
    return (
      <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 34px rgba(0,0,0,0.14)', background: '#fff', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
        {/* 顶栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
          <LeftOutlined style={{ color: '#666', fontSize: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>{t('mse.demoAgent')}</span>
        </div>
        {/* 消息区 */}
        <div style={{ flex: 1, padding: '18px 16px', background: 'linear-gradient(180deg,#ffffff 0%,#f6f8fb 100%)' }}>
          <Bubble side="right" text={t('mse.demoMsg1')} time="05-06 16:18" />
          <div style={{ textAlign: 'center', fontSize: 12, color: '#bbb', margin: '0 0 16px' }}>{t('mse.demoRetract')}</div>
          <Bubble side="left" text={t('mse.demoMsg2')} time="05-06 16:19" />
          <Bubble side="left" text={t('mse.demoMsg3')} time="05-06 16:20" />
          <Bubble side="right" text={t('mse.demoMsg4')} time="05-06 16:24" />
        </div>
        {/* 输入框 */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <span style={{ color: '#bbb', fontSize: 14 }}>{t('mse.pvInput')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <PaperClipOutlined style={{ color: '#9aa0a6', fontSize: 17 }} />
            <SendOutlined style={{ color: '#1677ff', fontSize: 19 }} />
          </span>
        </div>
      </div>
    )
  }

  if (mode === 'popup') {
    // 浏览器弹窗演示:浏览器外框 + 右下侧栏标签 + 新消息弹框(对齐 img_6)
    const dot = (c: string) => <span style={{ width: 11, height: 11, borderRadius: '50%', background: c, display: 'inline-block' }} />
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 34px rgba(0,0,0,0.14)', background: '#fff', minHeight: 560, display: 'flex', flexDirection: 'column', border: '1px solid #eee' }}>
        {/* 浏览器顶栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ display: 'flex', gap: 7 }}>{dot('#ff5f57')}{dot('#febc2e')}{dot('#28c840')}</span>
          <LeftOutlined style={{ color: '#bbb', fontSize: 13 }} />
          <RightOutlined style={{ color: '#bbb', fontSize: 13 }} />
          <div style={{ flex: 1, background: '#f2f3f5', borderRadius: 16, padding: '6px 14px', fontSize: 12, color: '#bbb' }}>{t('mse.popupSearch')}</div>
        </div>
        {/* 页面空白主体 + 右下弹框 */}
        <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
          {/* 侧栏标签 */}
          <div style={{ position: 'absolute', right: 232, bottom: 84, writingMode: 'vertical-rl', background: '#1677ff', color: '#fff', fontSize: 12, padding: '10px 5px', borderRadius: '6px 0 0 6px' }}>{t('mse.popupTab')}</div>
          {/* 新消息弹框 */}
          <div style={{ position: 'absolute', right: 18, bottom: 18, width: 200, background: '#fff', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.16)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <CloseOutlined style={{ fontSize: 12, color: '#bbb' }} />
            </div>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.5, margin: '6px 0 12px' }}>{t('mse.popupText')}</div>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, fontSize: 12, color: '#bbb' }}>{t('mse.popupInput')}</div>
          </div>
        </div>
      </div>
    )
  }

  // 聊天窗:顶栏(返回/品牌/关闭)+ 团队头像+预计回复时间 + 红色通知条 + 输入框 + 浮动下箭头(1:1 对齐参考系统)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 34px rgba(0,0,0,0.14)', background: '#fff', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
        {/* 顶栏 */}
        <div style={{ padding: '18px 20px 6px', textAlign: 'center', position: 'relative' }}>
          <LeftOutlined style={{ position: 'absolute', left: 20, top: 20, color: '#666', fontSize: 16 }} />
          <CloseOutlined style={{ position: 'absolute', right: 20, top: 20, color: '#666', fontSize: 17 }} />
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1a1a1a' }}>{brand}</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 5 }}>{t('mse.pvSub')}</div>
        </div>
        {/* 团队头像 + 预计回复时间 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '10px 0 16px' }}>
          <Avatar.Group>
            {TEAM_FACES.map((src, i) => <Avatar key={i} size={44} src={src} />)}
          </Avatar.Group>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
            <div>{t('mse.pvReplyLabel')}</div>
            <div><ClockCircleOutlined /> {replyText}</div>
          </div>
        </div>
        {/* 红色紧急通知条 */}
        {showUrgent && (
          <div style={{ background: '#fff1f0', color: '#cf1322', padding: '13px 18px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><SoundOutlined style={{ marginRight: 8 }} />{data.urgentNotice}</span>
            <CloseOutlined style={{ fontSize: 12, opacity: 0.55 }} />
          </div>
        )}
        {/* 消息主体(极淡渐变,对齐参考) */}
        <div style={{ flex: 1, background: 'linear-gradient(180deg,#ffffff 0%,#f6f8fb 100%)' }} />
        {/* 输入框 */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
          <span style={{ color: '#bbb', fontSize: 14 }}>{t('mse.pvInput')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <PaperClipOutlined style={{ color: '#9aa0a6', fontSize: 17 }} />
            <SendOutlined style={{ color: '#1677ff', fontSize: 19 }} />
          </span>
        </div>
      </div>
      {/* 浮动下箭头(聊天窗下方外侧) */}
      <div style={{ position: 'absolute', right: 2, bottom: -64, width: 52, height: 52, borderRadius: '50%', background: '#1677ff', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(22,119,255,0.45)' }}>
        <DownOutlined />
      </div>
    </div>
  )
}
