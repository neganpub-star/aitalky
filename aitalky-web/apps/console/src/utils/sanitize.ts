import DOMPurify from 'dompurify'

// wiki 文章正文为富文本 HTML(wangEditor 输出),渲染前统一过滤,防存储型 XSS。
// 允许富文本常见标签/属性(图片/链接/表格/样式),禁止 script/事件处理器等。
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'colspan', 'rowspan', 'style', 'width'],
    ADD_TAGS: ['iframe'],
    FORBID_TAGS: ['script', 'style'],
  })
}
