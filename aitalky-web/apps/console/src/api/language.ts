import client from './client'
import type { LangDef } from '../constants/languages'

// 后端语种字典项(平台 pf_language 启用项)
interface LanguageVO {
  id: string
  code: string
  zhName: string
  enName: string
  sort: number
  status: number
}

/** 拉取启用语种全集(候选项),映射为前端 LangDef */
export async function fetchLanguages(): Promise<LangDef[]> {
  const list = await client.get<unknown, LanguageVO[]>('/languages')
  return (list || []).map((l) => ({ code: l.code, zh: l.zhName, en: l.enName }))
}
