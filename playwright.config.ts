import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the exported web build (`npm run export:web`).
 * They run in Chromium at iPhone screen size. This checks the shared
 * React Native code paths in a browser; it is NOT a test on iOS or Safari.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
