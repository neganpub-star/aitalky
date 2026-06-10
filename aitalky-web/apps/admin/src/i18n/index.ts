import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh_CN from './locales/zh_CN'
import en_US from './locales/en_US'
import { useAdminStore } from '../store/useAdminStore'

// 前端多语言:文案统一走 t('ns.key');语言取自 store(持久化),与后端 lang 口径一致
void i18n.use(initReactI18next).init({
  resources: {
    zh_CN: { translation: zh_CN },
    en_US: { translation: en_US },
  },
  lng: useAdminStore.getState().lang,
  fallbackLng: 'zh_CN',
  interpolation: { escapeValue: false },
})

/** 切换语言(同时更新 store 与 i18n) */
export function changeLang(lang: string): void {
  useAdminStore.getState().setLang(lang)
  void i18n.changeLanguage(lang)
}

export default i18n
