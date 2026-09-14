import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  define: {
    __BRAND_NAME__: JSON.stringify(process.env.VITE_BRAND_NAME || 'Cue'),
    __BRAND_PRIMARY__: JSON.stringify(process.env.VITE_BRAND_PRIMARY_COLOR || '#4fa37b'),
    __BRAND_ACCENT__: JSON.stringify(process.env.VITE_BRAND_ACCENT_COLOR || '#c9a227'),
    __BRAND_ALERT__: JSON.stringify(process.env.VITE_BRAND_ALERT_COLOR || '#c1432b'),
  },
  server: {
    watch: {
      usePolling: true, 
    },
  },
  optimizeDeps: {
    force: true, 
  },
});
