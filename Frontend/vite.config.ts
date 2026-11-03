import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { validateApiConfiguration } from './scripts/api-config.mjs'
export default defineConfig(({ command, mode }) => {
  validateApiConfiguration(loadEnv(mode, process.cwd(), 'VITE_'), command === 'build')
  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: 'localhost',
      port: 4173,
      strictPort: true,
    },
  }
})
