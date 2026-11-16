import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    watch: {
      ignored: [
        '**/AppData/**',
        '**/node_modules/**',
        '**/NTUSER.DAT*',
        '**/ntuser.dat*',
        '**/AppData/Roaming/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
