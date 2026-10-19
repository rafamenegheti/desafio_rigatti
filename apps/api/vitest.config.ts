import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup-env.ts'],
    // Os testes de integração compartilham um único MongoDB em memória
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
