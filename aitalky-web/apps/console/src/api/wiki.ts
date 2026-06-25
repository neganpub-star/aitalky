import client from './client'

// wiki 站点(应用)列表行(对应后端 WikiSiteVO)
export interface WikiSiteVO {
  id: string
  icon: string | null
  name: string | null
  description: string | null
  defaultLang: string
  multiLang: number
  subdomain: string | null
  enabled: number // 0已禁用 1已开启
  isDefault: number // 1默认应用(不可删)
}

// 站点详情(编辑页;对应后端 WikiSiteDetailVO)
export interface WikiSiteI18n {
  lang: string
  appName: string | null
  title: string | null
  description: string | null
}
export interface WikiSiteDetailVO {
  id: string
  icon: string | null
  logo: string | null
  brandShort: string | null
  defaultLang: string
  multiLang: number
  themeColor: string | null
  layout: number // 1列表 2双栏
  subdomain: string | null
  customDomain: string | null
  favicon: string | null
  enabled: number
  isDefault: number
  i18ns: WikiSiteI18n[]
}

export function listSites() {
  return client.get<unknown, WikiSiteVO[]>('/wiki/sites')
}
export function getSite(id: string) {
  return client.get<unknown, WikiSiteDetailVO>(`/wiki/sites/${id}`)
}
export function checkSubdomain(subdomain: string, excludeSiteId?: string) {
  return client.get<unknown, boolean>('/wiki/sites/subdomain-available', { params: { subdomain, excludeSiteId } })
}
export function createSite(p: { icon?: string | null; defaultLang: string; appName: string; subdomain?: string | null }) {
  return client.post<unknown, string>('/wiki/sites', p)
}
export function saveSiteConfig(id: string, p: {
  enabled?: number; icon?: string | null; defaultLang?: string; multiLang?: number
  subdomain?: string | null; customDomain?: string | null; favicon?: string | null
}) {
  return client.put<unknown, void>(`/wiki/sites/${id}/config`, p)
}
export function saveSiteStyle(id: string, p: {
  lang: string; logo?: string | null; brandShort?: string | null; appName?: string | null
  title?: string | null; description?: string | null; themeColor?: string | null; layout?: number
}) {
  return client.put<unknown, void>(`/wiki/sites/${id}/style`, p)
}
export function toggleSiteEnabled(id: string, enabled: number) {
  return client.put<unknown, void>(`/wiki/sites/${id}/enabled`, { enabled })
}
export function deleteSite(id: string) {
  return client.delete<unknown, void>(`/wiki/sites/${id}`)
}

// ============ 文章 ============
export interface WikiArticleRowVO {
  id: string
  title: string | null
  status: number // 1未发布 2已发布 3有变更
  langCount: number
  isRecommend: number
  editorId: string | null
  editorName: string | null
  editorAvatar: string | null
  updateTime: string | null
  shareCode: string | null
}
export interface WikiArticleI18nVO {
  lang: string
  title: string | null
  summary: string | null
  content: string | null
  pubTitle: string | null
  pubSummary: string | null
  pubContent: string | null
  published: number
}
export interface WikiArticleDetailVO {
  id: string
  status: number
  isRecommend: number
  shareCode: string | null
  editorId: string | null
  editorName: string | null
  editorAvatar: string | null
  updateTime: string | null
  i18ns: WikiArticleI18nVO[]
}
export interface WikiArticleHistoryVO {
  id: string
  action: number // 1创建 2编辑 3发布 4取消发布
  operatorId: string | null
  operatorName: string | null
  operatorAvatar: string | null
  createTime: string | null
}

