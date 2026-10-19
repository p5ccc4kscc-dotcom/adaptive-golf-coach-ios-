import { test as base } from '@playwright/test';

/**
 * Shared test fixture: records browser console errors, page errors and failed
 * requests, and attaches them to the test report so CI failures are diagnosable.
 */
export const test = base.extend<{ diagnostics: string[] }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const lines: string[] = [];
      const t0 = Date.now();
      const log = (s: string) => lines.push(`+${Date.now() - t0}ms ${s}`);
      page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && log(`console.${m.type()}: ${m.text()}`));
      page.on('pageerror', (e) => log(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) => log(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
      page.on('framenavigated', (f) => f === page.mainFrame() && log(`navigated: ${f.url()}`));
      await use(lines);
      if (testInfo.status !== testInfo.expectedStatus) {
        console.log(`--- diagnostics for "${testInfo.title}" ---\n${lines.join('\n')}\n--- end diagnostics ---`);
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
