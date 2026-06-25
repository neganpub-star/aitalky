import { useEffect, useRef, type CSSProperties } from 'react'
import { theme } from 'antd'
import { createEditor, createToolbar, type IDomEditor } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { uploadFile } from '../../api/file'

// wangEditor v5 富文本编辑器封装(核心 API,框架无关 → 不受 React 版本影响)。
// 内容存 HTML;工具栏精简为「图片/链接/表格」(对齐参考底部插入栏);图片 30/50/100% resize、
// 表格增删、链接编辑等悬浮菜单(hoverbar)由 wangEditor 自带。
// 多语言切换由父层用 key 强制重挂载注入对应语言初始内容。
export default function RichEditor({ value, onChange, placeholder }: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const { token } = theme.useToken()
  const editorBoxRef = useRef<HTMLDivElement>(null)
  const toolbarBoxRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<IDomEditor | null>(null)
  // onChange 用 ref 持有,避免初始化闭包过期
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!editorBoxRef.current || !toolbarBoxRef.current) return
    const editor = createEditor({
      selector: editorBoxRef.current,
      html: value || '<p><br></p>',
      mode: 'default',
      config: {
        placeholder: placeholder || '',
        onChange: (e: IDomEditor) => onChangeRef.current(e.getHtml()),
        MENU_CONF: {
          // 图片上传走项目统一上传(MinIO)
          uploadImage: {
            async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
              try {
                const url = await uploadFile(file)
                insertFn(url, '', url)
              } catch { /* 上传失败由 client 拦截器提示 */ }
            },
          },
        },
        // 选中文字浮动菜单(对齐参考):标题/加粗/斜体/下划线/删除线/字色/背景色/对齐/列表/链接
        hoverbarKeys: {
          text: {
            menuKeys: ['headerSelect', '|', 'bold', 'italic', 'underline', 'through', '|',
              'color', 'bgColor', '|', 'justifyLeft', 'justifyCenter', 'justifyRight', '|',
              'bulletedList', 'numberedList', '|', 'insertLink', 'clearStyle'],
          },
        },
      },
    })
    editorRef.current = editor
    createToolbar({
      editor,
      selector: toolbarBoxRef.current,
      mode: 'default',
      config: { toolbarKeys: ['uploadImage', 'insertLink', 'insertTable'] },
    })
    return () => { editor.destroy(); editorRef.current = null }
    // 仅挂载时初始化(value 初值注入;语言切换由父层 key 重挂载)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // wangEditor 用 CSS 变量控制配色——注入 AntD 主题 token,使编辑区/工具栏随白天黑夜主题切换
  const editorVars = {
    '--w-e-textarea-bg-color': token.colorBgContainer,
    '--w-e-textarea-color': token.colorText,
    '--w-e-textarea-slight-color': token.colorTextTertiary,
    '--w-e-textarea-slight-bg-color': token.colorFillTertiary, // 表格表头行/代码块底色,默认浅灰,暗色下要跟随
    '--w-e-textarea-slight-border-color': token.colorBorderSecondary,
    '--w-e-textarea-border-color': token.colorBorderSecondary,
    '--w-e-textarea-handler-bg-color': token.colorPrimary, // 图片拖拽手柄 + 复用为正文链接色
    '--w-e-toolbar-bg-color': token.colorBgElevated,
    '--w-e-toolbar-color': token.colorText,
    '--w-e-toolbar-active-color': token.colorPrimary,
    '--w-e-toolbar-active-bg-color': token.colorFillSecondary,
    '--w-e-toolbar-border-color': token.colorBorderSecondary,
    '--w-e-toolbar-disabled-color': token.colorTextDisabled,
    '--w-e-modal-button-bg-color': token.colorFillTertiary, // 弹框「确定」按钮底色,默认 #fafafa 暗色下白底
    '--w-e-modal-button-border-color': token.colorBorder,
  } as CSSProperties

  return (
    <div className="wiki-rich-editor" style={editorVars}>
      {/* 无边框铺满(对齐参考);底部留白避免内容被浮动工具栏遮挡 */}
      <div ref={editorBoxRef} style={{ minHeight: '60vh', paddingBottom: 72 }} />
      {/* 工具栏固定悬浮在页面底部居中(对齐参考,不随内容滚动) */}
      <div ref={toolbarBoxRef} className="wiki-rich-toolbar-float" />
    </div>
  )
}
