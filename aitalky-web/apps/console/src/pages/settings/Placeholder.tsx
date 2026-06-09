import { Card, Empty } from 'antd'
import { useTranslation } from 'react-i18next'

// 设置区未实现模块的占位页
export default function Placeholder({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <Card title={title} variant="borderless">
      <Empty description={t('settings.wip')} />
    </Card>
  )
}
