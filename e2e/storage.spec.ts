import { expect, test } from './fixtures';

import { addClubFromTile, openClubForm } from './helpers';

/**
 * Browser preview storage safety: two tabs of the app in the same browser.
 * A tab holding an out-of-date copy must never silently overwrite newer data.
 */
test('a stale second tab is stopped with a reload prompt instead of overwriting newer clubs', async ({ context }) => {
  const tabA = await context.newPage();
  await tabA.goto('./');
  await tabA.getByTestId('explore-empty').click();
  await expect(tabA.getByTestId('today')).toBeVisible();

  await tabA.goto('./clubs/catalogue');
  const tabB = await context.newPage();
  await tabB.goto('./clubs/catalogue');
  await expect(tabB.getByTestId('club-catalogue')).toBeVisible();

  // Tab B saves first.
  await addClubFromTile(tabB, 'iron_7', { brand: 'Example Maker B', addToBag: false });

  // Tab A still has the older copy; its save is refused and it asks for a reload.
  await openClubForm(tabA, 'putter');
  await tabA.getByTestId('brand').fill('Example Maker A');
  await tabA.getByTestId('save-clubs-only').click();
  await expect(tabA.getByTestId('storage-conflict')).toBeVisible();

  // After reloading, tab A sees tab B's club: nothing was overwritten.
  await tabA.getByTestId('reload-after-conflict').click();
  await tabA.goto('./clubs');
  await expect(tabA.getByLabel('Add 7-iron (Example Maker B) to bag')).toBeVisible();
  await expect(tabA.getByTestId('owned-count')).toHaveText('1 club owned');
});
