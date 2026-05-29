import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api/scanoracle/lookup': {
        target: 'https://security.appcardy.com',
        changeOrigin: true,
        rewrite: path => {
          // /api/scanoracle/lookup/{key}       → /api/v1.0/scanoracle/ip/info/api/{key}/
          // /api/scanoracle/lookup/{key}/{ip}  → /api/v1.0/scanoracle/ip/info/api/{key}/{ip}
          const parts = path.replace('/api/scanoracle/lookup/', '').split('/')
          const [key, ip] = parts
          return ip
            ? `/api/v1.0/scanoracle/ip/info/api/${key}/${ip}`
            : `/api/v1.0/scanoracle/ip/info/api/${key}/`
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
