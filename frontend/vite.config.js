import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    watch: {
      // ChromeOS containers sometimes fail to watch node_modules properly
      usePolling: true, 
    },
  },
  optimizeDeps: {
    // Forces Vite to check dependencies on every startup instead of relying on the browser
    force: true, 
  },
});
