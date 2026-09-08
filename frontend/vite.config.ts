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
})
