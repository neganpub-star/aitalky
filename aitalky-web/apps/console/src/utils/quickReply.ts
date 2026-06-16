// 快捷回复「话术内容」的存储格式与解析:
// 文本原样;内嵌图片以 Markdown 图片标记 ![SIZE](url) 表示(SIZE=30/50/100 百分比,空则原始)。
// 这样后端 content 仍是纯字符串,无需额外结构。

// 图片标记:![可选尺寸](url)
const IMG_RE = /!\[(\d*)\]\(([^)\s]+)\)/g

/** 列表/预览用:把图片标记替换成 [图片] 占位(对齐参考列表展示) */
export function contentToPlaceholder(content: string): string {
  return (content || '').replace(IMG_RE, '[图片]')
}

export type ReplySegment =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string }

/** 把话术内容切成「文本/图片」有序片段,供发送时按序拆成消息 */
export function parseReplySegments(content: string): ReplySegment[] {
  const segs: ReplySegment[] = []
  let last = 0
  let m: RegExpExecArray | null
  IMG_RE.lastIndex = 0
  while ((m = IMG_RE.exec(content)) !== null) {
    if (m.index > last) {
      const txt = content.slice(last, m.index)
      if (txt.trim()) segs.push({ type: 'text', text: txt })
    }
    segs.push({ type: 'image', url: m[2] })
    last = m.index + m[0].length
  }
  if (last < content.length) {
    const txt = content.slice(last)
    if (txt.trim()) segs.push({ type: 'text', text: txt })
  }
  return segs
}

/** 是否含内嵌图片 */
export function hasImage(content: string): boolean {
  IMG_RE.lastIndex = 0
  return IMG_RE.test(content)
}
