import { useEffect, useState } from 'react'
import { Alert, Button, message, theme } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { deactivateProject, getCurrentProject } from '../../api/project'
import { logout } from '../../auth/session'
import DangerVerifyModal from './DangerVerifyModal'
import type { ProjectDetailVO } from '../../types'

// 注销项目(对齐现网):警示横幅 + 确认注销 → 危险二次校验弹窗(5 条须知);仅负责人
export default function DeactivateProject() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const [detail, setDetail] = useState<ProjectDetailVO | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => { getCurrentProject().then(setDetail) }, [])

  const onConfirm = async (projectName: string, password: string, code: string) => {
    await deactivateProject(projectName, password, code)
    message.success(t('team.deactivated'))
    logout()
    nav('/login')
  }

  const warnings = (
    <ol style={{ paddingLeft: 18, margin: '8px 0 0', color: token.colorTextSecondary, lineHeight: 1.9 }}>
      {[1, 2, 3, 4, 5].map((i) => <li key={i}>{t(`team.deactivateWarn${i}`)}</li>)}
    </ol>
  )

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{t('settings.deactivate')}</div>
      <Alert type="warning" showIcon message={t('team.deactivateBanner')} style={{ marginBottom: 20 }} />
      <Button type="primary" disabled={!detail?.isOwner} onClick={() => setOpen(true)}>
        {t('team.confirmDeactivate')}
      </Button>
      {!detail?.isOwner && <span style={{ marginLeft: 12, color: token.colorTextTertiary }}>{t('team.ownerOnly')}</span>}

      <DangerVerifyModal
        open={open}
        title={<span>⚠ {t('settings.deactivate')}</span>}
        topNode={warnings}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      />
    </div>
  )
}
