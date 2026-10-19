import { Page, expect } from '@playwright/test';

/** Saves a screenshot into docs/screenshots/m0 when SCREENSHOTS=1. */
export async function shot(page: Page, name: string) {
  if (process.env.SCREENSHOTS !== '1') return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/screenshots/m0/${name}.png` });
}

export async function exploreEmpty(page: Page) {
  await page.goto('/');
  await page.getByTestId('explore-empty').click();
  await expect(page.getByTestId('today')).toBeVisible();
}

/** Adds one club from the Club Face Gallery tile on the current screen. */
export async function addClubFromTile(
  page: Page,
  typeCode: string,
  opts: { brand?: string; model?: string; customName?: string; addToBag: boolean; expectBagFull?: boolean },
) {
  await page.getByTestId(`tile-${typeCode}`).click();
  await expect(page.getByTestId('add-club-screen')).toBeVisible();
  if (opts.customName !== undefined) await page.getByTestId('custom-name').fill(opts.customName);
  if (opts.brand) await page.getByTestId('brand').fill(opts.brand);
  if (opts.model) await page.getByTestId('model').fill(opts.model);
  await page.getByTestId(opts.addToBag ? 'save-add-bag' : 'save-clubs-only').click();
  if (opts.expectBagFull) await expect(page.getByTestId('dialog')).toBeVisible();
  // Wait until the save has finished and the form has closed.
  else await expect(page.getByTestId('add-club-screen')).toHaveCount(0);
}
