import client from './client'

// 信使多语言内容(问候语/团队介绍/紧急通知,按语言)
export interface MessengerI18n {
  language: string
  greeting: string | null
  teamIntro: string | null
  urgentNotice: string | null
  urgentEnabled: boolean
}

// 信使配置(对应 mse_messenger + mse_messenger_i18n)
// brandName/logo 为项目名称/LOGO(只读,后端注入);enabledLanguages/defaultLanguage 派生自语种表(只读)
export interface MessengerConfigVO {
  brandName: string | null
  logo: string | null
  customDomain: string | null
  badge: string | null
  webTitle: string | null
  webIcon: string | null
  defaultLanguage: string
  enabledLanguages: string[]
  replyTime: string | null
  messageRetentionDays: number
  popupEnabled: boolean
  popupAllowClose: boolean
  sysMsgUnread: boolean
  sysMsgTyping: boolean
  sysMsgMemberRetract: boolean
  customerRetractEnabled: boolean
  i18n: MessengerI18n[]
}

// 启用语种(对应 mse_messenger_language)
export interface MessengerLanguageVO {
  language: string
  isDefault: boolean
}

export function getMessengerConfig() {
  return client.get<unknown, MessengerConfigVO>('/messenger-config')
}

// 整体保存(基础字段 + 多语言内容);各卡片「保存」都提交完整对象,简单稳妥
export function saveMessengerConfig(cfg: MessengerConfigVO) {
  return client.put<unknown, void>('/messenger-config', cfg)
}

// 启用语种读写(常规设置页;覆盖式保存)
export function getMessengerLanguages() {
  return client.get<unknown, MessengerLanguageVO[]>('/messenger-config/languages')
}
export function saveMessengerLanguages(languages: MessengerLanguageVO[]) {
  return client.put<unknown, void>('/messenger-config/languages', languages)
}
