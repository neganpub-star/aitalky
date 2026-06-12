import client from './client'
import type { PermModule, PermissionView, RoleVO } from '../types'

// 角色管理:列表 + 权限目录 + 自定义角色 CRUD(对应后端 /api/roles)
export function listRoles() {
  return client.get<unknown, RoleVO[]>('/roles')
}

/** 权限目录(模块/页面/功能,渲染权限树用) */
export function roleCatalog() {
  return client.get<unknown, PermModule[]>('/roles/catalog')
}

/** 某角色已勾选权限 */
export function rolePermissions(id: string) {
  return client.get<unknown, PermissionView>(`/roles/${id}/permissions`)
}

/** 新建自定义角色 */
export function createRole(name: string) {
  return client.post<unknown, RoleVO>('/roles', { name })
}

/** 重命名自定义角色 */
export function renameRole(id: string, name: string) {
  return client.put<unknown, void>(`/roles/${id}/name`, { name })
}

/** 保存角色权限 */
export function updateRolePermissions(id: string, pages: string[], functions: string[]) {
  return client.put<unknown, void>(`/roles/${id}/permissions`, { pages, functions })
}

/** 删除自定义角色 */
export function deleteRole(id: string) {
  return client.delete<unknown, void>(`/roles/${id}`)
}
