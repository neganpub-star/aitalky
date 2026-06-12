// 后端雪花ID为字符串(后端已配置 Long->String,避免 JS 丢精度)
export interface ProjectBrief {
  id: string
  name: string
  appId: string
}

export interface LoginResult {
  token: string
  accountId: string
  email: string
  projects: ProjectBrief[]
}

export interface EnterResult {
  token: string
  projectId: string
  memberId: string
  roleId: string
  roleName: string
  functions: string[]
}

export interface WhoAmI {
  projectId: string
  accountId: string
  memberId: string
  functions: string[]
  lang: string | null
}

export type VerifyScene = 'REGISTER' | 'LOGIN' | 'RESET_PWD' | 'SENSITIVE'

// 项目基本信息(对应后端 ProjectDetailVO)
export interface ProjectDetailVO {
  id: string
  name: string
  logo: string | null
  appId: string
  ownerMemberId: string | null
  isOwner: boolean
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export interface MemberVO {
  id: string
  accountId: string
  email: string
  nickname: string
  avatar: string | null
  roleId: string
  roleName: string
  status: number
  onlineStatus: number
  workStatus: number
}

export interface RoleVO {
  id: string
  name: string
  isSystem: number
}

// 邮箱邀请记录行(对应后端 EmailInviteVO)。status: 0待接受 1已接受 2已撤销 3已过期
export interface EmailInviteVO {
  id: string
  inviterName: string | null
  email: string
  roleName: string | null
  memberNickname: string | null
  status: number
  valid: boolean
  sendCount: number
  createTime: string
}

// 链接邀请记录行(对应后端 LinkInviteVO)。accessType: 0公开 1私密
export interface LinkInviteVO {
  id: string
  inviterName: string | null
  roleName: string | null
  joinCount: number
  accessType: number
  valid: boolean
  token: string
  createTime: string
}

// 链接邀请详情
export interface LinkInviteDetailVO {
  id: string
  projectName: string | null
  roleName: string | null
  joinCount: number
  accessType: number
  accessCode: string | null
  valid: boolean
  token: string
  createTime: string
  expireTime: string | null
}

// 邀请落地页信息(公开接口)。type: email/link
export interface InviteInfoVO {
  type: 'email' | 'link'
  projectId: string
  projectName: string | null
  projectLogo: string | null
  roleName: string | null
  email: string | null
  inviterName: string | null
  needCode: boolean
  valid: boolean
  reason: string | null
}

// 会话列表项(对应后端 ConversationVO)。status: 0等待 1进行中 2已结束
export interface ConversationVO {
  id: string
  customerId: string
  customerName: string
  customerAvatar: string | null
  assigneeMemberId: string | null
  status: number
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  lastSeq: number | null
}

// 会话详情(会话 + 客户信息,供详情面板用)
export interface ConversationDetailVO {
  id: string
  status: number
  source: string | null
  ip: string | null
  location: string | null
  autoTranslate: number | null
  assigneeMemberId: string | null
  lastMessageAt: string | null
  customerId: string | null
  externalUserId: string | null
  customerName: string | null
  customerAvatar: string | null
  customerType: number | null
  sourceLanguage: string | null
  contact: string | null
  email: string | null
  customAttrs: string | null
  lastSeq: number | null
  assigneeName: string | null
  // 客户已读到的 seq(已读回执:坐席自己消息 seq<=此值显示"已读")
  customerReadSeq: number | null
  // 该客户是否已在黑名单 + 命中记录 id(详情面板「加入/移除黑名单」状态切换)
  blocked: boolean | null
  blacklistId: string | null
}

// 坐席端本地待发/失败消息(乐观渲染,未落库,按会话隔离);成功后移除并以服务端消息按 seq 入列
export interface PendingMsg {
  localId: string
  conversationId: string
  content: string
  internal: boolean
  status: 'sending' | 'failed'
  time: number
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
