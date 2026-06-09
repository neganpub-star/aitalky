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

export type VerifyScene = 'REGISTER' | 'LOGIN' | 'RESET_PWD'

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
