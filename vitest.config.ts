import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Dado que el evaluador educativo no requiere DOM, 'node' es suficiente y rápido
    include: ['tests/**/*.test.ts'],
  },
});
