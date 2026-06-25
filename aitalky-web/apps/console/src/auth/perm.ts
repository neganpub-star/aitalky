import { getCtx } from './session'

// 前端权限判断:基于进入项目时拿到的 functions(项目级 token 内,whoami 也返回)
// 注意:这只是 UX 层隐藏;真正的安全校验在后端(@RequiresFunction + 多租户 + 会话可见性)

export function myFunctions(): string[] {
  return getCtx().functions || []
}

/** 是否拥有某功能权限 */
export function hasFunction(code: string): boolean {
  return myFunctions().includes(code)
}

/** 是否拥有任意一个功能权限 */
export function hasAnyFunction(...codes: string[]): boolean {
  const fns = myFunctions()
  return codes.some((c) => fns.includes(c))
}

/** 设置区相关功能(任一即可看到「设置」入口);含 *.view 只读 token,普通成员凭查看权也能进设置(可见不可改) */
export const SETTINGS_FUNCTIONS = [
  'messenger.setting', 'assign.setting', 'group.manage', 'quickreply.manage',
  'blacklist.manage', 'member.manage', 'role.manage', 'project.setting', 'billing.manage',
  'messenger.view', 'assign.view', 'blacklist.view', 'quickreply.view',
  'project.view', 'member.view', 'role.view', 'billing.view',
]

export function canAccessSettings(): boolean {
  return hasAnyFunction(...SETTINGS_FUNCTIONS)
}

/** 知识库(wiki)相关功能(任一即可看到「知识库」入口);对齐 PermissionCatalog 的 wiki.app.* / wiki.article.* */
export const WIKI_FUNCTIONS = [
  'wiki.app.create', 'wiki.app.site', 'wiki.app.style', 'wiki.app.content', 'wiki.app.delete',
  'wiki.article.create', 'wiki.article.edit', 'wiki.article.publish', 'wiki.article.delete', 'wiki.article.setting',
]

export function canAccessWiki(): boolean {
  return hasAnyFunction(...WIKI_FUNCTIONS)
}
