import { defineConfig } from 'vitest/config'

export default defineConfig({
  publicDir: '../data/sample_docs',
  test: {
    environment: 'jsdom',
  },
})
