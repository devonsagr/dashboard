import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 5185, strictPort: true },
  preview: { host: '127.0.0.1', port: 4185, strictPort: true },
});
