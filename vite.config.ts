import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Pacote e ESM ("type": "module"); import.meta.url substitui __dirname
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
