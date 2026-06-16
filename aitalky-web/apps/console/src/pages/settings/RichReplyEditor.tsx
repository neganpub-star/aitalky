import { useEffect, useRef, useState } from 'react'
import { PictureOutlined } from '@ant-design/icons'
import { theme, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '../../api/file'

// 话术内容富文本编辑器:文本 + 内嵌图片(可缩放 30/50/100%)。
// 值格式与存储一致:文本原样,图片为 ![SIZE](url) 标记(见 utils/quickReply)。
// 受控初值仅在挂载时灌入(父弹窗 destroyOnClose 每次新建),之后内部维护,变更经 onChange 回传序列化串。

const IMG_RE = /!\[(\d*)\]\(([^)\s]+)\)/g

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 存储串 → 编辑器 HTML
function valueToHtml(value: string): string {
  let html = ''
  let last = 0
  let m: RegExpExecArray | null
  IMG_RE.lastIndex = 0
  while ((m = IMG_RE.exec(value)) !== null) {
    if (m.index > last) html += esc(value.slice(last, m.index)).replace(/\n/g, '<br>')
    const size = m[1]
    const w = size ? ` style="width:${size}%"` : ''
    html += `<img src="${m[2]}" data-size="${size}"${w} />`
    last = m.index + m[0].length
  }
  if (last < value.length) html += esc(value.slice(last)).replace(/\n/g, '<br>')
  return html
}

// 编辑器 DOM → 存储串
function htmlToValue(root: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        out += n.textContent || ''
      } else if (n.nodeName === 'IMG') {
        const img = n as HTMLImageElement
        out += `![${img.getAttribute('data-size') || ''}](${img.getAttribute('src')})`
      } else if (n.nodeName === 'BR') {
        out += '\n'
      } else {
        // DIV/P 等块级:前面补换行(避免首行多换行)
        if (out && !out.endsWith('\n')) out += '\n'
        walk(n)
      }
    })
  }
  walk(root)
  return out.replace(/\n+$/, '')
}

interface Props {
  initialValue: string
  onChange: (value: string) => void
}

export default function RichReplyEditor({ initialValue, onChange }: Props) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // 选中图片做缩放:记录 img 元素 + 浮层位置
  const [sizing, setSizing] = useState<{ img: HTMLImageElement; top: number; left: number } | null>(null)

  // 仅挂载时灌入初值
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = valueToHtml(initialValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => { if (ref.current) onChange(htmlToValue(ref.current)) }

  // 在光标处插入图片
  const insertImage = (url: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const img = document.createElement('img')
    img.src = url
    img.setAttribute('data-size', '50') // 默认 50%
    img.style.width = '50%'
    const sel = window.getSelection()
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0)
      range.collapse(false)
      range.insertNode(img)
      range.setStartAfter(img)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      el.appendChild(img)
    }
    emit()
  }

  const onPick = async (file: File) => {
    if (!file.type.startsWith('image/')) { message.error(t('qr.imageOnly')); return }
    if (file.size > 10 * 1024 * 1024) { message.error(t('qr.imageTooLarge')); return }
    const hide = message.loading(t('qr.uploading'), 0)
    try { insertImage(await uploadFile(file)) } catch { message.error(t('qr.uploadFailed')) } finally { hide() }
  }

  // 点图片弹出缩放选项
  const onClickArea = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.nodeName === 'IMG') {
      const img = target as HTMLImageElement
      const box = ref.current!.getBoundingClientRect()
      const r = img.getBoundingClientRect()
      setSizing({ img, top: r.top - box.top + 4, left: r.left - box.left + 8 })
    } else {
      setSizing(null)
    }
  }
  const applySize = (size: number) => {
    if (sizing) { sizing.img.setAttribute('data-size', String(size)); sizing.img.style.width = `${size}%`; setSizing(null); emit() }
  }

  return (
    <div style={{ position: 'relative', border: `1px solid ${token.colorBorder}`, borderRadius: 8 }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onClick={onClickArea}
        data-ph={t('qr.contentPh')}
        className="qr-editor"
        style={{ minHeight: 200, padding: '10px 12px', fontSize: 14, lineHeight: 1.6, outline: 'none', overflowY: 'auto', maxHeight: 360 }}
      />
      {/* 缩放浮层:30% / 50% / 100% */}
      {sizing && (
        <div style={{ position: 'absolute', top: sizing.top, left: sizing.left, zIndex: 5, display: 'flex', gap: 4, background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, padding: 4, boxShadow: token.boxShadowTertiary }}>
          {[30, 50, 100].map((s) => (
            <span key={s} onClick={() => applySize(s)} style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>{s}%</span>
          ))}
        </div>
      )}
      {/* 底部工具:插入图片 */}
      <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, padding: '6px 12px' }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f); e.target.value = '' }} />
        <PictureOutlined style={{ fontSize: 18, color: token.colorTextSecondary, cursor: 'pointer' }} onClick={() => fileRef.current?.click()} />
      </div>
    </div>
  )
}
