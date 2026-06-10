// 系统支持的语言全集。
// 数据源已迁到后端「语种字典」(平台 pf_language,后管维护):App 启动后调 /api/languages
// 拉取启用语种并 setLanguageDict() 覆盖本缓存;下方常量仅作为接口返回前/失败时的兜底种子。
// 各处(常规设置/信使设置多语言平铺/紧急通知)统一用 allLanguages()/langLabel() 取数。

export interface LangDef {
  code: string
  zh: string
  en: string
}

// 兜底种子(对齐后端 pf_language 初始 18 种)。接口数据到达后会被 setLanguageDict 覆盖。
const SEED: LangDef[] = [
  { code: 'zh_CN', zh: '简体中文', en: 'Simplified Chinese' },
  { code: 'en_US', zh: '英文', en: 'English' },
  { code: 'zh_TW', zh: '繁体中文', en: 'Traditional Chinese' },
  { code: 'vi_VN', zh: '越南语', en: 'Vietnamese' },
  { code: 'my_MM', zh: '缅甸语', en: 'Burmese' },
  { code: 'de_DE', zh: '德语', en: 'German' },
  { code: 'it_IT', zh: '意大利语', en: 'Italian' },
  { code: 'pt_PT', zh: '葡萄牙语', en: 'Portuguese' },
  { code: 'ja_JP', zh: '日语', en: 'Japanese' },
  { code: 'ko_KR', zh: '韩语', en: 'Korean' },
  { code: 'id_ID', zh: '印尼语', en: 'Indonesian' },
  { code: 'ru_RU', zh: '俄语', en: 'Russian' },
  { code: 'th_TH', zh: '泰语', en: 'Thai' },
  { code: 'lo_LA', zh: '老挝语', en: 'Lao' },
  { code: 'fr_FR', zh: '法语', en: 'French' },
  { code: 'ms_MY', zh: '马来语', en: 'Malay' },
  { code: 'es_ES', zh: '西班牙语', en: 'Spanish' },
  { code: 'tr_TR', zh: '土耳其语', en: 'Turkish' },
]

// 当前语种缓存(可被接口数据覆盖);用 let 持有,langLabel/allLanguages 都读它
let dict: LangDef[] = [...SEED]
let dictMap: Record<string, LangDef> = Object.fromEntries(SEED.map((l) => [l.code, l]))

/** 用后端语种字典覆盖本地缓存(App 启动拉取 /api/languages 后调用) */
export function setLanguageDict(list: LangDef[]): void {
  if (!list || list.length === 0) return // 空结果不覆盖,保留种子兜底
  dict = list
  dictMap = Object.fromEntries(list.map((l) => [l.code, l]))
}

/** 当前语种全集(候选项来源) */
export function allLanguages(): LangDef[] {
  return dict
}

// 取语种展示名;lng 以 'en' 开头用英文名,否则中文名;未知 code 原样返回
export function langLabel(code: string, lng?: string): string {
  const def = dictMap[code]
  if (!def) return code
  return lng && lng.startsWith('en') ? def.en : def.zh
}
