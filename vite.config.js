import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import faviconPlugin from './vite-plugin-favicon'

// https://vitejs.dev/config/ - updated logo path
export default defineConfig({
  plugins: [react(), faviconPlugin()],
  server: {
    port: 3000,
    host: true
  }
})
