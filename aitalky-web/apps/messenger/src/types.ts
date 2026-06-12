// 后端雪花ID序列化为字符串(避免 JS 丢精度)

// 信使公开配置(对应后端 MessengerPublicVO):品牌/欢迎语/紧急通知,按客户语言
export interface MessengerConfig {
  brandName: string | null
  logo: string | null
  webTitle: string | null
  webIcon: string | null
  replyTime: string | null
  greeting: string | null
  teamIntro: string | null
  urgentNotice: string | null
  urgentEnabled: boolean
  // 信使端最终生效语言(URL ?lang= 优先,否则信使设置默认语言);前端据此选系统提示文案语言
  lang: string | null
}

// 本地待发/失败消息(乐观渲染,未落库,不参与 seq 体系)。发送成功后移除并以服务端 MessageVO 入列
export interface PendingMsg {
  localId: string
  content: string
  status: 'sending' | 'failed'
  time: number
  // 失败错误码(如 1024 黑名单),供前端按码显示系统提示(会话暂不可用)
  errorCode?: number
}

// 信使初始化结果(对应后端 MessengerInitVO)
export interface MessengerInit {
  token: string
  conversationId: string
  customerId: string
  customerName: string
  customerAvatar: string | null
  lastSeq: number
  config: MessengerConfig | null
}

// 消息(对应后端 MessageVO)。senderType: customer/agent;type: text/image/...
export interface MessageVO {
  msgId: string
  seq: number
  conversationId: string
  senderType: string
  senderId: string
  senderName: string | null
  senderAvatar: string | null
  type: string
  content: string
  internal: boolean | null
  isVisible: boolean | null
  timestamp: number
}

// URL 接入参数:?appId=&userId=(或 visitorId)&lang=&source=
export interface AccessParams {
  appId: string
  groupId?: string
  userId?: string
  visitorId?: string
  lang: string
  source?: string
}
