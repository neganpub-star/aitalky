import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  Avatar, Button, Input, InputNumber, Modal, Radio, Select, Switch, Table, Tag, message, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ReadOutlined, GlobalOutlined, TeamOutlined, CustomerServiceOutlined, ClockCircleOutlined,
  RightOutlined, DownOutlined, LikeFilled, RetweetOutlined, DashboardOutlined,
  InfoCircleFilled, PlusOutlined, LinkOutlined, CodeOutlined, CopyOutlined, ExportOutlined, CloseCircleFilled,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { getMessengerConfig } from '../../api/messengerConfig'
import type { MemberVO } from '../../types'
import AddTeammateModal from './AddTeammateModal'

type AssignRule = 'manual' | 'round' | 'load'
interface Strategy { id: string; name: string; mark: string; teammates: MemberVO[]; remark: string }

// 会话设置(对齐 ByteTrack live-现网截图 img_10~img_17):手风琴 5 块
// 纯前端 UI;保存暂未接后端(TODO:后端阶段补会话分配/域名/队友/专属策略/保持期接口)
export default function ConversationSettings() {
  const { t } = useTranslation()
  const projectId = useAppStore((s) => s.projectId)
  const projects = useAppStore((s) => s.projects)
  const appId = projects.find((p) => p.id === projectId)?.appId || 'U8PZhhCG'
  const { token } = theme.useToken()

  const [openKey, setOpenKey] = useState<string | null>('basic')
  const [host, setHost] = useState('https://msg.example.top')

  // 基本设置
  const [rule, setRule] = useState<AssignRule>('load')
  const [limitMode, setLimitMode] = useState<'unlimited' | 'limited'>('unlimited')
  const [limitNum, setLimitNum] = useState(10)
  // 域名自定义
  const [protocol, setProtocol] = useState('https://')
  const [domain, setDomain] = useState('')
  // 普通分配模式
  const [normalTeammates, setNormalTeammates] = useState<MemberVO[]>([])
  const [accessTab, setAccessTab] = useState<'url' | 'plugin'>('url')
  const [normalModal, setNormalModal] = useState(false)
  // 专属分配模式
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [strategyModal, setStrategyModal] = useState(false)
  const [strategyName, setStrategyName] = useState('')
  const [strategyRemark, setStrategyRemark] = useState('')
  const [strategyTeammates, setStrategyTeammates] = useState<MemberVO[]>([])
  const [strategyTeamModal, setStrategyTeamModal] = useState(false)
  // 保持期
  const [keepEnabled, setKeepEnabled] = useState(true)
  const [keepMinutes, setKeepMinutes] = useState(60)

  useEffect(() => {
    getMessengerConfig().then((c) => { if (c.customDomain) setHost(c.customDomain) }).catch(() => undefined)
  }, [])

  const normalUrl = `${host}?appId=${appId}`
  const copy = (text: string) => { navigator.clipboard?.writeText(text); message.success(t('common.confirm')) }
  const todoSave = () => message.success(t('mse.saved')) // TODO 接后端

  const styles: Record<string, CSSProperties> = {
    h1: { fontWeight: 700, fontSize: 20, marginBottom: 20 },
    cardHead: { display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', cursor: 'pointer' },
    cardTitle: { fontWeight: 600, fontSize: 15, color: token.colorText },
    cardDesc: { fontSize: 12, color: token.colorTextTertiary, marginTop: 3 },
    cardBody: { padding: '4px 20px 22px 64px' },
    sectionLabel: { fontWeight: 600, fontSize: 14, margin: '18px 0 12px' },
    actions: { marginTop: 20, display: 'flex', gap: 10 },
  }

  const Card = ({ k, icon, title, desc, body }: {
    k: string; icon: ReactNode; title: string; desc: string; body: ReactNode
  }) => {
    const open = openKey === k
    return (
      <div style={{ background: token.colorBgContainer, borderRadius: 10, marginBottom: 16, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div style={styles.cardHead} onClick={() => setOpenKey(open ? null : k)}>
          <span style={{ fontSize: 22, color: token.colorText }}>{icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.cardTitle}>{title}</div>
            <div style={styles.cardDesc}>{desc}</div>
          </div>
          {open ? <DownOutlined style={{ color: token.colorTextTertiary }} /> : <RightOutlined style={{ color: token.colorTextQuaternary }} />}
        </div>
        {open && <div style={styles.cardBody}>{body}</div>}
      </div>
    )
  }

  // 分配规则单卡
  const ruleCard = (key: AssignRule, icon: ReactNode, color: string, title: string, desc: string) => {
    const active = rule === key
    return (
      <div onClick={() => setRule(key)} style={{
        flex: 1, padding: '20px 18px', borderRadius: 12, cursor: 'pointer',
        border: `1.5px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`, background: active ? token.colorPrimaryBg : token.colorBgContainer,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>{icon}</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 16 }}>{title}</div>
        <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 6 }}>{desc}</div>
      </div>
    )
  }

  // 队友标签(普通分配模式底部展示)
  const teammateChip = (m: MemberVO, onRemove: () => void) => (
    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: token.colorFillTertiary, borderRadius: 8, padding: '7px 12px' }}>
      <Avatar size={22} src={m.avatar || undefined}>{m.nickname.charAt(0)}</Avatar>
      <span style={{ fontSize: 13 }}>{m.nickname}</span>
      <Tag color={m.roleName.includes('管理') ? 'orange' : m.roleName.includes('负责') ? 'red' : 'default'} style={{ marginRight: 0, fontSize: 11 }}>{m.roleName}</Tag>
      <CloseCircleFilled onClick={onRemove} style={{ color: token.colorTextQuaternary, cursor: 'pointer', fontSize: 14 }} />
    </div>
  )

  const accessTabCard = (key: 'url' | 'plugin', icon: ReactNode, label: string) => {
    const active = accessTab === key
    return (
      <div onClick={() => setAccessTab(key)} style={{
        flex: 1, padding: '22px 0', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
        border: `1.5px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`, background: active ? token.colorPrimaryBg : token.colorBgContainer, color: active ? token.colorPrimary : token.colorTextSecondary,
      }}>
        <div style={{ fontSize: 22 }}>{icon}</div>
        <div style={{ fontSize: 14, marginTop: 8 }}>{label}</div>
      </div>
    )
  }

  // 专属分配表格列
  const copyCell = (text: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 200 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      <CopyOutlined onClick={() => copy(text)} style={{ color: '#1677ff', cursor: 'pointer', flexShrink: 0 }} />
    </span>
  )
  const columns: ColumnsType<Strategy> = [
    { title: t('conv.colName'), dataIndex: 'name', width: 130 },
    { title: t('conv.colMark'), dataIndex: 'mark', render: (v) => copyCell(v), width: 160 },
    { title: t('conv.colMembers'), render: (_, r) => r.teammates.length ? <a>{t('conv.viewAll')}</a> : <span style={{ color: '#cf1322', fontSize: 12 }}>{t('conv.needTeammate')}</span>, width: 150 },
    { title: t('conv.colRemark'), dataIndex: 'remark', render: (v) => v || '--', width: 80 },
    { title: t('conv.colUrl'), render: (_, r) => copyCell(`${host}?groupId=${r.mark}`), width: 200 },
    { title: t('conv.colPlugin'), render: () => <a>{t('conv.viewCode')}</a>, width: 100 },
    {
      title: t('conv.colAction'), fixed: 'right', width: 180,
      render: (_, r) => (
        <span style={{ display: 'flex', gap: 12 }}>
          <a onClick={() => setStrategyTeamModal(true)}>{t('conv.manageTeammate')}</a>
          <a>{t('conv.editStrategy')}</a>
          <a style={{ color: '#cf1322' }} onClick={() => setStrategies((s) => s.filter((x) => x.id !== r.id))}>{t('conv.delStrategy')}</a>
        </span>
      ),
    },
  ]

  const saveBtns = (extra?: boolean) => (
    <div style={styles.actions}>
      {extra && <Button onClick={() => setOpenKey(null)}>{t('common.cancel')}</Button>}
      <Button type="primary" onClick={todoSave}>{t('common.save')}</Button>
    </div>
  )

  return (
    <div style={{ maxWidth: 1180 }}>
      <div style={styles.h1}>{t('conv.title')}</div>

      {/* 基本设置 */}
      <Card k="basic" icon={<ReadOutlined />} title={t('conv.basicTitle')} desc={t('conv.basicDesc')} body={
        <>
          <div style={styles.sectionLabel}>{t('conv.ruleTitle')}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            {ruleCard('manual', <LikeFilled />, '#52c41a', t('conv.ruleManual'), t('conv.ruleManualDesc'))}
            {ruleCard('round', <RetweetOutlined />, '#1677ff', t('conv.ruleRound'), t('conv.ruleRoundDesc'))}
            {ruleCard('load', <DashboardOutlined />, '#7265e6', t('conv.ruleLoad'), t('conv.ruleLoadDesc'))}
          </div>

          <div style={styles.sectionLabel}>{t('conv.limitTitle')}</div>
          <div style={{ background: token.colorWarningBg, border: `1px solid ${token.colorWarningBorder}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: token.colorTextSecondary, display: 'flex', gap: 8 }}>
            <InfoCircleFilled style={{ color: '#faad14', marginTop: 3, flexShrink: 0 }} />
            <span>{t('conv.limitBanner')}</span>
          </div>
          <div style={{ fontSize: 13, margin: '18px 0 12px', color: token.colorTextSecondary }}>{t('conv.limitLabel')}</div>
          <Radio.Group value={limitMode} onChange={(e) => setLimitMode(e.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Radio value="unlimited">{t('conv.limitUnlimited')}</Radio>
            <Radio value="limited">{t('conv.limitLimited')}</Radio>
          </Radio.Group>
          {limitMode === 'limited' && (
            <InputNumber min={1} max={9999} value={limitNum} onChange={(v) => setLimitNum(v || 1)} style={{ marginTop: 12, width: 160 }} />
          )}
          {saveBtns()}
        </>
      } />

      {/* 域名自定义 */}
      <Card k="domain" icon={<GlobalOutlined />} title={t('conv.domainTitle')} desc={t('conv.domainDesc')} body={
        <>
          <div style={{ display: 'flex', marginTop: 14, maxWidth: 640 }}>
            <Select value={protocol} onChange={setProtocol} style={{ width: 100 }}
              options={[{ value: 'https://', label: 'https://' }, { value: 'http://', label: 'http://' }]} />
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={t('conv.domainPh')} style={{ flex: 1, marginLeft: -1 }} />
          </div>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, lineHeight: 2, marginTop: 14 }}>
            <div>{t('conv.domainTip1Pre')}<a>{t('conv.domainTip1Link')}</a>{t('conv.domainTip1Suf')}</div>
            <div>{t('conv.domainTip2')}</div>
            <div>{t('conv.domainTip3')}</div>
          </div>
          <a style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}><ExportOutlined />{t('conv.domainMore')}</a>
          {saveBtns(true)}
        </>
      } />

      {/* 普通分配模式 */}
      <Card k="normal" icon={<TeamOutlined />} title={t('conv.normalTitle')} desc={t('conv.normalDesc')} body={
        <>
          <Button style={{ marginTop: 14 }} icon={<PlusOutlined />} onClick={() => setNormalModal(true)}>{t('conv.addTeammate')}</Button>
          {normalTeammates.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, background: token.colorFillTertiary, borderRadius: 8, padding: 14, marginTop: 14 }}>
              {normalTeammates.map((m) => teammateChip(m, () => setNormalTeammates((s) => s.filter((x) => x.id !== m.id))))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 20, marginTop: 20, maxWidth: 640 }}>
            {accessTabCard('url', <LinkOutlined />, t('conv.accessUrl'))}
            {accessTabCard('plugin', <CodeOutlined />, t('conv.accessPlugin'))}
          </div>
          {accessTab === 'url' ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, margin: '20px 0 10px' }}>{t('conv.accessUrl')}</div>
              <div style={{ background: token.colorFillTertiary, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: token.colorTextSecondary }}>{normalUrl}</div>
              <Button type="primary" style={{ marginTop: 16 }} onClick={() => copy(normalUrl)}>{t('conv.copyLink')}</Button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: token.colorTextTertiary, margin: '20px 0 10px' }}>{t('conv.pluginCodeTip')}</div>
              <pre style={{ background: '#0b1f33', color: '#7ee787', borderRadius: 8, padding: 16, fontSize: 12, overflowX: 'auto' }}>
{`<script src="${host}/bytetrack.js"></script>
<script>new bytetrack({ appId: "${appId}" })</script>`}
              </pre>
            </>
          )}
        </>
      } />

      {/* 专属分配模式 */}
      <Card k="exclusive" icon={<CustomerServiceOutlined />} title={t('conv.exclusiveTitle')} desc={t('conv.exclusiveDesc')} body={
        <>
          <Button style={{ marginTop: 14, marginBottom: 16 }} icon={<PlusOutlined />} onClick={() => { setStrategyName(''); setStrategyRemark(''); setStrategyTeammates([]); setStrategyModal(true) }}>{t('conv.exclusiveAdd')}</Button>
          <Table<Strategy> rowKey="id" size="small" columns={columns} dataSource={strategies}
            scroll={{ x: 1000 }} pagination={{ pageSize: 10, size: 'small' }} />
        </>
      } />

      {/* 保持期设置 */}
      <Card k="keep" icon={<ClockCircleOutlined />} title={t('conv.keepTitle')} desc={t('conv.keepDesc')} body={
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t('conv.keepSwitch')}</span>
            <Switch checked={keepEnabled} onChange={setKeepEnabled} />
          </div>
          {keepEnabled && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 10px' }}>{t('conv.keepTime')}</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <Select value={keepMinutes} onChange={setKeepMinutes} style={{ width: 180 }}
                  options={[10, 30, 60, 120, 180, 360, 720, 1440].map((v) => ({ value: v, label: String(v) }))} />
                <span style={{ fontSize: 14 }}>{t('conv.minute')}</span>
              </span>
            </>
          )}
          {saveBtns(true)}
        </>
      } />

      {/* 普通分配 - 添加队友 */}
      <AddTeammateModal open={normalModal} initial={normalTeammates}
        onCancel={() => setNormalModal(false)}
        onOk={(ms) => { setNormalTeammates(ms); setNormalModal(false) }} />

      {/* 专属分配 - 添加队友(新增策略弹窗内 / 队友管理) */}
      <AddTeammateModal open={strategyTeamModal} initial={strategyTeammates}
        onCancel={() => setStrategyTeamModal(false)}
        onOk={(ms) => { setStrategyTeammates(ms); setStrategyTeamModal(false) }} />

      {/* 新增专属分配 */}
      <Modal open={strategyModal} title={t('conv.exclusiveAdd')} okText={t('common.save')} cancelText={t('common.cancel')}
        onCancel={() => setStrategyModal(false)}
        onOk={() => {
          if (!strategyName.trim()) { message.warning(t('conv.strategyName')); return }
          setStrategies((s) => [...s, { id: `tmp-${s.length + 1}`, name: strategyName.trim(), mark: Math.random().toString(36).slice(2, 10), teammates: strategyTeammates, remark: strategyRemark.trim() }])
          setStrategyModal(false)
        }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}><span style={{ color: '#cf1322' }}>* </span>{t('conv.strategyName')}</div>
          <Input value={strategyName} onChange={(e) => setStrategyName(e.target.value)} maxLength={50} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}><span style={{ color: '#cf1322' }}>* </span>{t('conv.joinTeammate')}</div>
          <Button icon={<PlusOutlined />} onClick={() => setStrategyTeamModal(true)}>{t('conv.addTeammate')}</Button>
          {strategyTeammates.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {strategyTeammates.map((m) => teammateChip(m, () => setStrategyTeammates((s) => s.filter((x) => x.id !== m.id))))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>{t('conv.remark')}</div>
          <Input.TextArea rows={3} value={strategyRemark} onChange={(e) => setStrategyRemark(e.target.value)} placeholder={t('conv.remarkPh')} />
        </div>
      </Modal>
    </div>
  )
}
