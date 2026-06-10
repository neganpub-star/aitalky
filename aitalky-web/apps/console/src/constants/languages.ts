// 系统支持的语言全集(单一来源)。
// 当前为前端常量;TODO(后管):改为读后端「语种字典」接口(见 doc/后管功能清单.md),
// 实现新增语种无需改代码。各处(常规设置/信使设置多语言平铺/紧急通知)都从这里取语种名。

export interface LangDef {
  code: string
  zh: string
  en: string
}

// 语种全集(对齐参考系统常见语种)。code 与后端一致(xx_XX)
export const LANGUAGES: LangDef[] = [
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

const LANG_MAP: Record<string, LangDef> = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]))

// 取语种展示名;lng 以 'en' 开头用英文名,否则中文名;未知 code 原样返回
export function langLabel(code: string, lng?: string): string {
  const def = LANG_MAP[code]
  if (!def) return code
  return lng && lng.startsWith('en') ? def.en : def.zh
}
