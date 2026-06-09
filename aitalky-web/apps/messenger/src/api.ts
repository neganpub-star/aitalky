import axios from 'axios'
import type { AccessParams, MessageVO, MessengerInit } from './types'
import { normInit, normMessage } from './normalize'

// 信使端请求客户端:拆解后端统一响应 R(成功取 data,失败 reject)。客户令牌存内存,不落 localStorage(安全)
const client = axios.create({ baseURL: '/api/public/messenger', timeout: 15000 })

let customerToken = ''
export function setToken(token: string) {
  customerToken = token
}

client.interceptors.request.use((cfg) => {
  if (customerToken) {
    cfg.headers.Authorization = `Bearer ${customerToken}`
  }
  return cfg
})

client.interceptors.response.use(
  (resp) => {
    const r = resp.data
    if (r && typeof r.code === 'number') {
      if (r.code === 0) return r.data
      return Promise.reject(new Error(r.message || 'fail'))
    }
    return r
  },
  (err) => Promise.reject(err),
)

/** 初始化会话:校验 appId,解析/创建客户与会话,签发客户令牌 */
export async function init(p: AccessParams): Promise<MessengerInit> {
  return normInit(
    await client.post<unknown, MessengerInit>('/init', {
      appId: p.appId,
      groupId: p.groupId,
      userId: p.userId,
      visitorId: p.visitorId,
      lang: p.lang,
      source: p.source ?? 'web',
    }),
  )
}

/** 客户发送消息 */
export async function sendMessage(conversationId: string, content: string, type = 'text'): Promise<MessageVO> {
  return normMessage(await client.post<unknown, MessageVO>('/messages', { conversationId, content, type }))
}

/** 拉消息:afterSeq 增量(不传取最近 50 条);客户看不到内部消息(后端已过滤) */
export async function syncMessages(conversationId: string, afterSeq?: number): Promise<MessageVO[]> {
  const list = await client.get<unknown, MessageVO[]>('/messages', {
    params: afterSeq == null ? { conversationId } : { conversationId, afterSeq },
  })
  return list.map(normMessage)
}
