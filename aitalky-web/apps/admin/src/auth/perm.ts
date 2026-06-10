import { useAdminStore } from '../store/useAdminStore'

/** 是否拥有某平台权限(UX 层显隐;真正校验在后端 @RequiresFunction) */
export function hasPerm(code: string): boolean {
  return useAdminStore.getState().permissions.includes(code)
}
