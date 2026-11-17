import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 构建模式：
 *   - 默认（development / production）：前端请求 /api，由 Express + SQLite 后端提供数据
 *   - demo：静态部署模式，构建时把 VITE_DEMO 置为 '1'，前端加载浏览器端数据层，
 *           整个站点可作为纯静态资源部署（火山引擎 IGA Pages 等），无需后端进程
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEMO': JSON.stringify(mode === 'demo' ? '1' : '')
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['echarts', 'gsap']
        }
      }
    }
  }
}));
