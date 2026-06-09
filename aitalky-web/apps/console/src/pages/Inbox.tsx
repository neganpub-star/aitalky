import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import { Empty, Segmented, theme } from 'antd'
import {
  SearchOutlined, UserOutlined, AppstoreOutlined,
  UsergroupDeleteOutlined, SmileOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { hasFunction } from '../auth/perm'

// 收件箱(对齐 ByteTrack 三栏:分类视图 / 会话列表 / 聊天)。会话/消息后端开发中,先放结构与空态。
export default function Inbox() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [active, setActive] = useState('mine')
  const [collapsed, setCollapsed] = useState(false) // 收起第一栏(分类视图)

  // 分类按权限显示:我的/提及我的 人人可见;未分配/全部 需对应功能权限(菜单隔离)
  const categories = [
    { key: 'mine', label: t('inbox.mine'), icon: <UserOutlined />, visible: true },
    { key: 'mention', label: t('inbox.mention'), icon: <span style={{ fontWeight: 700 }}>@</span>, visible: true },
    { key: 'unassigned', label: t('inbox.unassigned'), icon: <UsergroupDeleteOutlined />, visible: hasFunction('inbox.viewUnassigned') },
    { key: 'all', label: t('inbox.all'), icon: <AppstoreOutlined />, visible: hasFunction('inbox.viewAll') },
  ].filter((c) => c.visible)

  const activeLabel = categories.find((c) => c.key === active)?.label ?? t('inbox.all')

  const styles: Record<string, CSSProperties> = {
    // 分区白底 + 清晰边框分隔;聊天区淡灰 —— 对齐 ByteTrack
    root: { display: 'flex', height: '100%' },
    // col1/col2 固定宽度(flexShrink:0),不随窗口/内容变化 —— 对齐 ByteTrack
    // 分类视图(col1)与聊天区(col3)同为浅灰;会话列表(col2)为白(放列表内容)
    col1: { width: 216, flexShrink: 0, background: token.colorBgLayout, borderRight: `1px solid ${token.colorSplit}`, display: 'flex', flexDirection: 'column' },
    col2: { width: 300, flexShrink: 0, background: token.colorBgContainer, borderRight: `1px solid ${token.colorSplit}`, display: 'flex', flexDirection: 'column' },
    col3: { flex: 1, minWidth: 0, background: token.colorBgLayout, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    colHeader: { height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${token.colorSplit}` },
    colTitle: { fontWeight: 700, fontSize: 17 },
    groupLabel: { padding: '16px 16px 6px', fontSize: 12, color: token.colorTextSecondary },
    catItem: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 8px', padding: '11px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 15 },
    catActive: { background: token.colorBgContainer, color: token.colorPrimary, boxShadow: token.boxShadowTertiary },
    count: { marginLeft: 'auto', minWidth: 22, height: 20, padding: '0 6px', borderRadius: 6, background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  }

  const renderCat = (c: { key: string; label: string; icon: ReactNode }) => {
    const on = c.key === active
    return (
      <div key={c.key} className="at-row" style={{ ...styles.catItem, ...(on ? styles.catActive : {}) }} onClick={() => setActive(c.key)}>
        <span style={{ width: 18, textAlign: 'center' }}>{c.icon}</span>
        <span>{c.label}</span>
        <span style={styles.count}>0</span>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      {/* 第一栏:分类视图(可由第二栏的筛选图标收起) */}
      {!collapsed && (
        <div style={styles.col1}>
          <div style={styles.colHeader}>
            <span style={styles.colTitle}>{t('inbox.title')}</span>
            <SearchOutlined style={{ fontSize: 16, color: token.colorTextSecondary, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={styles.groupLabel}>{t('inbox.categoryView')}</div>
            {categories.map(renderCat)}
            <div style={styles.groupLabel}>{t('inbox.normalView')}</div>
            <div className="at-row" style={styles.catItem}>
              <span style={{ width: 18, textAlign: 'center' }}><SmileOutlined /></span>
              <span>{t('inbox.finn')}</span>
              <span style={styles.count}>0</span>
            </div>
          </div>
        </div>
      )}

      {/* 第二栏:会话列表 */}
      <div style={styles.col2}>
        <div style={styles.colHeader}>
          {/* 横向调节(tune)图标:收起/展开第一栏,贴近 ByteTrack */}
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            style={{ color: token.colorTextSecondary, cursor: 'pointer' }}
            onClick={() => setCollapsed((c) => !c)}
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="9" cy="7" r="2.4" fill={token.colorBgContainer} />
            <circle cx="15" cy="12" r="2.4" fill={token.colorBgContainer} />
            <circle cx="10" cy="17" r="2.4" fill={token.colorBgContainer} />
          </svg>
          <span style={{ ...styles.colTitle, flex: 1, marginLeft: 10 }}>{activeLabel}</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <Segmented
            block
            options={[
              { label: `${t('inbox.inProgress')} 0`, value: 'open' },
              { label: t('inbox.closed'), value: 'closed' },
            ]}
            defaultValue="open"
          />
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
