// 坐席台新消息提醒:WebAudio 提示音 + 浏览器标题未读数。
// 提示音需在用户手势内首次解锁音频(浏览器策略),否则静音。

let audioCtx: AudioContext | null = null

/** 解锁/创建音频上下文(在用户手势内调用一次,如点击会话/发送) */
export function unlockAudio() {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtx = new Ctor()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    // 不支持/被拦截:静默降级
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

// —— 浏览器标题未读数(对齐现网:标签页显示 "(N) 原标题") ——
let baseTitle = ''
function ensureBase() {
  // 去掉已有的 "(N) " 前缀,记住真正的基础标题
  if (!baseTitle) baseTitle = document.title.replace(/^\(\d+\)\s*/, '')
}

/** 设置标题未读数:n>0 显示 "(n) 标题",否则还原 */
export function setTitleUnread(n: number) {
  ensureBase()
  document.title = n > 0 ? `(${n}) ${baseTitle}` : baseTitle
}
