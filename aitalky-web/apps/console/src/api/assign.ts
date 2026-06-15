import client from './client'

// 会话分配配置(对应后端 AssignConfigVO)。assignMode:0手动 1轮流 2负载;maxConcurrent:0=不限
export interface AssignConfig {
  assignMode: number
  maxConcurrent: number
}

/** 取分配配置 */
export function getAssignConfig() {
  return client.get<unknown, AssignConfig>('/assign/config')
}

/** 更新分配规则与最大会话数 */
export function updateAssignConfig(assignMode: number, maxConcurrent: number) {
  return client.put<unknown, void>('/assign/config', { assignMode, maxConcurrent })
}

/** 参与队友成员ID列表(前端用成员表映射昵称/头像/角色) */
export function getAssignMemberIds() {
  return client.get<unknown, string[]>('/assign/members')
}

/** 添加参与队友(实时保存) */
export function addAssignMember(memberId: string) {
  return client.post<unknown, void>('/assign/members', { memberId })
}

/** 移除参与队友(实时保存) */
export function removeAssignMember(memberId: string) {
  return client.delete<unknown, void>(`/assign/members/${memberId}`)
}
