import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发服务器把 /api 代理到后端 aitalky-app(localhost:8080),避免跨域
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // WebSocket 实时网关(Netty,9100):ws://.../ws?token=xxx
      '/ws': {
        target: 'ws://localhost:9100',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
