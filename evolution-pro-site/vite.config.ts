import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const setupFile = new URL('./tests/setup.ts', import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: [setupFile],
  },
});
