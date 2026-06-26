import axios from 'axios'
import { message } from 'antd'
import { getToken, logout } from '../auth/session'
import { useAppStore } from '../store/useAppStore'
import i18n from '../i18n'

// 网络/超时类错误的友好兜底文案(后端有返回 message 时优先用后端的本地化文案)
function networkErrMsg(err: { code?: string; message?: string; response?: unknown }): string {
  if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) return i18n.t('common.timeout')
  if (err.code === 'ERR_NETWORK' || !err.response) return i18n.t('common.netError')
  return i18n.t('common.reqFailed')
}

// 统一请求客户端:注入 token/语言,拆解后端统一响应 R(成功返回 data,失败弹错并 reject)
const client = axios.create({ baseURL: '/api', timeout: 15000 })

client.interceptors.request.use((cfg) => {
  const token = getToken()
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  // 发当前界面语言(zh_CN/en_US),后端据此本地化错误提示;原先写死 zh_CN 导致英文环境也返回中文
  cfg.headers.lang = useAppStore.getState().lang || 'zh_CN'
  return cfg
})

client.interceptors.response.use(
  (resp) => {
    const r = resp.data
    if (r && typeof r.code === 'number') {
      if (r.code === 0) {
        return r.data
      }
      if (r.code === 401) {
        logout()
        location.hash = '#/login'
      }
      // 1004=项目无有效订阅:由订阅遮罩统一引导,不弹通用错误 toast(避免门禁场景重复打扰)
      if (r.code === 1004) {
        return Promise.reject(new Error(r.message || 'no subscription'))
      }
      message.error(r.message || i18n.t('common.reqFailed'))
      return Promise.reject(new Error(r.message || 'fail'))
    }
    return r
  },
  (err) => {
    if (err.response?.status === 401) {
      logout()
      location.hash = '#/login'
    }
    // 后端有本地化 message 用后端的;否则按错误类型给友好兜底(超时/网络/通用)
    message.error(err.response?.data?.message || networkErrMsg(err))
    return Promise.reject(err)
  },
)

export default client
