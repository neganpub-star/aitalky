import { Empty, theme } from 'antd'
import { useTranslation } from 'react-i18next'

// 占位页:文章管理(C)、内容配置(D)尚未实现。
export default function WikiWip({ titleKey }: { titleKey?: string }) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  return (
    <div style={{ padding: 24 }}>
      {titleKey && <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>{t(titleKey)}</div>}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80, color: token.colorTextTertiary }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.wip')} />
      </div>
    </div>
  )
}
