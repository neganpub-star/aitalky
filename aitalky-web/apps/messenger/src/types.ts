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
