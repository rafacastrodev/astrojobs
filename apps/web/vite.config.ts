import { fileURLToPath, URL } from 'node:url'

import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const config = defineConfig({
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: { tsconfigPaths: true },
  server: {
    port: 3000,
    proxy: {
      '/health': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/admin/documents': 'http://localhost:8000',
      '/documents': 'http://localhost:8000',
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
})

export default config
