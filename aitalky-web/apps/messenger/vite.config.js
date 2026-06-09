import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// 信使端开发服务器:5174;/api 代理到 app(8080),/ws 代理到 Netty 网关(9100)
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174,
        proxy: {
            '/api': { target: 'http://localhost:8080', changeOrigin: true },
            '/ws': { target: 'ws://localhost:9100', ws: true, changeOrigin: true },
        },
    },
});
