import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3030,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || 'https://manufacturing-automation-3004.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
