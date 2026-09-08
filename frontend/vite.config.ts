/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev port is pinned: the backend's CORS allowlist names http://localhost:5173
// explicitly (backend/app/api/main.py). strictPort makes a port clash fail loudly
// here rather than silently shifting to 5174, where every request would be
// rejected by the browser with an opaque CORS error instead of a 4xx.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    // happy-dom, not jsdom: jsdom does not implement HTMLDialogElement.showModal,
    // and every modal in this app is a native <dialog>. See docs/testing-guide.md.
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
