// 信使端新消息通知:浏览器 Notification(弹窗) + WebAudio 提示音。
// 对齐信使设置「偏好设置」语义:声效恒开;弹窗受 popupEnabled 控制。
// 二者仅在标签页失焦(document.hidden)时触发——聚焦时用户已能看到,无需打扰。
// 注:popupAllowClose(允许客户手动关闭)在全屏 H5 无对应的应用内可关横幅,
//     待「启动器样式」悬浮气泡形态落地后再接(TODO)。

let audioCtx: AudioContext | null = null

/** 申请通知权限(default 状态才弹系统授权框);需尽量在用户手势内调用 */
export function ensureNotifyPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

/** 解锁/创建音频上下文(浏览器要求在用户手势内首次创建/resume,否则静音) */
export function unlockAudio() {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtx = new Ctor()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    // 不支持/被拦截:静默降级(无声音)
  }
}

/** 醒目"叮咚"提示音:双音上扬(WebAudio 合成,无需音频文件) */
export function playBeep() {
  try {
    if (!audioCtx) return
    const ctx = audioCtx
    const tone = (freq: number, start: number, dur: number, peak = 0.32) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.type = 'triangle'
      o.frequency.value = freq
      const t = ctx.currentTime + start
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.start(t)
      o.stop(t + dur + 0.02)
    }
    tone(880, 0, 0.18)
    tone(1319, 0.16, 0.3)
  } catch {
    // 忽略
  }
}

// —— 浏览器标题未读数:失焦时新消息让标签页显示 "(N) 原标题" ——
let baseTitle = ''
function ensureBase() {
  if (!baseTitle) baseTitle = document.title.replace(/^\(\d+\)\s*/, '')
}

/** 设置标题未读数:n>0 显示 "(n) 标题",否则还原 */
export function setTitleUnread(n: number) {
  ensureBase()
  document.title = n > 0 ? `(${n}) ${baseTitle}` : baseTitle
}

/** 浏览器弹窗通知(已授权才弹);点击聚焦回本页 */
export function showPopup(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const n = new Notification(title, { body })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // 忽略
  }
}
