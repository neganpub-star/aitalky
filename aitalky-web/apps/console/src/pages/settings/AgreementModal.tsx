import { useEffect, useState } from 'react'
import { Modal, Spin, Empty, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { getAgreement, type AgreementVO } from '../../api/agreement'
import { sanitizeHtml } from '../../utils/sanitize'

// 协议查看弹层(订阅/加购弹窗「我已阅读并同意《xx协议》」点击打开)。按当前界面语言取已发布协议。
export default function AgreementModal({ type, open, onClose }: {
  type: string; open: boolean; onClose: () => void
}) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const lang = useAppStore((s) => s.lang)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AgreementVO | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getAgreement(type, lang).then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [open, type, lang])

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={680}
      title={data?.title || t('bill.protocolTitle')} styles={{ body: { maxHeight: '64vh', overflow: 'auto' } }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : data?.content ? (
        <div className="wiki-article-html" style={{ fontSize: 14, lineHeight: 1.9, color: token.colorText }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.content) }} />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('bill.protocolEmpty')} />
      )}
    </Modal>
  )
}