export function listArticles(p?: { status?: number; lang?: string }) {
  return client.get<unknown, WikiArticleRowVO[]>('/wiki/articles', { params: p })
}
export function createArticle() {
  return client.post<unknown, string>('/wiki/articles')
}
export function getArticle(id: string) {
  return client.get<unknown, WikiArticleDetailVO>(`/wiki/articles/${id}`)
}
export function saveArticleDraft(id: string, p: { lang: string; title?: string | null; summary?: string | null; content?: string | null }) {
  return client.put<unknown, void>(`/wiki/articles/${id}/draft`, p)
}
export function publishArticle(id: string) {
  return client.put<unknown, void>(`/wiki/articles/${id}/publish`)
}
export function unpublishArticle(id: string) {
  return client.put<unknown, void>(`/wiki/articles/${id}/unpublish`)
}
export function recommendArticle(id: string, recommend: number) {
  return client.put<unknown, void>(`/wiki/articles/${id}/recommend`, { recommend })
}
export function articleHistory(id: string) {
  return client.get<unknown, WikiArticleHistoryVO[]>(`/wiki/articles/${id}/history`)
}
export function articleHistorySnapshot(historyId: string) {
  return client.get<unknown, string>(`/wiki/articles/history/${historyId}/snapshot`)
}
export function deleteArticle(id: string) {
  return client.delete<unknown, void>(`/wiki/articles/${id}`)
}

// ============ 内容配置(类别/分组/关联) ============
export interface WikiI18nText { lang: string; name?: string | null; description?: string | null }
export interface CategoryVO {
  id: string
  icon: string | null
  name: string | null
  description: string | null
  sort: number
  articleCount: number
  i18ns: WikiI18nText[]
}
export interface LinkedArticle { linkId: string; articleId: string; title: string | null; status: number | null; sort: number }
export interface CategoryGroup { id: string; name: string | null; sort: number; articles: LinkedArticle[] }
export interface CategoryDetailVO {
  id: string
  icon: string | null
  name: string | null
  description: string | null
  directArticles: LinkedArticle[]
  groups: CategoryGroup[]
}

export function listCategories(siteId: string, lang?: string) {
  return client.get<unknown, CategoryVO[]>(`/wiki/sites/${siteId}/categories`, { params: { lang } })
}
export function createCategory(siteId: string, p: { icon?: string | null; i18ns: WikiI18nText[] }) {
  return client.post<unknown, string>(`/wiki/sites/${siteId}/categories`, p)
}
export function updateCategory(categoryId: string, p: { icon?: string | null; i18ns: WikiI18nText[] }) {
  return client.put<unknown, void>(`/wiki/categories/${categoryId}`, p)
}
export function deleteCategory(categoryId: string) {
  return client.delete<unknown, void>(`/wiki/categories/${categoryId}`)
}
export function sortCategories(siteId: string, ids: string[]) {
  return client.put<unknown, void>(`/wiki/sites/${siteId}/categories/sort`, { ids })
}
export function categoryDetail(categoryId: string, lang?: string) {
  return client.get<unknown, CategoryDetailVO>(`/wiki/categories/${categoryId}`, { params: { lang } })
}
export function createGroup(categoryId: string, p: { i18ns: WikiI18nText[] }) {
  return client.post<unknown, string>(`/wiki/categories/${categoryId}/groups`, p)
}
export function updateGroup(groupId: string, p: { i18ns: WikiI18nText[] }) {
  return client.put<unknown, void>(`/wiki/groups/${groupId}`, p)
}
export function deleteGroup(groupId: string) {
  return client.delete<unknown, void>(`/wiki/groups/${groupId}`)
}
export function sortGroups(categoryId: string, ids: string[]) {
  return client.put<unknown, void>(`/wiki/categories/${categoryId}/groups/sort`, { ids })
}
export function linkableArticles(categoryId: string, lang?: string) {
  return client.get<unknown, WikiArticleRowVO[]>(`/wiki/categories/${categoryId}/linkable`, { params: { lang } })
}
export function linkArticles(categoryId: string, p: { groupId?: string | null; articleIds: string[] }) {
  return client.post<unknown, void>(`/wiki/categories/${categoryId}/link`, p)
}
export function unlinkArticle(linkId: string) {
  return client.delete<unknown, void>(`/wiki/links/${linkId}`)
}
export function sortArticles(categoryId: string, ids: string[], groupId?: string) {
  return client.put<unknown, void>(`/wiki/categories/${categoryId}/articles/sort`, { ids }, { params: { groupId } })
}
