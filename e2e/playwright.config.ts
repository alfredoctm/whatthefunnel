import { defineConfig } from '@playwright/test';

/**
 * Playwright runs E2E against the live docker-compose stack.
 * Bring it up first: `docker compose up -d --build --wait` (from repo root).
 * Tests assume http://localhost:8080 (the nginx web service).
 */
export default defineConfig({
  testDir: './test',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env['WTF_BASE_URL'] ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
    },
  ],
});
