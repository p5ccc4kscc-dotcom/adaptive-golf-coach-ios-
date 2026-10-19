import { expect, test } from './fixtures';

import { addClubFromTile, exploreEmpty, openClubForm, shot, waitForFormClosed } from './helpers';

test('two 5-irons with different brands stay separate; one goes in the bag; survives relaunch', async ({ page }) => {
  await exploreEmpty(page);
  await page.goto('./clubs/catalogue');
  await addClubFromTile(page, 'iron_5', { brand: 'Example Maker A', addToBag: false });
  await expect(page.getByTestId('club-catalogue')).toBeVisible();
  await expect(page.getByTestId('tile-iron_5').getByText('Owned × 1')).toBeVisible();
  await addClubFromTile(page, 'iron_5', { brand: 'Example Maker B', addToBag: true });

  await page.goto('./bag');
  await expect(page.getByTestId('bag-count')).toHaveText('1 / 14 in bag');
  await expect(page.getByLabel('Remove 5-iron (Example Maker B) from bag')).toBeVisible();
  await expect(page.getByLabel('Add 5-iron (Example Maker A) to bag')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('bag-count')).toHaveText('1 / 14 in bag');
  await expect(page.getByLabel('Remove 5-iron (Example Maker B) from bag')).toBeVisible();
  await expect(page.getByLabel('Add 5-iron (Example Maker A) to bag')).toBeVisible();
});

test('a 15th club is never silently added to a competition bag; swap and presets work', async ({ page }) => {
  await exploreEmpty(page);

  // 9 irons via the set helper (each a separate club), added to the bag.
  await page.goto('./clubs/iron-set');
  for (let n = 1; n <= 9; n++) await page.getByTestId(`iron-number-${n}`).click();
  await page.getByLabel('Also add them to My Bag').click();
  await page.getByTestId('create-iron-set').click();
  await expect(page.getByTestId('owned-count')).toHaveText('9 clubs owned');
  await page.goto('./clubs/catalogue');
  for (const code of ['wood_2', 'wood_3', 'wood_4', 'wood_5', 'wood_6']) {
    await addClubFromTile(page, code, { addToBag: true });
    await expect(page.getByTestId('club-catalogue')).toBeVisible();
  }

  // 15th: refused with an explanation.
  await addClubFromTile(page, 'wood_7', { addToBag: true, expectBagFull: true });
  await expect(page.getByText('My Bag is full')).toBeVisible();
  await shot(page, '08-bag-full');
  await page.getByTestId('dialog-keep-out').click();

  await page.goto('./bag');
  await expect(page.getByTestId('bag-count')).toHaveText('14 / 14 in bag');
  await shot(page, '09-build-my-bag');

  // Ticking a 15th club in Build My Bag also refuses and offers a swap.
  await page.getByLabel('Add 7-wood to bag').click();
  await expect(page.getByText('My Bag is full (14 / 14)')).toBeVisible();
  await page.getByTestId('dialog-cancel').click();
  await expect(page.getByTestId('bag-count')).toHaveText('14 / 14 in bag');

  // Swap one out, one in.
  await page.getByTestId('swap').click();
  await page.getByRole('button', { name: 'Take out 1-iron' }).click();
  await page.getByRole('button', { name: 'Put in 7-wood' }).click();
  await expect(page.getByTestId('bag-message')).toHaveText('Swapped.');
  await expect(page.getByTestId('bag-count')).toHaveText('14 / 14 in bag');
  await expect(page.getByLabel('Remove 7-wood from bag')).toBeVisible();
  await expect(page.getByLabel('Add 1-iron to bag')).toBeVisible();

  // A new, empty Par-3 preset; switching back keeps the Everyday bag intact.
  await page.getByTestId('new-preset').click();
  await page.getByTestId('new-preset-name').fill('Par-3');
  await page.getByTestId('new-start-empty').click();
  await page.getByTestId('create-preset').click();
  await expect(page.getByTestId('bag-count')).toHaveText('0 / 14 in bag');
  await page.getByLabel('Add 9-iron to bag').click();
  await expect(page.getByTestId('bag-count')).toHaveText('1 / 14 in bag');
  await page.getByRole('radio', { name: 'My Bag' }).click();
  await expect(page.getByTestId('bag-count')).toHaveText('14 / 14 in bag');
  await page.goto('./clubs');
  await expect(page.getByTestId('owned-count')).toHaveText('15 clubs owned');

  // Practice selections may exceed 14, clearly labelled.
  await page.goto('./bag');
  await page.getByTestId('toggle-kind').click();
  await expect(page.getByText('Practice selection', { exact: true })).toBeVisible();
  await page.getByLabel('Add 1-iron to bag').click();
  await expect(page.getByTestId('bag-count')).toHaveText('15 clubs · practice selection — not an on-course 14-club bag');
  await page.getByTestId('toggle-kind').click();
  await expect(page.getByTestId('bag-message')).toContainText('14 or fewer');
});

