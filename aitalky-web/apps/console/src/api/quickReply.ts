import client from './client'

export interface QuickReplyCategoryVO {
  id: string
  name: string
  sort: number
}

export interface QuickReplyVO {
  id: string
  categoryId: string | null
  categoryName: string | null
  title: string | null
  content: string
  sort: number | null
  editorId: string | null
  editorName: string | null
  updateTime: string | null
}

export function listCategories() {
  return client.get<unknown, QuickReplyCategoryVO[]>('/quick-replies/categories')
}
export function addCategory(name: string) {
  return client.post<unknown, string>('/quick-replies/categories', { name })
}
export function renameCategory(id: string, name: string) {
  return client.put<unknown, void>(`/quick-replies/categories/${id}`, { name })
}
export function deleteCategory(id: string) {
  return client.delete<unknown, void>(`/quick-replies/categories/${id}`)
}

export function listQuickReplies() {
  return client.get<unknown, QuickReplyVO[]>('/quick-replies')
}
export function addQuickReply(p: { categoryId?: string | null; title?: string; content: string }) {
  return client.post<unknown, string>('/quick-replies', p)
}
export function updateQuickReply(id: string, p: { categoryId?: string | null; title?: string; content: string }) {
  return client.put<unknown, void>(`/quick-replies/${id}`, p)
}
export function updateQuickReplySort(id: string, sort: number) {
  return client.put<unknown, void>(`/quick-replies/${id}/sort`, { sort })
}
export function deleteQuickReply(id: string) {
  return client.delete<unknown, void>(`/quick-replies/${id}`)
}
