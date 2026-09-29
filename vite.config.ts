import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 5173 is reserved for the LMS frontend that Employee Login points at locally.
  server: { port: 5175 },
  plugins: [react()],
  build: {
    rollupOptions: { input: { main: 'index.html' }, output: { manualChunks: { three: ['three'] } } },
    chunkSizeWarningLimit: 700,
  },
})
