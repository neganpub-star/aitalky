import type { TFunction } from 'i18next'

// 系统自带角色名 → i18n key(库里固定存中文规范名);自定义角色原样返回。
const SYS_ROLE_KEY: Record<string, string> = {
  负责人: 'role.sysOwner',
  管理员: 'role.sysAdmin',
  普通成员: 'role.sysMember',
}

/** 角色名展示:系统自带角色按当前语言显示,自定义角色原样;空返回 '-' */
export function roleLabel(name: string | null | undefined, t: TFunction): string {
  if (!name) return '-'
  const key = SYS_ROLE_KEY[name]
  return key ? t(key) : name
}
