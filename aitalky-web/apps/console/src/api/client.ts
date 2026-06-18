import axios from 'axios'
import { message } from 'antd'
import { getToken, logout } from '../auth/session'
import { useAppStore } from '../store/useAppStore'

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
      message.error(r.message || '请求失败')
      return Promise.reject(new Error(r.message || 'fail'))
    }
    return r
  },
  (err) => {
    if (err.response?.status === 401) {
      logout()
      location.hash = '#/login'
    }
    message.error(err.response?.data?.message || err.message || '网络错误')
    return Promise.reject(err)
  },
)

export default client
