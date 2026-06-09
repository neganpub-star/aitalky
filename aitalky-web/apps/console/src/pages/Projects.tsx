import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Avatar, Button, Card, Empty, Form, Input, List, Modal, Typography, message, theme } from 'antd'
import { AppstoreOutlined, PlusOutlined, LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createProject, enterProject } from '../api/auth'
import { getCtx, logout, patchCtx, saveEnter } from '../auth/session'
import type { ProjectBrief } from '../types'

const { Title, Text } = Typography

// 选择/创建项目:登录后在此进入某个项目工作台(ByteTrack 经左上角切换;首登录在此建首个项目)
export default function Projects() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const ctx = getCtx()
  const [projects, setProjects] = useState<ProjectBrief[]>(ctx.projects || [])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const onCreate = async (v: { name: string }) => {
    const p = await createProject(v.name)
    const next = [...projects, p]
    setProjects(next)
    patchCtx({ projects: next })
    setOpen(false)
    form.resetFields()
    message.success(t('common.create') + ' ✓')
  }

  const onEnter = async (p: ProjectBrief) => {
    saveEnter(await enterProject(p.id), p.name)
    nav('/inbox')
  }

  const styles: Record<string, CSSProperties> = {
    wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: token.colorBgLayout },
    card: { width: 460, boxShadow: token.boxShadowSecondary, borderRadius: 12 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  }

  return (
    <div style={styles.wrap}>
      <Card style={styles.card} variant="borderless">
        <div style={styles.head}>
          <div>
            <Title level={4} style={{ margin: 0 }}>{t('project.select')}</Title>
            <Text type="secondary">{ctx.email}</Text>
          </div>
          <Button icon={<LogoutOutlined />} onClick={() => { logout(); nav('/login') }}>{t('common.logout')}</Button>
        </div>

        {projects.length === 0 ? (
          <Empty description={t('project.empty')} style={{ margin: '32px 0' }} />
        ) : (
          <List
            dataSource={projects}
            renderItem={(p) => (
              <List.Item actions={[<Button type="primary" onClick={() => onEnter(p)}>{t('project.enter')}</Button>]}>
                <List.Item.Meta
                  avatar={<Avatar shape="square" icon={<AppstoreOutlined />} style={{ background: token.colorPrimary }} />}
                  title={p.name}
                  description={`appId: ${p.appId}`}
                />
              </List.Item>
            )}
          />
        )}

        <Button type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
          {t('project.create')}
        </Button>
      </Card>

      <Modal title={t('project.create')} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText={t('common.create')}>
        <Form form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>
          <Form.Item name="name" label={t('project.name')} rules={[{ required: true, message: t('project.name') }]}>
            <Input placeholder={t('project.namePlaceholder')} maxLength={64} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
