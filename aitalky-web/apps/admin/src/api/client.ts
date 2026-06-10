import axios from 'axios'
import { message } from 'antd'
import { useAdminStore } from '../store/useAdminStore'

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
      message.error(r.message || '请求失败')
      return Promise.reject(new Error(r.message || 'fail'))
    }
    return r
  },
  (err) => {
    if (err.response?.status === 401) {
      toLogin()
    }
    message.error(err.response?.data?.message || err.message || '网络错误')
    return Promise.reject(err)
  },
)

export default client
