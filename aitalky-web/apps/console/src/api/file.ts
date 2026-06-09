import client from './client'

/** 上传文件(multipart),返回可访问 URL(MinIO)。axios 传 FormData 自动带 multipart 边界 */
export function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  return client.post<unknown, string>('/files/upload', fd)
}
