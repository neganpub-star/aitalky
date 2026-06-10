import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发服务器把 /api 代理到平台后管后端 aitalky-admin(localhost:8090)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
})
