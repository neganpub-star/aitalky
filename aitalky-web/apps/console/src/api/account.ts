import client from './client'
import { encryptPassword } from './crypto'

// 个人中心资料(对应后端 ProfileVO)
export interface ProfileVO {
  email: string | null
  username: string | null
  inviteCode: string | null
  projectId: string
  projectName: string | null
  owner: boolean
  memberId: string
  nickname: string | null
  avatar: string | null
  roleName: string | null
  language: string | null
  soundEnabled: number | null
  pushEnabled: number | null
  workStatus: number | null // 工作状态 1在线 0离开
}

// 系统推送设置(对应后端 PushSettingsVO);1=开 0=关
export interface PushSettingsVO {
  assignedApp: number
  assignedWeb: number
  unassignedApp: number
  unassignedWeb: number
  mentionApp: number
  mentionWeb: number
  newCustomerApp: number
  newCustomerWeb: number
}

/** 个人资料(账户 + 当前项目成员信息) */
export function getProfile() {
  return client.get<unknown, ProfileVO>('/account/profile')
}

/** 改自己昵称 */
export function updateMyNickname(nickname: string) {
  return client.put<unknown, void>('/account/nickname', { nickname })
}

/** 改自己头像 */
export function updateMyAvatar(avatar: string) {
  return client.put<unknown, void>('/account/avatar', { avatar })
}

/** 更新偏好(语言/声音/推送);传 null 的字段不改 */
export function updatePreferences(p: { language?: string; soundEnabled?: number; pushEnabled?: number }) {
  return client.put<unknown, void>('/account/preferences', p)
}

/** 设置工作状态(1在线 0离开);影响自动分配与客户端坐席在线展示 */
export function updateWorkStatus(workStatus: number) {
  return client.put<unknown, void>('/account/work-status', { workStatus })
}

// 当前账号的待加入邀请(对应后端 PendingInviteVO)
export interface PendingInviteVO {
  token: string
  projectId: string
  projectName: string | null
  projectLogo: string | null
  roleName: string | null
  inviterName: string | null
}

/** 当前账号的「待加入」邀请(切换项目下拉用) */
export function getPendingInvites() {
  return client.get<unknown, PendingInviteVO[]>('/account/pending-invites')
}

/** 改用户名(账号显示名) */
export function updateMyUsername(username: string) {
  return client.put<unknown, void>('/account/username', { username })
}

/** 更改邮箱(新邮箱 + 发往新邮箱的验证码) */
export function changeMyEmail(email: string, code: string) {
  return client.put<unknown, void>('/account/email', { email, code })
}

/** 更改密码(旧密码 + 新密码,前端 RSA 加密后再传) */
export async function changeMyPassword(oldPassword: string, newPassword: string) {
  const [oldEnc, newEnc] = await Promise.all([encryptPassword(oldPassword), encryptPassword(newPassword)])
  return client.put<unknown, void>('/account/password', { oldPassword: oldEnc, newPassword: newEnc })
}

/** 重置密码(验证码 + 新密码,新密码 RSA 加密后再传) */
export async function resetMyPassword(code: string, newPassword: string) {
  const newEnc = await encryptPassword(newPassword)
  return client.put<unknown, void>('/account/password/reset', { code, newPassword: newEnc })
}

/** 系统推送设置 */
export function getPushSettings() {
  return client.get<unknown, PushSettingsVO>('/account/push')
}

/** 更新系统推送设置 */
export function updatePushSettings(s: PushSettingsVO) {
  return client.put<unknown, void>('/account/push', s)
}

/** 退出当前项目(负责人不可退) */
export function leaveProject() {
  return client.post<unknown, void>('/account/leave-project')
}
