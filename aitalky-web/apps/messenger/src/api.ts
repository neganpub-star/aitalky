import axios from 'axios'
import type { AccessParams, MessageVO, MessengerAgent, MessengerInit, WikiArticleDetail, WikiRecommend } from './types'
import { normInit, normMessage } from './normalize'
import { currentLang } from './i18n'

// 信使端请求客户端:拆解后端统一响应 R(成功取 data,失败 reject)。客户令牌存内存,不落 localStorage(安全)
const client = axios.create({ baseURL: '/api/public/messenger', timeout: 15000 })

let customerToken = ''
export function setToken(token: string) {
  customerToken = token
}

// 客户令牌过期(401)回调:由 App 注册为"重新 init"——令牌存内存、有 TTL(默认12h),页面长开会过期,
// 过期后需重新签发(换新令牌+会话+重连 WS),否则后台轮询/发送一直 401 卡在"未登录或过期"。
let onUnauthorized: (() => void) | null = null
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn
}

client.interceptors.request.use((cfg) => {
  if (customerToken) {
    cfg.headers.Authorization = `Bearer ${customerToken}`
  }
  cfg.headers.lang = currentLang() // 带界面语言,后端据此本地化错误提示(/api/public 不走 AuthInterceptor,由 MessageUtil 读头)
  return cfg
})

client.interceptors.response.use(
  (resp) => {
    const r = resp.data
    if (r && typeof r.code === 'number') {
      if (r.code === 0) return r.data
      // 客户令牌过期/失效(401):触发 App 重新 init(静默重建会话);init 自身无需令牌不会 401,无循环风险
      if (r.code === 401 && !resp.config.url?.endsWith('/init')) {
        onUnauthorized?.()
      }
      // 业务失败:保留错误码(前端按码本地化提示,如 1024=会话暂不可用)
      const e = new Error(r.message || 'fail') as Error & { code?: number }
      e.code = r.code
      return Promise.reject(e)
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

/** 客户发送消息。payload=图片/视频/文件结构化内容(文件名/大小) */
export async function sendMessage(
  conversationId: string, content: string, type = 'text', payload?: { name?: string; size?: number },
): Promise<MessageVO> {
  return normMessage(await client.post<unknown, MessageVO>('/messages', { conversationId, content, type, payload }))
}

// wiki 公开接口(免登录,baseURL 不同于会话接口);复用统一响应 R 解包
const wikiClient = axios.create({ baseURL: '/api/public/wiki', timeout: 15000 })
wikiClient.interceptors.request.use((cfg) => { cfg.headers.lang = currentLang(); return cfg })
wikiClient.interceptors.response.use((resp) => {
  const r = resp.data
  if (r && typeof r.code === 'number') {
    if (r.code === 0) return r.data
    return Promise.reject(new Error(r.message || 'fail'))
  }
  return r
}, (err) => Promise.reject(err))

/** 信使首页推荐文章(已发布+推荐,最多5篇) */
export function recommendedArticles(appId: string, lang?: string): Promise<WikiRecommend[]> {
  return wikiClient.get<unknown, WikiRecommend[]>('/recommended', { params: { appId, lang } })
}

/** 按外链码取已发布文章(信使端阅读) */
export function publicArticle(shareCode: string): Promise<WikiArticleDetail> {
  return wikiClient.get<unknown, WikiArticleDetail>(`/article/${shareCode}`)
}

/** 客户上传文件(图片/文档),返回 MinIO URL。带客户令牌(拦截器自动附加) */
export function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  return client.post<unknown, string>('/upload', fd)
}

/** 客户正在输入(瞬时通知;客户端节流调用,不落库) */
export async function sendTyping(conversationId: string): Promise<void> {
  await client.post<unknown, void>('/typing', undefined, { params: { conversationId } })
}

/** 客户上报已读位(静默,无 UI;聊天可见时调,坐席端据此显示"已读") */
export async function sendRead(conversationId: string, seq: number): Promise<void> {
  await client.post<unknown, void>('/read', undefined, { params: { conversationId, seq } })
}

/** 客户撤回自己的消息(受信使设置「客户撤回权限」开关 + 2分钟时限控制) */
export async function retractMessage(conversationId: string, msgId: string): Promise<MessageVO> {
  return normMessage(
    await client.post<unknown, MessageVO>(`/messages/${msgId}/retract`, undefined, { params: { conversationId } }),
  )
}

/** 刷新服务坐席头部(坐席上下线/会话被认领后,focus/重连时拉最新) */
export async function getAgent(conversationId: string): Promise<MessengerAgent> {
  return client.get<unknown, MessengerAgent>('/agent', { params: { conversationId } })
}

/** 拉消息:afterSeq 增量(不传取最近 50 条);客户看不到内部消息(后端已过滤) */
export async function syncMessages(conversationId: string, afterSeq?: number): Promise<MessageVO[]> {
  const list = await client.get<unknown, MessageVO[]>('/messages', {
    params: afterSeq == null ? { conversationId } : { conversationId, afterSeq },
  })
  return list.map(normMessage)
}

/** 历史向上翻页:取 seq < beforeSeq 的最近 50 条(升序) */
export async function loadBeforeMessages(conversationId: string, beforeSeq: number): Promise<MessageVO[]> {
  const list = await client.get<unknown, MessageVO[]>('/messages', {
    params: { conversationId, beforeSeq },
  })
  return list.map(normMessage)
}