test('unusual clubs: “W” wedge with unknown loft, custom driving iron, wedge by loft; archive keeps history', async ({ page }) => {
  await exploreEmpty(page);
  await page.goto('./clubs/catalogue');

  await openClubForm(page, 'wedge_other_stamp');
  await page.getByTestId('custom-name').fill('W');
  await page.getByTestId('loft-unknown').click();
  await expect(page.getByTestId('loft-unknown').getByRole('switch')).toBeChecked();
  await page.getByTestId('save-clubs-only').click();
  await waitForFormClosed(page);

  await addClubFromTile(page, 'utility_iron_custom', { customName: 'Driving iron', brand: 'Example Maker D', addToBag: false });

  await openClubForm(page, 'wedge_by_loft');
  await page.getByTestId('save-clubs-only').click();
  await expect(page.getByText('Enter the loft for a wedge-by-loft club, or choose a named wedge instead.')).toBeVisible();
  await page.getByLabel('Set loft to 56 degrees').click();
  await page.getByTestId('save-clubs-only').click();
  // Navigating away mid-save would abandon it; wait until the form has closed.
  await waitForFormClosed(page);

  await page.goto('./clubs');
  await expect(page.getByText('Wedge stamped “W”')).toBeVisible();
  await expect(page.getByText('Loft not known')).toBeVisible();
  await expect(page.getByText('Brand and model not entered').first()).toBeVisible();
  await expect(page.getByText('Driving iron', { exact: true })).toBeVisible();
  await expect(page.getByText('56° wedge')).toBeVisible();
  // A driving iron is filed under driving/utility irons, never hybrids.
  await expect(page.getByText('Driving / utility irons')).toBeVisible();
  await expect(page.getByText('Hybrids / rescue')).toHaveCount(0);

  // Add a distance to the W wedge, then delete it: it is archived, history kept.
  await page.getByRole('button', { name: /Wedge stamped “W”/ }).click();
  await page.getByTestId('add-distance').click();
  await page.getByTestId('distance-value').fill('70');
  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByTestId('save-distance').click();
  await expect(page.getByText(/Estimated carry: 70 (yd|m)/)).toBeVisible();
  await page.getByTestId('delete-club').click();
  await page.getByTestId('dialog-confirm-delete').click();
  await expect(page.getByText('Club archived')).toBeVisible();
  await page.getByTestId('dialog-ok').click();
  await expect(page.getByText('Archived clubs')).toBeVisible();
  await expect(page.getByTestId('owned-count')).toHaveText('2 clubs owned');
});

test('Delete all my data returns the app to a blank first launch', async ({ page }) => {
  await exploreEmpty(page);
  await page.goto('./clubs/catalogue');
  await addClubFromTile(page, 'putter', { brand: 'Example Maker E', addToBag: true });
  await page.goto('./settings');
  await page.getByTestId('delete-all').click();
  await page.getByTestId('dialog-delete-all').click();
  await expect(page.getByTestId('step-welcome')).toBeVisible();
  await page.goto('./clubs');
  await expect(page.getByText('No clubs added')).toBeVisible();
});

test('mixed-brand partial iron set (5, 7, 8, 9 — no 6) and a fully custom club', async ({ page }) => {
  await exploreEmpty(page);
  await page.goto('./clubs/iron-set');
  for (const n of [5, 7, 8, 9]) await page.getByTestId(`iron-number-${n}`).click();
  await page.getByTestId('set-brand').fill('Example Maker A');
  await page.getByTestId('create-iron-set').click();
  await expect(page.getByTestId('owned-count')).toHaveText('4 clubs owned');
  await expect(page.getByText('6-iron', { exact: true })).toHaveCount(0);

  // Replace the brand on the 7-iron only.
  await page.getByRole('button', { name: /^7-iron\./ }).click();
  await expect(page.getByLabel('Brand for selected 7-iron')).toHaveValue('Example Maker A');
  await page.getByTestId('brand').fill('Example Maker B');
  await page.getByTestId('save-changes').click();
  await expect(page.getByTestId('form-status')).toHaveText('Saved.');
  await page.goto('./clubs');
  await expect(page.getByRole('button', { name: /^7-iron\. Example Maker B/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^8-iron\. Example Maker A/ })).toBeVisible();

  // Fully custom club.
  await page.goto('./clubs/catalogue');
  await addClubFromTile(page, 'custom', { customName: 'Training club', brand: 'Example Maker F', addToBag: true });
  await page.goto('./bag');
  await expect(page.getByTestId('bag-count')).toHaveText('1 / 14 in bag');
  await expect(page.getByLabel('Remove Training club (Example Maker F) from bag')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Remove Training club (Example Maker F) from bag')).toBeVisible();
});
