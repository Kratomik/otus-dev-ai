import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts', './src/__tests__/setupCiMsw.ts'],
    globals: true,
    pool: 'threads',
    maxWorkers: 1,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
