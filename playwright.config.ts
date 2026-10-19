import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the exported web build (`npm run export:web`).
 * They run in Chromium at iPhone screen size. This checks the shared
 * React Native code paths in a browser; it is NOT a test on iOS or Safari.
 */
// BASE_PATH=/adaptive-golf-coach-ios- tests a GitHub Pages-style sub-path build.
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');

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
    // Trailing slash so page.goto('clubs') resolves under the sub-path.
    baseURL: `http://localhost:8081${basePath}/`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: `http://localhost:8081${basePath}/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
