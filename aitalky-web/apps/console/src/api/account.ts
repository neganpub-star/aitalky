import client from './client'

// 个人中心资料(对应后端 ProfileVO)
export interface ProfileVO {
  email: string | null
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

/** 退出当前项目(负责人不可退) */
export function leaveProject() {
  return client.post<unknown, void>('/account/leave-project')
}
