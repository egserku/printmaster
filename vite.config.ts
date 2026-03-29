import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'unenfeebled-overbravely-ceola.ngrok-free.dev',
      '*.ngrok-free.dev',
      '*.ngrok.io',
    ],
    hmr: {
      protocol: 'ws',
      host: 'unenfeebled-overbravely-ceola.ngrok-free.dev',
      port: 443,
    },
  },
});
