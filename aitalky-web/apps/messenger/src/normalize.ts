import type { MessageVO, MessengerInit } from './types'

// 后端 Long 统一序列化为 String(防雪花ID丢精度)。seq/timestamp/lastSeq 是小整数(< 2^53),
// 在数据入口转回真正的 number(否则 new Date(字符串)→NaN、数值比较出错);雪花ID字段保持 string。

export function normMessage(m: MessageVO): MessageVO {
  return { ...m, seq: Number(m.seq), timestamp: Number(m.timestamp) }
}

export function normInit(d: MessengerInit): MessengerInit {
  return { ...d, lastSeq: Number(d.lastSeq) }
}
