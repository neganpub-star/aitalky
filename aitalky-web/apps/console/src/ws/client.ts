import type { MessageVO } from '../types'
import { normMessage } from '../normalize'

// WS 连接状态:供 UI 展示在线/重连中
export type WsStatus = 'connecting' | 'open' | 'closed'

type MessageListener = (msg: MessageVO) => void
type StatusListener = (status: WsStatus) => void
type OpenListener = () => void

// 心跳间隔(后端读空闲 60s,这里 25s 发一次 ping 足够保活)
const PING_INTERVAL = 25_000
// 重连退避:首 1s,指数增长封顶 15s
const RECONNECT_BASE = 1_000
const RECONNECT_MAX = 15_000

/**
 * 坐席端 WS 客户端(单例)。
 * <p>职责:连接 `/ws?token=`、ping 心跳保活、断线指数退避重连、按会话订阅/退订、消息分发。
 * <p>推送帧两类:控制帧(含 `type` 字段,如 connected/pong)与消息帧(MessageVO,无 type 字段不在此列——
 * 实际 MessageVO 也有 type 字段表示消息类型,故以是否含 `msgId` 区分消息帧)。
 * <p>重连后自动补发已记录的订阅,避免"代看会话"在重连后漏推。
 */
class WsClient {
  private ws: WebSocket | null = null
  private token = ''
  private manualClosed = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  /** 当前订阅的会话集合(重连后据此补订阅) */
  private subscriptions = new Set<string>()
  private messageListeners = new Set<MessageListener>()
  private statusListeners = new Set<StatusListener>()
  private openListeners = new Set<OpenListener>()
  private status: WsStatus = 'closed'

  /** 建立连接(已连同一 token 则忽略);token 变更会重连 */
  connect(token: string) {
    if (!token) {
      return
    }
    if (this.ws && this.token === token && this.status !== 'closed') {
      return
    }
    this.token = token
    this.manualClosed = false
    this.open()
  }

  private open() {
    this.cleanupSocket()
    this.setStatus('connecting')
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${location.host}/ws?token=${encodeURIComponent(this.token)}`
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('open')
      this.startPing()
      // 重连补订阅
      this.subscriptions.forEach((cid) => this.send({ type: 'subscribe', conversationId: Number(cid) }))
      // 通知上层做"重连补漏":每次 open(首连/重连)都触发,上层据此对当前会话 sync 对账
      this.openListeners.forEach((fn) => fn())
    }

    ws.onmessage = (ev) => {
      let data: Record<string, unknown>
      try {
        data = JSON.parse(ev.data as string)
      } catch {
        return
      }
      // 控制帧:connected / pong 直接忽略;含 msgId 的为消息帧(seq/timestamp 规范化为 number)
      if (typeof data.msgId !== 'undefined') {
        const msg = normMessage(data as unknown as MessageVO)
        this.messageListeners.forEach((fn) => fn(msg))
      }
    }

    ws.onclose = () => {
      this.stopPing()
      this.setStatus('closed')
      if (!this.manualClosed) {
        this.scheduleReconnect()
      }
    }

    // onerror 后浏览器会触发 onclose,统一在 onclose 处理重连
    ws.onerror = () => ws.close()
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return
    }
    const delay = Math.min(RECONNECT_BASE * 2 ** this.reconnectAttempts, RECONNECT_MAX)
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.manualClosed && this.token) {
        this.open()
      }
    }, delay)
  }

  private startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_INTERVAL)
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private cleanupSocket() {
    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onclose = this.ws.onerror = null
      try {
        this.ws.close()
      } catch {
        // 关闭异常忽略
      }
      this.ws = null
    }
  }

  private send(obj: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj))
    }
  }

  private setStatus(s: WsStatus) {
    this.status = s
    this.statusListeners.forEach((fn) => fn(s))
  }

  /** 订阅会话(打开会话即调用,推送目标来源) */
  subscribe(conversationId: string) {
    this.subscriptions.add(conversationId)
    this.send({ type: 'subscribe', conversationId: Number(conversationId) })
  }

  /** 退订会话(切走/关闭会话时调用) */
  unsubscribe(conversationId: string) {
    this.subscriptions.delete(conversationId)
    this.send({ type: 'unsubscribe', conversationId: Number(conversationId) })
  }

  /** 注册消息监听,返回取消函数 */
  onMessage(fn: MessageListener): () => void {
    this.messageListeners.add(fn)
    return () => this.messageListeners.delete(fn)
  }

  /** 注册状态监听,返回取消函数;注册时立即回传当前状态 */
  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn)
    fn(this.status)
    return () => this.statusListeners.delete(fn)
  }

  /** 注册"连接 open(含重连)"监听,返回取消函数。用于断线重连后的补漏对账 */
  onOpen(fn: OpenListener): () => void {
    this.openListeners.add(fn)
    return () => this.openListeners.delete(fn)
  }

  getStatus(): WsStatus {
    return this.status
  }

  /** 主动断开(退出登录/切项目时) */
  close() {
    this.manualClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopPing()
    this.cleanupSocket()
    this.subscriptions.clear()
    this.setStatus('closed')
  }
}

// 全局单例:整个坐席台共用一条连接(多端能力由后端按 identity 聚合)
export const wsClient = new WsClient()
