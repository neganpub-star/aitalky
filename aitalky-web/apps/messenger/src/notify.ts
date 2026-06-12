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

/** 短促"叮"提示音(WebAudio 合成,无需音频文件) */
export function playBeep() {
  try {
    if (!audioCtx) return
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.connect(g)
    g.connect(audioCtx.destination)
    o.type = 'sine'
    o.frequency.value = 660
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25)
    o.start()
    o.stop(audioCtx.currentTime + 0.26)
  } catch {
    // 忽略
  }
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
