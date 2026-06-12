import client from './client'
import { encryptPassword } from './crypto'
import type { ProjectDetailVO } from '../types'

/** 当前项目基本信息 */
export function getCurrentProject() {
  return client.get<unknown, ProjectDetailVO>('/projects/current')
}

/** 更新基本信息(改名/换 Logo;仅负责人) */
export function updateProject(name: string, logo: string | null) {
  return client.put<unknown, void>('/projects/current', { name, logo })
}

/** 负责人转让(密码 RSA 加密;仅负责人) */
export async function transferOwner(newOwnerMemberId: string, projectName: string, password: string, code: string) {
  const enc = await encryptPassword(password)
  return client.post<unknown, void>('/projects/current/transfer', { newOwnerMemberId, projectName, password: enc, code })
}

/** 注销项目(密码 RSA 加密;仅负责人) */
export async function deactivateProject(projectName: string, password: string, code: string) {
  const enc = await encryptPassword(password)
  return client.post<unknown, void>('/projects/current/deactivate', { projectName, password: enc, code })
}
