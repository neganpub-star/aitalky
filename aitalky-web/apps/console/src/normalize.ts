import type { ConversationDetailVO, ConversationVO, MessageVO } from './types'

// 后端把所有 Long 序列化为 String(防雪花ID在JS丢精度)。但 seq/timestamp/lastSeq 是小整数
// (远小于 2^53),应在数据入口统一转回真正的 number,否则 new Date(字符串)/数值比较会出错。
// 雪花ID字段(msgId/conversationId/各种Id)保持 string —— 它们超 2^53,转 number 才会丢精度。

export function normMessage(m: MessageVO): MessageVO {
  return { ...m, seq: Number(m.seq), timestamp: Number(m.timestamp) }
}

export function normConversation(c: ConversationVO): ConversationVO {
  return { ...c, lastSeq: c.lastSeq == null ? null : Number(c.lastSeq) }
}

export function normDetail(d: ConversationDetailVO): ConversationDetailVO {
  return { ...d, lastSeq: d.lastSeq == null ? null : Number(d.lastSeq) }
}
