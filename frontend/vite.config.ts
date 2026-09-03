import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiProxy = {
  '/api': {
    target: 'http://localhost:8001',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: apiProxy,
  },
  preview: {
    port: 5174,
    proxy: apiProxy,
  },
})
