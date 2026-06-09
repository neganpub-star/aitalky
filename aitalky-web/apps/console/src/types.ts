// 后端雪花ID为字符串(后端已配置 Long->String,避免 JS 丢精度)
export interface ProjectBrief {
  id: string
  name: string
  appId: string
}

export interface LoginResult {
  token: string
  accountId: string
  email: string
  projects: ProjectBrief[]
}

export interface EnterResult {
  token: string
  projectId: string
  memberId: string
  roleId: string
  roleName: string
  functions: string[]
}

export interface WhoAmI {
  projectId: string
  accountId: string
  memberId: string
  functions: string[]
  lang: string | null
}

export type VerifyScene = 'REGISTER' | 'LOGIN' | 'RESET_PWD'
