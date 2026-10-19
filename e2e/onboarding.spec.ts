import { expect, test } from '@playwright/test';

import { addClubFromTile, shot } from './helpers';

/**
 * FICTIONAL golfer (Scenario A): left-handed beginner with a partial,
 * mixed-brand bag. Nothing here resembles any real person's data.
 */
test('Scenario A: first-time left-handed golfer completes onboarding, builds a bag, data survives relaunch', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Welcome', { exact: true })).toBeVisible();
  await shot(page, '01-welcome');
  await page.getByTestId('get-started').click();

  // Step 2: about your golf — nothing pre-selected.
  await expect(page.getByTestId('step-experience')).toBeVisible();
  for (const hand of ['right', 'left', 'prefer_not_to_say', 'not_sure']) {
    await expect(page.getByTestId(`hand-${hand}`)).toHaveAttribute('aria-checked', 'false');
  }
  await expect(page.getByTestId('display-name')).toHaveValue('');
  await page.getByTestId('display-name').fill('Test Golfer Alpha');
  await page.getByTestId('hand-left').click();
  await page.getByTestId('ability-beginner').click();
  await shot(page, '02-about-your-golf');
  await page.getByTestId('save-continue').click();

  // Step 3: comfort — skipped.
  await expect(page.getByTestId('step-comfort')).toBeVisible();
  await page.getByTestId('skip').click();

  // Step 4: tendencies & goals — wording mirrors for a left-handed golfer.
  await expect(page.getByTestId('step-goals')).toBeVisible();
  await expect(page.getByText('For you: curves to the left')).toBeVisible();
  await page.getByTestId('challenge-slice_right').click();
  await page.getByTestId('goal-text').fill('Keep tee shots playable');
  await page.getByTestId('goal-measure').fill('12 of 20 range drives playable');
  await page.getByTestId('add-goal').click();
  await expect(page.getByText('1. Keep tee shots playable')).toBeVisible();
  await page.getByTestId('save-continue').click();

  // Step 5: practice — skipped.
  await expect(page.getByTestId('step-practice')).toBeVisible();
  await page.getByTestId('skip').click();

  // Step 6: clubs — starts empty.
  await expect(page.getByTestId('step-clubs')).toBeVisible();
  await expect(page.getByTestId('clubs-step-summary')).toHaveText('No clubs added yet');
  await shot(page, '03-club-face-gallery');
  await page.getByTestId('tile-iron_7').click();
  await expect(page.getByLabel('Brand for selected 7-iron')).toBeVisible();
  await expect(page.getByTestId('brand')).toHaveValue('');
  await page.getByTestId('brand').fill('Example Maker C');
  await page.getByTestId('model').fill('Series 7');
  await shot(page, '04-add-club-brand-model');
  await page.getByTestId('save-add-bag').click();
  await expect(page.getByTestId('step-clubs')).toBeVisible();

  await addClubFromTile(page, 'driver', { brand: 'Example Maker A', model: 'Model One', addToBag: true });
  await addClubFromTile(page, 'hybrid_5', { brand: 'Example Maker B', addToBag: true });
  await addClubFromTile(page, 'iron_9', { addToBag: true });
  await addClubFromTile(page, 'wedge_sw', { brand: 'Example Maker D', addToBag: true });
  await addClubFromTile(page, 'putter', { brand: 'Example Maker E', addToBag: false });
  await expect(page.getByTestId('clubs-step-summary')).toHaveText('6 clubs in My Clubs');
  await expect(page.getByText('5 / 14 in bag')).toBeVisible();
  await page.getByTestId('save-continue').click();

  // Step 7: baseline — a nine-hole round with putts not counted.
  await expect(page.getByTestId('step-baseline')).toBeVisible();
  await page.getByTestId('round-date').fill('2025-06-01');
  await page.getByTestId('round-holes-9').click();
  await page.getByTestId('round-score').fill('52');
  await page.getByTestId('add-round').click();
  await expect(page.getByText(/9 holes · 52 · putts not recorded/)).toBeVisible();
  await page.getByTestId('save-continue').click();

  // Step 8: review shows exactly what was entered and flags the rest.
  await expect(page.getByTestId('step-review')).toBeVisible();
  const about = page.getByTestId('summary-experience');
  await expect(about.getByText('Test Golfer Alpha')).toBeVisible();
  await expect(about.getByText('Left-handed')).toBeVisible();
  await expect(page.getByTestId('summary-comfort').getByText('Not answered yet').first()).toBeVisible();
  await expect(page.getByTestId('summary-clubs').getByText('6 owned · 5 / 14 in bag')).toBeVisible();
  const plan = page.getByTestId('starter-plan');
  await expect(plan.getByText('Start line and curve log — with your Driver')).toBeVisible();
  await expect(plan.getByText(/add a putter to My Bag/)).toBeVisible();
  await shot(page, '05-review');
  await page.getByTestId('finish-setup').click();

  await expect(page.getByText('Hello, Test Golfer Alpha')).toBeVisible();
  await expect(page.getByTestId('today-bag-count')).toHaveText('My Bag: 5 / 14 in bag · 6 owned');
  await shot(page, '06-today');

  // Relaunch: everything persists.
  await page.reload();
  await expect(page.getByText('Hello, Test Golfer Alpha')).toBeVisible();
  await expect(page.getByTestId('today-bag-count')).toHaveText('My Bag: 5 / 14 in bag · 6 owned');

  await page.goto('/clubs');
  await expect(page.getByTestId('owned-count')).toHaveText('6 clubs owned');
  await expect(page.getByText('Example Maker C · Series 7 · Loft not entered')).toBeVisible();
  await expect(page.getByText('Brand not entered · Loft not entered')).toBeVisible();
  await expect(page.getByLabel('Add Putter (Example Maker E) to bag')).toBeVisible();
  await shot(page, '07-my-clubs');
});

test('onboarding resumes at the same step after relaunch, and fully skipped onboarding stays blank', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('get-started').click();
  await page.getByTestId('skip').click();
  await expect(page.getByTestId('step-comfort')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('step-comfort')).toBeVisible();
  await expect(page.getByText('Step 3 of 8')).toBeVisible();
  for (let i = 0; i < 5; i++) await page.getByTestId('skip').click();
  await expect(page.getByTestId('step-review')).toBeVisible();
  await expect(page.getByTestId('summary-experience').getByText('Not answered yet').first()).toBeVisible();
  await expect(page.getByTestId('summary-clubs').getByText('0 owned · 0 / 14 in bag')).toBeVisible();
  await expect(page.getByTestId('starter-plan').getByText(/Posture and alignment awareness/)).toBeVisible();
  await page.getByTestId('finish-setup').click();
  await expect(page.getByText('Today', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('today-bag-count')).toHaveText('My Bag: 0 / 14 in bag · 0 owned');
});

test('explore with an empty profile shows no invented data and a gentle setup card', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('explore-empty').click();
  await expect(page.getByTestId('finish-setup-card')).toBeVisible();
  await expect(page.getByTestId('today-bag-count')).toHaveText('My Bag: 0 / 14 in bag · 0 owned');
  await page.goto('/analyse');
  await expect(page.getByText(/Not available yet · M1/)).toBeVisible();
  await page.goto('/game');
  await expect(page.getByTestId('my-game')).toBeVisible();
});
