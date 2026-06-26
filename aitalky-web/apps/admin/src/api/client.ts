import axios from 'axios'
import { message } from 'antd'
import { useAdminStore } from '../store/useAdminStore'
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
  const { token, lang } = useAdminStore.getState()
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  cfg.headers.lang = lang || 'zh_CN'
  return cfg
})

function toLogin() {
  useAdminStore.getState().logout()
  location.hash = '#/login'
}

client.interceptors.response.use(
  (resp) => {
    const r = resp.data
    if (r && typeof r.code === 'number') {
      if (r.code === 0) {
        return r.data
      }
      if (r.code === 401) {
        toLogin()
      }
      message.error(r.message || i18n.t('common.reqFailed'))
      return Promise.reject(new Error(r.message || 'fail'))
    }
    return r
  },
  (err) => {
    if (err.response?.status === 401) {
      toLogin()
    }
    // 后端有本地化 message 用后端的;否则按错误类型给友好兜底(超时/网络/通用)
    message.error(err.response?.data?.message || networkErrMsg(err))
    return Promise.reject(err)
  },
)

export default client
