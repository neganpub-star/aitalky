import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import { Empty, theme } from 'antd'
import {
  SearchOutlined, ControlOutlined, UserOutlined, AppstoreOutlined,
  UsergroupDeleteOutlined, SmileOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../auth/perm'

// 收件箱(对齐 ByteTrack 三栏:分类视图 / 会话列表 / 聊天)。会话/消息后端开发中,先放结构与空态。
export default function Inbox() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [active, setActive] = useState('mine')

  // 分类按权限显示:我的/提及我的 人人可见;未分配/全部 需对应功能权限(菜单隔离)
  const categories = [
    { key: 'mine', label: t('inbox.mine'), icon: <UserOutlined />, visible: true },
    { key: 'mention', label: t('inbox.mention'), icon: <span style={{ fontWeight: 700 }}>@</span>, visible: true },
    { key: 'unassigned', label: t('inbox.unassigned'), icon: <UsergroupDeleteOutlined />, visible: hasFunction('inbox.viewUnassigned') },
    { key: 'all', label: t('inbox.all'), icon: <AppstoreOutlined />, visible: hasFunction('inbox.viewAll') },
  ].filter((c) => c.visible)

  const activeLabel = categories.find((c) => c.key === active)?.label ?? t('inbox.all')

  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', height: '100%' },
    col1: { width: 240, background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}`, display: 'flex', flexDirection: 'column' },
    col2: { width: 340, background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}`, display: 'flex', flexDirection: 'column' },
    col3: { flex: 1, background: token.colorBgLayout, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    colHeader: { height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${token.colorBorderSecondary}` },
    colTitle: { fontWeight: 700, fontSize: 17 },
    groupLabel: { padding: '14px 16px 6px', fontSize: 12, color: token.colorTextSecondary },
    catItem: { display: 'flex', alignItems: 'center', gap: 10, margin: '2px 8px', padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 15 },
    catActive: { background: token.colorPrimaryBg, color: token.colorPrimary },
    count: { marginLeft: 'auto', minWidth: 22, height: 20, padding: '0 6px', borderRadius: 6, background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    tabs: { display: 'flex', gap: 24, padding: '12px 16px 0' },
    tab: { paddingBottom: 10, cursor: 'pointer', color: token.colorTextSecondary },
    tabActive: { color: token.colorPrimary, borderBottom: `2px solid ${token.colorPrimary}`, fontWeight: 600 },
  }

  const renderCat = (c: { key: string; label: string; icon: ReactNode }) => {
    const on = c.key === active
    return (
      <div key={c.key} style={{ ...styles.catItem, ...(on ? styles.catActive : {}) }} onClick={() => setActive(c.key)}>
        <span style={{ width: 18, textAlign: 'center' }}>{c.icon}</span>
        <span>{c.label}</span>
        <span style={styles.count}>0</span>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      {/* 第一栏:分类视图 */}
      <div style={styles.col1}>
        <div style={styles.colHeader}>
          <span style={styles.colTitle}>{t('inbox.title')}</span>
          <SearchOutlined style={{ fontSize: 16, color: token.colorTextSecondary, cursor: 'pointer' }} />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={styles.groupLabel}>{t('inbox.categoryView')}</div>
          {categories.map(renderCat)}
          <div style={styles.groupLabel}>{t('inbox.normalView')}</div>
          <div style={styles.catItem}>
            <span style={{ width: 18, textAlign: 'center' }}><SmileOutlined /></span>
            <span>{t('inbox.finn')}</span>
            <span style={styles.count}>0</span>
          </div>
        </div>
      </div>

      {/* 第二栏:会话列表 */}
      <div style={styles.col2}>
        <div style={styles.colHeader}>
          <ControlOutlined style={{ fontSize: 16, color: token.colorTextSecondary }} />
          <span style={{ ...styles.colTitle, flex: 1, marginLeft: 10 }}>{activeLabel}</span>
        </div>
        <div style={styles.tabs}>
          <span style={{ ...styles.tab, ...styles.tabActive }}>{t('inbox.inProgress')} 0</span>
          <span style={styles.tab}>{t('inbox.closed')}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('inbox.noOngoing')} />
        </div>
      </div>

      {/* 第三栏:聊天(空态) */}
      <div style={styles.col3}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('inbox.notOpened')} />
      </div>
    </div>
  )
}
