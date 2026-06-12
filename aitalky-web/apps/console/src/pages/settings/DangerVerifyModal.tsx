import { useState, type ReactNode } from 'react'
import { Modal, Form, Input, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { sendCode } from '../../api/auth'
import { getCtx } from '../../auth/session'

interface Props {
  open: boolean
  title: ReactNode
  /** 标题下方说明/须知 */
  topNode?: ReactNode
  onClose: () => void
  /** 校验通过点确定:执行真正的危险操作(失败抛错则不关闭) */
  onConfirm: (projectName: string, password: string, code: string) => Promise<void>
}

// 危险操作二次校验弹窗(负责人转让 / 注销项目共用):项目名 + 登录密码 + 邮箱验证码
export default function DangerVerifyModal({ open, title, topNode, onClose, onConfirm }: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const onSendCode = async () => {
    const email = getCtx().email
    if (!email) return
    try { await sendCode(email, 'SENSITIVE'); message.success(t('auth.codeSent')) } catch { /* 开发期可用万能码 */ }
    let n = 60; setCountdown(n)
    const timer = setInterval(() => { n -= 1; setCountdown(n); if (n <= 0) clearInterval(timer) }, 1000)
  }

  const submit = async () => {
    const v = await form.validateFields()
    setLoading(true)
    try {
      await onConfirm(v.projectName, v.password, v.code)
      form.resetFields()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title={title} okText={t('common.confirm')} cancelText={t('common.cancel')}
      confirmLoading={loading} onOk={submit} onCancel={() => { form.resetFields(); onClose() }} destroyOnClose>
      {topNode}
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
        <Form.Item name="projectName" label={t('team.inputProjectName')} rules={[{ required: true }]}>
          <Input placeholder={t('team.projectName')} />
        </Form.Item>
        <Form.Item name="password" label={<span>{t('team.dangerVerify')} <Typography.Text type="danger">{t('team.dangerHint')}</Typography.Text></span>}
          rules={[{ required: true }]}>
          <Input.Password placeholder={t('team.inputPassword')} />
        </Form.Item>
        <Form.Item name="code" label={t('auth.code')} rules={[{ required: true }]}>
          <Input placeholder={t('auth.code')}
            suffix={countdown > 0 ? <span style={{ color: '#999' }}>{countdown}s</span> : <a onClick={onSendCode}>{t('team.getCode')}</a>} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
