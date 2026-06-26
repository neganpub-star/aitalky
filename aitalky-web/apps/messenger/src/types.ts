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
  // —— 行为开关(信使设置,后端 init 下发)——
  sysMsgUnread: boolean        // 信使侧显示"未读"分割
  sysMsgTyping: boolean        // 信使侧显示"对方正在输入中"
  sysMsgMemberRetract: boolean // 坐席撤回时显示系统消息(关则静默移除)
  popupEnabled: boolean        // 新消息弹窗提醒
  popupAllowClose: boolean     // 允许客户手动关闭弹窗
  customerRetractEnabled: boolean // 客户可撤回自己消息
  // 信使端最终生效语言(URL ?lang= 优先,否则信使设置默认语言);前端据此选系统提示文案语言
  lang: string | null
  // wiki 文章对外阅读页基地址(复制链接/默认浏览器打开 = 此值 + /{shareCode});后端按配置下发
  articleBaseUrl: string | null
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

// 服务坐席头部(对应后端 MessengerAgentVO)。mode 决定文案:
// ASSIGNED_ONLINE 已分配·在线 | ASSIGNED_OFFLINE 已分配·离线 | POOL_ONLINE 未分配有在线 | POOL_BUSY 未分配无人在线
export interface MessengerAgent {
  mode: 'ASSIGNED_ONLINE' | 'ASSIGNED_OFFLINE' | 'POOL_ONLINE' | 'POOL_BUSY'
  agents: { name: string | null; avatar: string | null }[]
  replyTime: string | null
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
  agent: MessengerAgent | null
  // 专属渠道名(会话经专属策略接入时有值):头部品牌名下展示一行渠道名;普通接入为 null
  channelName: string | null
  // 坐席已读位:客户自己最后一条消息 seq>此值→显示「未读」,坐席读后(<=)标签消失
  agentReadSeq: number | null
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
  type: string          // text / image / video / file / rich / article
  content: string       // 文本内容,或 图片/视频/文件 的 URL;article 时为文章标题
  // 文件名/大小 + 说明 + rich 图文片段;article 时存文章卡片快照(title/summary/shareCode)
  payload?: { name?: string; size?: number; caption?: string; segments?: { type: 'text' | 'image'; text?: string; url?: string }[]; articleId?: string; lang?: string; title?: string; summary?: string; shareCode?: string } | null
  internal: boolean | null
  isVisible: boolean | null
  timestamp: number
  // 译文缓存:语言码 → 译文。坐席消息自动翻译后带上,客户端按自己语言显示译文
  translations?: Record<string, string> | null
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

// wiki 文章(信使端:推荐文章 + 阅读)
export interface WikiArticleI18n {
  lang: string
  pubTitle: string | null
  pubSummary: string | null
  pubContent: string | null
}
export interface WikiArticleDetail {
  id: string
  shareCode: string | null
  i18ns: WikiArticleI18n[]
}
export interface WikiRecommend {
  id: string
  title: string | null
  shareCode: string | null
}
