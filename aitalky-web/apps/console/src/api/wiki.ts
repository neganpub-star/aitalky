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
