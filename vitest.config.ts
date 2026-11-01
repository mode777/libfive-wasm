import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Meshing at useful resolutions takes seconds per mesh; GC-pressure
    // tests wait on collection. 60s keeps the artifact tests comfortable.
    testTimeout: 60000,
    // Expose global.gc() to test workers so the FinalizationRegistry
    // safety-net tests can force collection (AD-005).
    poolOptions: {
      forks: { execArgv: ['--expose-gc'] },
      threads: { execArgv: ['--expose-gc'] },
    },
    // Scaffold stage: the suite fills in with the loader/ffi work.
    passWithNoTests: true,
  },
});
