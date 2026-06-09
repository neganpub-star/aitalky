import type { MessageVO } from './types'
import { normMessage } from './normalize'

// 信使端 WS:客户令牌连 /ws?token,后端按 identity(cust:{id})推送其全部连接——无需订阅会话。
// 同样遵守"WS 只当通知、seq 当真相":断连/弱网漏帧由 onOpen 重连补漏 + 周期对账兜底(见 App)。
export type WsStatus = 'connecting' | 'open' | 'closed'

type MsgFn = (m: MessageVO) => void
type StatusFn = (s: WsStatus) => void
type OpenFn = () => void

const PING_INTERVAL = 25_000
const RECONNECT_BASE = 1_000
const RECONNECT_MAX = 15_000

class MessengerWs {
  private ws: WebSocket | null = null
  private token = ''
  private manualClosed = false
  private attempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private msgFns = new Set<MsgFn>()
  private statusFns = new Set<StatusFn>()
  private openFns = new Set<OpenFn>()
  private status: WsStatus = 'closed'

  connect(token: string) {
    if (!token) return
    this.token = token
    this.manualClosed = false
    this.open()
  }

  private open() {
    this.cleanup()
    this.setStatus('connecting')
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(this.token)}`)
    this.ws = ws
    ws.onopen = () => {
      this.attempts = 0
      this.setStatus('open')
      this.startPing()
      this.openFns.forEach((fn) => fn())
    }
    ws.onmessage = (ev) => {
      let data: Record<string, unknown>
      try {
        data = JSON.parse(ev.data as string)
      } catch {
        return
      }
      // 控制帧(connected/pong)忽略;含 msgId 的为消息帧(seq/timestamp 规范化为 number)
      if (typeof data.msgId !== 'undefined') {
        const msg = normMessage(data as unknown as MessageVO)
        this.msgFns.forEach((fn) => fn(msg))
      }
    }
    ws.onclose = () => {
      this.stopPing()
      this.setStatus('closed')
      if (!this.manualClosed) this.scheduleReconnect()
    }
    ws.onerror = () => ws.close()
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = Math.min(RECONNECT_BASE * 2 ** this.attempts, RECONNECT_MAX)
    this.attempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.manualClosed && this.token) this.open()
    }, delay)
  }

  private startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send('{"type":"ping"}')
    }, PING_INTERVAL)
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private cleanup() {
    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onclose = this.ws.onerror = null
      try {
        this.ws.close()
      } catch {
        // 忽略关闭异常
      }
      this.ws = null
    }
  }

  private setStatus(s: WsStatus) {
    this.status = s
    this.statusFns.forEach((fn) => fn(s))
  }

  onMessage(fn: MsgFn) {
    this.msgFns.add(fn)
    return () => this.msgFns.delete(fn)
  }

  onStatus(fn: StatusFn) {
    this.statusFns.add(fn)
    fn(this.status)
    return () => this.statusFns.delete(fn)
  }

  onOpen(fn: OpenFn) {
    this.openFns.add(fn)
    return () => this.openFns.delete(fn)
  }

  close() {
    this.manualClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopPing()
    this.cleanup()
    this.setStatus('closed')
  }
}

export const messengerWs = new MessengerWs()
