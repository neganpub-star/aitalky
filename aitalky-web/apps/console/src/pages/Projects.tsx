import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Avatar, Button, Card, Empty, Form, Input, List, Modal, Typography, message } from 'antd'
import { AppstoreOutlined, PlusOutlined, LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { createProject, enterProject } from '../api/auth'
import { getCtx, logout, patchCtx, saveEnter } from '../auth/session'
import type { ProjectBrief } from '../types'

const { Title, Text } = Typography

/** 选择/创建项目:登录后在此进入某个项目工作台 */
export default function Projects() {
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
    message.success('项目创建成功')
  }

  const onEnter = async (p: ProjectBrief) => {
    const r = await enterProject(p.id)
    saveEnter(r, p.name)
    nav('/inbox')
  }

  const onLogout = () => {
    logout()
    nav('/login')
  }

  return (
    <div style={styles.wrap}>
      <Card style={styles.card} variant="borderless">
        <div style={styles.head}>
          <div>
            <Title level={4} style={{ margin: 0 }}>选择项目</Title>
            <Text type="secondary">{ctx.email}</Text>
          </div>
          <Button icon={<LogoutOutlined />} onClick={onLogout}>退出</Button>
        </div>

        {projects.length === 0 ? (
          <Empty description="还没有项目,先创建一个" style={{ margin: '32px 0' }} />
        ) : (
          <List
            dataSource={projects}
            renderItem={(p) => (
              <List.Item actions={[<Button type="primary" onClick={() => onEnter(p)}>进入</Button>]}>
                <List.Item.Meta
                  avatar={<Avatar shape="square" icon={<AppstoreOutlined />} style={{ background: '#2f54eb' }} />}
                  title={p.name}
                  description={`appId: ${p.appId}`}
                />
              </List.Item>
            )}
          />
        )}

        <Button type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
          创建项目
        </Button>
      </Card>

      <Modal title="创建项目" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="创建">
        <Form form={form} layout="vertical" onFinish={onCreate} requiredMark={false}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例如:我的客服项目" maxLength={64} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg,#eef2ff 0%,#f5f7fb 100%)',
  },
  card: { width: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', borderRadius: 12 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
}
