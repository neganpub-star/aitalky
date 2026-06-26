import client from './client'

// 平台协议(隐私 privacy / 订阅 subscription / 服务条款 terms),后管维护,对外只读已发布版。
export interface AgreementVO {
  id: string
  type: string
  language: string
  title: string | null
  content: string | null
  version: string | null
  status: number
}

/** 取已发布协议(缺该语言后端回退 zh_CN) */
export function getAgreement(type: string, lang?: string) {
  return client.get<unknown, AgreementVO | null>('/config/agreement', { params: { type, lang } })
}
