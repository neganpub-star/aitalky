import client from './client'
import { encryptPassword } from './crypto'
import type { EnterResult, LoginResult, ProjectBrief, VerifyScene, WhoAmI } from '../types'

/** 发送邮箱验证码 */
export function sendCode(email: string, scene: VerifyScene) {
  return client.post<unknown, void>('/auth/send-code', { email, scene })
}

/** 注册(密码经 RSA 公钥加密后再传) */
export async function register(email: string, password: string, code: string) {
  const enc = await encryptPassword(password)
  return client.post<unknown, string>('/auth/register', { email, password: enc, code })
}

/** 登录(密码 RSA 加密 + 验证码 2FA) */
export async function login(email: string, password: string, code: string) {
  const enc = await encryptPassword(password)
  return client.post<unknown, LoginResult>('/auth/login', { email, password: enc, code })
}

/** 创建项目 */
export function createProject(name: string) {
  return client.post<unknown, ProjectBrief>('/projects', { name })
}

/** 进入项目(换项目级 token) */
export function enterProject(projectId: string) {
  return client.post<unknown, EnterResult>(`/auth/enter/${projectId}`)
}

/** 当前登录上下文 */
export function whoami() {
  return client.get<unknown, WhoAmI>('/whoami')
}
