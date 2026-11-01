import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Scaffold stage: the suite fills in with the loader/ffi work.
    passWithNoTests: true,
  },
});
