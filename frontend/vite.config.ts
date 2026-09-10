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
    // Vitest's default is 5000ms, which this suite outgrew the moment `make
    // check` made it mandatory: the 16 files each build their own happy-dom and
    // run in parallel, so on a busy machine the screen-level tests — which walk
    // a whole create/edit/delete flow through polling `waitFor` helpers — blow
    // the deadline. Measured: ExpensesScreen.test.tsx runs in 1.7s alone and
    // times out at 5s under load, while the same commit passes in CI.
    //
    // The tests are not racy; they are deadline-bound, so the fix is headroom,
    // not retries. A genuinely hung test still fails, 10s later. That matters
    // because this suite now gates every commit: a gate that goes red for
    // reasons unrelated to your change is one people learn to bypass, which is
    // exactly the argument this repo used against skipping it.
    testTimeout: 15000,
  },
})
