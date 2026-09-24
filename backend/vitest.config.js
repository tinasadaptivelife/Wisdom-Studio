import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      // Keeps every test run on a throwaway in-memory database instead of
      // the real wisdom-studio.sqlite file used by the dev server.
      WISDOM_STUDIO_DB_PATH: ':memory:',
      AI_HORDE_API_KEY: 'test-key',
      // Border routes read tiny fixture images, not the real (partly
      // private, gitignored) artwork in assets/borders.
      WISDOM_STUDIO_BORDERS_DIR: 'test/fixtures/borders',
    },
  },
});
