import client from './client'

// 会话分配配置(对应后端 AssignConfigVO)。assignMode:0手动 1轮流 2负载;maxConcurrent:0=不限
// autoCloseIdleMinutes:会话保持期(分钟),0=不自动结束(保持期开关关)
export interface AssignConfig {
  assignMode: number
  maxConcurrent: number
  autoCloseIdleMinutes: number
}

/** 取分配配置 */
export function getAssignConfig() {
  return client.get<unknown, AssignConfig>('/assign/config')
}

/** 更新分配规则与最大会话数 */
export function updateAssignConfig(assignMode: number, maxConcurrent: number) {
  return client.put<unknown, void>('/assign/config', { assignMode, maxConcurrent })
}

/** 更新会话保持期(分钟):minutes<=0=关闭自动结束。独立接口,不影响分配规则 */
export function updateAssignRetention(minutes: number) {
  return client.put<unknown, void>('/assign/retention', { minutes })
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

// ============ 专属分配模式(P2) ============

// 专属策略(对应后端 AsnGroupVO)。groupKey=接入 URL 的 groupId;memberIds=参与队友
export interface AssignGroup {
  id: string
  name: string
  groupKey: string
  remark: string
  memberIds: string[]
}

export interface AssignGroupReq {
  name: string
  remark: string
  memberIds: string[]
}

/** 专属策略列表 */
export function listAssignGroups() {
  return client.get<unknown, AssignGroup[]>('/assign/groups')
}

/** 新增专属策略(返回含 id/groupKey) */
export function createAssignGroup(req: AssignGroupReq) {
  return client.post<unknown, AssignGroup>('/assign/groups', req)
}

/** 编辑专属策略(名称/备注/队友全量覆盖) */
export function updateAssignGroup(groupId: string, req: AssignGroupReq) {
  return client.put<unknown, void>(`/assign/groups/${groupId}`, req)
}

/** 删除专属策略 */
export function deleteAssignGroup(groupId: string) {
  return client.delete<unknown, void>(`/assign/groups/${groupId}`)
}
