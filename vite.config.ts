import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Handle client-side routing for /invite/* paths
  server: {
    historyApiFallback: true,
  },
})
