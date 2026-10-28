import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => ({
  // Project Pages is served at /Habits/. The iOS build and local dev stay at the site root.
  base: command === 'build' && mode !== 'ios' ? '/Habits/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  test: {
    environment: 'node',
  },
}));
