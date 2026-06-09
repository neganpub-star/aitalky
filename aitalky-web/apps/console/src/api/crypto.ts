import JSEncrypt from 'jsencrypt'
import client from './client'

// 密码不明文传输:用后端下发的 RSA 公钥加密后再提交,后端私钥解密
let publicKey = ''

async function ensurePublicKey(): Promise<string> {
  if (!publicKey) {
    publicKey = await client.get<unknown, string>('/auth/public-key')
  }
  return publicKey
}

/** 用 RSA 公钥加密密码 */
export async function encryptPassword(raw: string): Promise<string> {
  const key = await ensurePublicKey()
  const enc = new JSEncrypt()
  enc.setPublicKey(key)
  const cipher = enc.encrypt(raw)
  if (!cipher) {
    throw new Error('密码加密失败')
  }
  return cipher
}
