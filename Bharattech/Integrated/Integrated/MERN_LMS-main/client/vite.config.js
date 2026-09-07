import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pinned off 5174 — that port is used by the Cinematic Landing Page
    // marketing site's dev server. Keep this in sync with VITE_LMS_URL in
    // Learning-Management-System/frontend/.env.local.
    port: 5175,
    strictPort: true,
    allowedHosts: ['keycloak.local'],
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})

