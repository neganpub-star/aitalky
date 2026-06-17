import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Avatar, Badge, Tooltip, Popover, Divider, Switch, Tag, theme } from 'antd'
import {
  InboxOutlined, SettingOutlined, PoweroffOutlined, GlobalOutlined, UserOutlined,
  PlusCircleOutlined, CheckOutlined, UsergroupAddOutlined, BulbOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { enterProject } from '../api/auth'
import { getCtx, logout, saveEnter } from '../auth/session'
import { canAccessSettings, hasFunction } from '../auth/perm'
import { roleLabel } from '../auth/roleLabel'
import { useAppStore } from '../store/useAppStore'
import { changeLang } from '../i18n'
import { wsClient } from '../ws/client'
import { getPendingInvites, getProfile, updateWorkStatus, type PendingInviteVO } from '../api/account'
import { fetchLanguages } from '../api/language'
import { getConversationCounts } from '../api/conversation'
import { setLanguageDict } from '../constants/languages'
import { setTitleUnread, playBeep } from '../notify'
import type { ProjectBrief } from '../types'

// 参照 aitalky:最左窄图标导航栏;左上角项目 LOGO 点击弹出「项目切换」;左下角主题切换 + 头像
export default function MainLayout() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const nav = useNavigate()
  const loc = useLocation()
  const ctx = getCtx()
  const projects: ProjectBrief[] = ctx.projects || []
  // 项目名/Logo 响应式订阅:基本信息保存后图标栏即时刷新(不再需要手动刷新页面)
  const projectName = useAppStore((s) => s.projectName)
  const projectLogo = useAppStore((s) => s.projectLogo)
  const themeMode = useAppStore((s) => s.themeMode)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const lang = useAppStore((s) => s.lang)
  const [workOnline, setWorkOnline] = useState(true) // 工作状态:进入时由 profile 回显,切换即落库
  const [pendingInvites, setPendingInvites] = useState<PendingInviteVO[]>([]) // 待加入邀请(切换项目下拉)
  const wsToken = useAppStore((s) => s.token)
  const nickname = useAppStore((s) => s.nickname)
  const avatar = useAppStore((s) => s.avatar)
  const setMember = useAppStore((s) => s.setMember)
  const unreadTotal = useAppStore((s) => s.unreadTotal)
  const setUnreadTotal = useAppStore((s) => s.setUnreadTotal)

  // 进入项目即建立 WS 长连接(项目级令牌带 memberId);退出/卸载时断开
  useEffect(() => {
    if (wsToken) {
      wsClient.connect(wsToken)
    }
    return () => wsClient.close()
  }, [wsToken])

  // 全局未读跟踪:无论当前在哪个页面,来消息都刷新未读计数(服务端权威),驱动
  // 收件箱图标红点 + 浏览器标题角标。原逻辑只在 Inbox 页,切到其他页 Inbox 卸载即失效,
  // 故提到常驻的布局层。收件箱页 Inbox 自己也会刷,两者取同一计数,结果一致。
  const countsTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const onInboxRef = useRef(false)
  onInboxRef.current = loc.pathname.startsWith('/inbox')
  useEffect(() => {
    const refresh = () => getConversationCounts().then((c) => setUnreadTotal(c.mineUnread)).catch(() => {})
    refresh() // 首次进入/刷新即拉一次,红点状态正确
    const off = wsClient.onMessage((msg) => {
      // 客户消息 / 「分配给我」系统消息 → 未读可能变化,刷新计数(300ms 合并突发)
      const relevant = msg.senderType === 'customer' || (msg.senderType === 'system' && msg.type === 'assign')
      if (!relevant) return
      clearTimeout(countsTimerRef.current)
      countsTimerRef.current = setTimeout(refresh, 300)
      // 不在收件箱页时全局兜底响铃(收件箱页由 Inbox 自行处理,避免重复响铃)
      if (msg.senderType === 'customer' && !onInboxRef.current) playBeep()
    })
    return () => { off(); clearTimeout(countsTimerRef.current) }
  }, [setUnreadTotal])

  // 拉取个人资料,供头像栏/菜单显示成员昵称与头像
  useEffect(() => {
    getProfile().then((p) => {
      setMember(p.nickname ?? undefined, p.avatar ?? undefined)
      setWorkOnline(p.workStatus !== 0) // 回显工作状态(默认在线)
    }).catch(() => {})
  }, [setMember])

  // 拉取当前账号的待加入邀请(切换项目下拉展示「待加入」)
  useEffect(() => {
    getPendingInvites().then(setPendingInvites).catch(() => {})
  }, [])

  // 切换工作状态:乐观更新 + 落库;失败回滚
  const changeWork = (on: boolean) => {
    setWorkOnline(on)
    updateWorkStatus(on ? 1 : 0).catch(() => setWorkOnline(!on))
  }

  // 拉取平台语种字典(候选语种全集),覆盖本地兜底种子;失败则继续用种子
  useEffect(() => {
    fetchLanguages().then(setLanguageDict).catch(() => {})
  }, [])

  // 浏览器标题未读数:有未读时标签页显示 "(N) 原标题"(对齐现网)
  useEffect(() => {
    setTitleUnread(unreadTotal)
  }, [unreadTotal])

  // 菜单按权限显示:设置仅对有相关功能权限的成员可见
  const navItems = [
    { key: '/inbox', icon: <InboxOutlined />, label: t('nav.inbox'), visible: true },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings'), visible: canAccessSettings() },
  ].filter((n) => n.visible)

  const onSwitch = async (p: ProjectBrief) => {
    if (p.id === ctx.projectId) return
    saveEnter(await enterProject(p.id), p.name, p.logo)
    location.reload()
  }

  const isDark = themeMode === 'dark'
  const styles: Record<string, CSSProperties> = {
    root: { display: 'flex', height: '100vh', overflow: 'hidden' },
    // 第1栏(图标栏):宽 44、淡蓝底(暗色用容器色)—— 对齐 aitalky
    rail: {
      width: 44, flexShrink: 0, background: isDark ? token.colorBgContainer : '#e9eef8',
      borderRight: `1px solid ${token.colorSplit}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, paddingBottom: 16,
    },
    brand: {
      width: 36, height: 36, borderRadius: 8, background: token.colorPrimary, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 20, cursor: 'pointer',
    },
    navGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
    navItem: {
      width: 40, height: 40, borderRadius: 8, color: token.colorTextSecondary, fontSize: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    },
    navItemActive: { background: isDark ? token.colorPrimaryBg : '#fff', color: token.colorPrimary, boxShadow: isDark ? 'none' : token.boxShadowTertiary },
    bottom: { marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 },
    content: { flex: 1, background: token.colorBgLayout, overflow: 'auto' },
    projItem: { display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' },
    userRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' },
  }

  const projectPanel = (
    <div style={{ width: 240 }}>
      <div style={{ padding: '4px 12px', fontWeight: 600 }}>{projectName}</div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ padding: '0 12px 4px', color: token.colorTextSecondary, fontSize: 12 }}>{t('nav.switchProject')}</div>
      <div style={{ maxHeight: 260, overflow: 'auto' }}>
        {projects.map((p) => (
          <div key={p.id} style={styles.projItem} onClick={() => onSwitch(p)}>
            <Avatar shape="square" size={24} src={p.logo || undefined} style={{ background: token.colorPrimary, fontSize: 12 }}>{p.name.charAt(0)}</Avatar>
            <span style={{ flex: 1, marginLeft: 8 }}>{p.name}</span>
            {p.id === ctx.projectId && <CheckOutlined style={{ color: token.colorPrimary }} />}
          </div>
        ))}
        {/* 待加入邀请:点击进入加入落地页(应用内,无需翻邮件) */}
        {pendingInvites.map((inv) => (
          <div key={inv.token} style={styles.projItem} onClick={() => nav(`/join?token=${inv.token}`)}>
            <Avatar shape="square" size={24} src={inv.projectLogo || undefined} style={{ background: token.colorTextQuaternary, fontSize: 12 }}>{(inv.projectName || '?').charAt(0)}</Avatar>
            <span style={{ flex: 1, marginLeft: 8, color: token.colorTextSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.projectName || '-'}</span>
            <Tag color="processing" style={{ marginRight: 0 }}>{t('nav.pendingInvite')}</Tag>
          </div>
        ))}
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={styles.projItem} onClick={() => nav('/projects/new')}>
        <PlusCircleOutlined style={{ color: token.colorPrimary }} />
        <span style={{ marginLeft: 8 }}>{t('nav.newProject')}</span>
      </div>
    </div>
  )

  // 头像弹出菜单(1:1 参照 aitalky):资料 + 工作状态 + 个人中心/邀请成员/切换语言/切换主题/退出 + 版本
  const displayName = nickname || (ctx.email || 'user').split('@')[0]
  const rowIcon = { fontSize: 17, color: token.colorTextSecondary }
  const userPanel = (
    <div style={{ width: 236, fontSize: 15 }}>
      {/* 头像 + 名字 + 角色 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 14px' }}>
        <div style={{ position: 'relative' }}>
          <Avatar size={46} src={avatar || undefined} style={{ background: token.colorPrimary, fontSize: 18 }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <span style={{
            position: 'absolute', right: 1, bottom: 1, width: 11, height: 11, borderRadius: '50%',
            background: workOnline ? '#52c41a' : '#bfbfbf', border: `2px solid ${token.colorBgElevated}`,
          }} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName}
          </div>
          {ctx.roleName && <Tag color="orange" style={{ marginTop: 4 }}>{roleLabel(ctx.roleName, t)}</Tag>}
        </div>
      </div>
      <Divider style={{ margin: 0 }} />

      {/* 工作状态 */}
      <div className="at-row" style={{ ...styles.userRow, justifyContent: 'space-between' }}>
        <span>{t('nav.workStatus')}</span>
        <Switch checked={workOnline} onChange={changeWork} />
      </div>
      <Divider style={{ margin: 0 }} />

      {/* 菜单项 */}
      <div className="at-row" style={styles.userRow} onClick={() => nav('/profile')}>
        <UserOutlined style={rowIcon} /><span>{t('nav.profile')}</span>
      </div>
      {hasFunction('member.manage') && (
        <div className="at-row" style={styles.userRow} onClick={() => nav('/settings/invites')}>
          <UsergroupAddOutlined style={rowIcon} /><span>{t('nav.invite')}</span>
        </div>
      )}
      <div className="at-row" style={styles.userRow} onClick={() => changeLang(lang === 'en_US' ? 'zh_CN' : 'en_US')}>
        <GlobalOutlined style={rowIcon} />
        <span style={{ flex: 1 }}>{t('nav.lang')}</span>
        <span style={{ color: token.colorTextSecondary }}>{lang === 'en_US' ? 'English' : '简体中文'}</span>
      </div>
      <div className="at-row" style={{ ...styles.userRow, justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BulbOutlined style={rowIcon} />{t('nav.theme')}
        </span>
        <Switch checked={themeMode === 'dark'} onChange={toggleTheme} checkedChildren="🌙" unCheckedChildren="☀" />
      </div>
      <div className="at-row" style={styles.userRow} onClick={() => { logout(); nav('/login') }}>
        <PoweroffOutlined style={rowIcon} /><span>{t('common.logout')}</span>
      </div>
      <Divider style={{ margin: 0 }} />
      <div style={{ padding: '10px 16px', fontSize: 13, color: token.colorTextSecondary }}>
        {t('common.version')}: v1.0.0
      </div>
    </div>
  )

  return (
    <div style={styles.root}>
      <div style={styles.rail}>
        <Popover content={projectPanel} trigger="click" placement="rightTop" arrow={false}>
          <div style={styles.brand} title={projectName}>
            {projectLogo
              ? <img src={projectLogo} alt="" style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
              : (projectName || 'AT').charAt(0).toUpperCase()}
          </div>
        </Popover>

        <div style={styles.navGroup}>
          {navItems.map((n) => (
            <Tooltip key={n.key} title={n.label} placement="right">
              <div
                style={{ ...styles.navItem, ...(loc.pathname.startsWith(n.key) ? styles.navItemActive : {}) }}
                onClick={() => nav(n.key)}
              >
                {/* 收件箱:有未读时图标右上角红点(对齐现网,进入对应会话才清) */}
                {n.key === '/inbox' && unreadTotal > 0 ? <Badge dot offset={[2, 0]}>{n.icon}</Badge> : n.icon}
              </div>
            </Tooltip>
          ))}
        </div>

        <div style={styles.bottom}>
          <Popover
            content={userPanel}
            trigger="click"
            placement="rightBottom"
            arrow={false}
            align={{ offset: [14, 0] }}
            styles={{ body: { padding: 0 } }}
          >
            <Avatar src={avatar || undefined} style={{ background: token.colorPrimary, cursor: 'pointer' }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          </Popover>
        </div>
      </div>

      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}
