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

/** 醒目"叮咚"提示音:双音上扬(WebAudio 合成,无需音频文件) */
export function playBeep() {
  try {
    if (!audioCtx) return
    const ctx = audioCtx
    // 单个音符:三角波更明亮,快速起落避免爆音
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
    // 叮(A5)→ 咚(E6),上扬两声更抓耳
    tone(880, 0, 0.18)
    tone(1319, 0.16, 0.3)
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
