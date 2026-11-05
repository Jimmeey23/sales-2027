import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    // Tests run on a throwaway in-memory database seeded from the bundled fixtures, never on
    // p57-data/studio.db, and never reach Supabase.
    env: { DATABASE_PATH: ':memory:', P57_SEED_PLAN: 'true', DATABASE_URL: '' },
  },
});
