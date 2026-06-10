import client from './client'
import { encryptPassword } from './crypto'
import type { AdminLoginResult, AdminProfile, CaptchaVO } from '../types'

/** 获取图形验证码 */
export function getCaptcha() {
  return client.get<unknown, CaptchaVO>('/admin/auth/captcha')
}

/** 登录:用户名 + RSA 加密密码 + 图形验证码 */
export async function login(username: string, password: string, captchaId: string, captchaCode: string) {
  const cipher = await encryptPassword(password)
  return client.post<unknown, AdminLoginResult>('/admin/auth/login', {
    username,
    password: cipher,
    captchaId,
    captchaCode,
  })
}

/** 当前管理员资料 */
export function getMe() {
  return client.get<unknown, AdminProfile>('/admin/me')
}
