import { expect, test } from './fixtures';

import { addClubFromTile, exploreEmpty } from './helpers';

/** Fictional golfer. Covers spec §2.1 step 7 (baseline), §2.4 club picking and §2.5 coach notes. */
test('baseline: hole-by-hole putts keep unrecorded holes out of the total; range session uses the bag-first club picker', async ({ page }) => {
  await exploreEmpty(page);
  await page.goto('./clubs/catalogue');
  await addClubFromTile(page, 'iron_7', { brand: 'Example Maker A', addToBag: true });
  await addClubFromTile(page, 'hybrid_4', { brand: 'Example Maker B', addToBag: false });

  await page.goto('./profile/baseline');
  await expect(page.getByTestId('step-baseline')).toBeVisible();

  // Nine-hole round, putts hole by hole with three holes not counted.
  await page.getByTestId('round-date').fill('2025-07-12');
  await page.getByTestId('round-holes-9').click();
  await page.getByTestId('round-score').fill('49');
  await page.getByTestId('putts-mode-per_hole').click();
  const putts = ['2', '', '1', '2', '', '3', '2', '', '2'];
  for (let i = 0; i < putts.length; i++) if (putts[i]) await page.getByTestId(`hole-putts-${i + 1}`).fill(putts[i]!);
  await page.getByTestId('add-round').click();
  await expect(page.getByText(/9 holes · 49 · 12 putts \(6\/9 holes recorded\)/)).toBeVisible();

  // Range session: the bag club is offered first; other owned clubs only on request; unknown always available.
  await expect(page.getByTestId('range-club-' + (await clubIdByLabel(page, '7-iron (Example Maker A)')))).toBeVisible();
  await expect(page.getByRole('radio', { name: /4-hybrid/ })).toHaveCount(0);
  await page.getByTestId('range-club-show-others').click();
  await page.getByRole('radio', { name: /4-hybrid \(Example Maker B\) · not in bag/ }).click();
  await page.getByTestId('range-today').click();
  await page.getByTestId('range-context-mat_range').click();
  await page.getByTestId('range-shots').fill('20');
  await page.getByTestId('range-successes').fill('11');
  await page.getByTestId('range-definition').fill('finished playable');
  await page.getByTestId('add-range').click();
  await expect(page.getByText(/4-hybrid · Mat range · 20 shots · 11\/20 finished playable/)).toBeVisible();

  // A second session with the club recorded as unknown.
  await page.getByTestId('range-today').click();
  await page.getByRole('radio', { name: 'Unknown / not entered' }).click();
  await page.getByTestId('range-context-grass_range').click();
  await page.getByTestId('range-shots').fill('10');
  await page.getByTestId('add-range').click();
  await expect(page.getByText(/Club not entered · Grass range · 10 shots · successes not counted/)).toBeVisible();

  // Survives relaunch.
  await page.reload();
  await expect(page.getByText(/12 putts \(6\/9 holes recorded\)/)).toBeVisible();
  await expect(page.getByText(/4-hybrid · Mat range · 20 shots/)).toBeVisible();
});

test('coach notes are dated, self-reported and editable later; height can be marked as not known', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('get-started').click();
  await page.getByTestId('skip').click(); // experience

  await expect(page.getByTestId('step-comfort')).toBeVisible();
  await page.getByTestId('height-unknown').click();
  await expect(page.getByTestId('height-cm')).toHaveCount(0);
  await page.getByTestId('save-continue').click();

  await page.getByTestId('skip').click(); // goals
  await expect(page.getByTestId('step-practice')).toBeVisible();
  await page.getByTestId('coach-name').fill('Coach Example');
  await page.getByTestId('coach-note-text').fill('Use a gate to check start line');
  await page.getByTestId('coach-note-today').click();
  await page.getByTestId('add-coach-note').click();
  await expect(page.getByTestId('coach-notes').getByText('Use a gate to check start line')).toBeVisible();
  await expect(page.getByTestId('coach-notes').getByText('Self-reported')).toBeVisible();
  await page.getByTestId('save-continue').click();

  await page.goto('./profile/comfort');
  await expect(page.getByTestId('height-unknown').getByRole('switch')).toBeChecked();
  await page.goto('./profile/practice');
  await expect(page.getByTestId('coach-notes').getByText('Use a gate to check start line')).toBeVisible();
});

test('My Clubs offers a grouped visual grid with in-bag toggles', async ({ page }) => {
  await exploreEmpty(page);
  await page.goto('./clubs/catalogue');
  await addClubFromTile(page, 'driver', { brand: 'Example Maker A', addToBag: true });
  await addClubFromTile(page, 'putter', { brand: 'Example Maker E', addToBag: false });
  await page.goto('./clubs');
  await page.getByTestId('clubs-view-grid').click();
  await expect(page.getByTestId(/^club-tile-/)).toHaveCount(2);
  await page.getByLabel('Add Putter (Example Maker E) to bag').click();
  await expect(page.getByText('Current bag “My Bag”: 2 / 14 in bag')).toBeVisible();
});

async function clubIdByLabel(page: import('@playwright/test').Page, label: string): Promise<string> {
  const radio = page.getByRole('radio', { name: label });
  const testId = await radio.getAttribute('data-testid');
  if (!testId) throw new Error(`No radio for ${label}`);
  return testId.replace('range-club-', '');
}
