import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/AppData/**',
        '**/NTUSER.DAT*',
        '**/ntuser.dat*',
        '**/AppData/Roaming/**',
      ],
    },
  },
});
