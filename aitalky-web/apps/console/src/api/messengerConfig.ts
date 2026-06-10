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
  i18n: MessengerI18n[]
}

export function getMessengerConfig() {
  return client.get<unknown, MessengerConfigVO>('/messenger-config')
}

// 整体保存(基础字段 + 多语言内容);各卡片「保存」都提交完整对象,简单稳妥
export function saveMessengerConfig(cfg: MessengerConfigVO) {
  return client.put<unknown, void>('/messenger-config', cfg)
}
