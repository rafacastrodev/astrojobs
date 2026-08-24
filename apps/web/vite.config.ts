import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const config = defineConfig(({ command }) => ({
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  resolve: { tsconfigPaths: true },
  build: {
    sourcemap: false,
    cssMinify: true,
  },
  esbuild: {
    legalComments: 'none' as const,
  },
  server: {
    port: 3000,
    proxy: {
      '/health': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/recruiter': 'http://localhost:8000',
      '/documents': 'http://localhost:8000',
      '/analysis': 'http://localhost:8000',
    },
  },
  plugins: [
    ...(command === 'serve' ? [devtools()] : []),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
}))

export default config
