// wiki 文章目录(TOC)工具:从正文 HTML 解析 h1/h2/h3,以及点击滚动、滚动高亮当前章节。
// 编辑页/实时预览/对外阅读页共用,保证「目录下标」与「正文标题」按非空标题顺序一一对应。

export interface TocItem { level: number; text: string }

// 解析正文 HTML 里的标题(过滤空标题,与滚动定位的下标对齐)
export function parseToc(html: string): TocItem[] {
  if (!html) return []
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return Array.from(doc.querySelectorAll('h1,h2,h3')).map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: el.textContent?.trim() || '',
    })).filter((x) => x.text)
  } catch { return [] }
}

// 容器内非空标题元素(顺序与 parseToc 一致)
function headings(root: Element | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll('h1,h2,h3')).filter((h) => h.textContent?.trim()) as HTMLElement[]
}

// 滚动到第 idx 个标题
export function scrollToHeading(root: Element | null, idx: number) {
  headings(root)[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 计算当前应高亮的标题下标:取最后一个顶部已滚过 threshold 的标题
export function activeHeadingIdx(root: Element | null, threshold: number): number {
  const hs = headings(root)
  let cur = 0
  hs.forEach((h, idx) => { if (h.getBoundingClientRect().top <= threshold) cur = idx })
  return cur
}
