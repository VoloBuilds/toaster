import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/toaster/',
  build: {
    outDir: 'dist/toaster',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Deduplicate Strudel packages to prevent multiple instances
    dedupe: [
      '@strudel/core',
      '@strudel/mini',
      '@strudel/tonal',
      '@strudel/webaudio',
      '@strudel/draw',
      '@strudel/transpiler',
    ],
  },
  optimizeDeps: {
    // Pre-bundle Strudel packages
    include: [
      '@strudel/web',
      '@strudel/codemirror',
    ],
  },
})

