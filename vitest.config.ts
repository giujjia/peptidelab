import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Testes de componente em jsdom, separados da configuracao de build
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
