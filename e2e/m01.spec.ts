import { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { addClubFromTile, exploreEmpty } from './helpers';

/** M0.1: branding, hand-specific wording, feature status and iPhone layout checks (Chromium, not Safari). */

test('BadGolfer branding: page title, Home Screen name and icons are served', async ({ page, request, baseURL }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('BadGolfer');
  await expect(page.getByRole('heading', { name: 'BadGolfer. Get Better.' })).toBeVisible();
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'BadGolfer');
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  for (const href of [touchIcon, manifest]) {
    const res = await request.get(new URL(href!, baseURL).toString());
    expect(res.status(), href!).toBe(200);
  }
  const json = await (await request.get(new URL(manifest!, baseURL).toString())).json();
  expect(json.name).toBe('BadGolfer');
});

test('slice and hook wording follows the playing hand, and changes when the hand changes', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('get-started').click();
  await page.getByTestId('hand-right').click();
  await page.getByTestId('save-continue').click();
  await expect(page.getByTestId('step-comfort')).toBeVisible();
  await page.getByTestId('skip').click();
  await expect(page.getByTestId('step-goals')).toBeVisible();
  await expect(page.getByTestId('challenge-slice_right')).toHaveText('Slice — curves to the right');
  await expect(page.getByTestId('challenge-hook_left')).toHaveText('Hook — curves to the left');
  await expect(page.getByText(/left-hander|right-hander/)).toHaveCount(0);
  await page.getByTestId('challenge-slice_right').click();
  await page.getByTestId('save-continue').click();
  // Navigating before the save finishes would abandon it; wait for the next step.
  await expect(page.getByTestId('step-practice')).toBeVisible();

  // Change to left-handed later: explanations follow.
  await page.goto('./profile/experience');
  await page.getByTestId('hand-left').click();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('my-game')).toBeVisible();
  await page.goto('./profile/goals');
  await expect(page.getByTestId('challenge-slice_right')).toHaveText('✓ Slice — curves to the left');
  await expect(page.getByTestId('challenge-push')).toHaveText('Push — starts left of target, little curve');

  // Unknown hand: nothing is guessed; both directions are explained.
  await page.goto('./profile/experience');
  await page.getByTestId('hand-not_sure').click();
  await page.getByTestId('save').click();
  await expect(page.getByTestId('my-game')).toBeVisible();
  await page.goto('./profile/goals');
  await expect(page.getByTestId('challenge-slice_right')).toHaveText('✓ Slice — curves right for a right-hander, left for a left-hander');
  await page.goto('./game');
  await expect(page.getByTestId('summary-goals').getByText(/Slice — curves right for a right-hander/)).toBeVisible();
});

test('unfinished features are labelled as planned, never as available', async ({ page }) => {
  await exploreEmpty(page);
  await page.getByTestId('today-feature-status').click();
  await expect(page.getByTestId('feature-swing_analysis').getByText('Experimental · M1a')).toBeVisible();
  await expect(page.getByTestId('feature-backup').getByText('Planned · M4')).toBeVisible();
  await expect(page.getByTestId('feature-coaching').getByText('Planned · M2')).toBeVisible();
  await page.goto('./settings');
  await expect(page.getByTestId('feature-status').getByText('Available')).toHaveCount(4);
  await expect(page.getByTestId('sync-status')).toContainText('Nothing is backed up');
});

const VIEWPORTS = [
  { name: 'iPhone SE (375×667)', width: 375, height: 667 },
  { name: 'iPhone 13 (390×844)', width: 390, height: 844 },
  { name: 'iPhone Pro Max (430×932)', width: 430, height: 932 },
  { name: 'iPhone SE landscape (667×375)', width: 667, height: 375 },
];

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const w = window.innerWidth;
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && (r.right > w + 1 || r.left < -1);
      })
      .map((el) => `${el.tagName}[${el.getAttribute('data-testid') ?? ''}] ${(el.textContent ?? '').slice(0, 40)}`)
      .slice(0, 5);
  });
  expect(overflow, 'elements wider than the screen').toEqual([]);
}

/** Every visible control is at least 44 × 44 pt. */
async function tapTargetsOk(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('[role="button"],[role="checkbox"],[role="radio"],[role="switch"],[role="tab"],a[href],input')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && (r.width < 43.5 || r.height < 43.5))
      .map(({ el, r }) => `${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small, 'controls smaller than 44 × 44').toEqual([]);
}

/** Scrolls the screen to the end and checks the last content is above the tab bar, not hidden behind it. */
async function lastContentClearOfTabBar(page: Page, screenTestId: string) {
  const scroller = page.getByTestId(`${screenTestId}-scroll`);
  await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(200);
  const tabBar = page.getByRole('tablist').or(page.locator('[role="tablist"]')).first();
  const bar = await tabBar.boundingBox();
  expect(bar, 'tab bar visible').not.toBeNull();
  const vh = page.viewportSize()!.height;
  expect(bar!.y + bar!.height).toBeLessThanOrEqual(vh + 1);
  const lastBottom = await scroller.evaluate((el) => {
    const inner = el.firstElementChild?.firstElementChild ?? el;
    const last = inner.lastElementChild ?? inner;
    return last.getBoundingClientRect().bottom;
  });
  expect(lastBottom).toBeLessThanOrEqual(bar!.y + 1);
}

for (const vp of VIEWPORTS) {
  test.describe(`layout at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('tab screens: compact title, no overflow, tab bar visible, nothing hidden behind it, 44 pt targets', async ({ page }) => {
      await exploreEmpty(page);
      await page.goto('./clubs/catalogue');
      for (const code of ['driver', 'iron_7', 'putter']) await addClubFromTile(page, code, { brand: 'Example Maker A', model: 'Model One', addToBag: true });
      for (const [path, id] of [['./today', 'today'], ['./game', 'my-game'], ['./analyse', 'analyse'], ['./learn', 'learn'], ['./rounds', 'rounds']] as const) {
        await page.goto(path);
        await expect(page.getByTestId(id)).toBeVisible();
        // A single, compact header: the in-screen title only (no navigator header above it).
        await expect(page.getByTestId('web-header')).toHaveCount(0);
        const header = await page.getByTestId(id).getByTestId('screen-header').boundingBox();
        expect(header!.height).toBeLessThanOrEqual(vp.height < 500 ? 80 : 80);
        await noHorizontalOverflow(page);
        await tapTargetsOk(page);
        await lastContentClearOfTabBar(page, id);
      }
    });

    test('stack screens: compact header with Back, no overflow, last item reachable, 44 pt targets', async ({ page }) => {
      await exploreEmpty(page);
      await page.goto('./clubs/catalogue');
      await addClubFromTile(page, 'iron_9', { brand: 'Example Maker B', addToBag: true });
      for (const [path, id] of [['./bag', 'build-my-bag'], ['./clubs', 'my-clubs'], ['./settings', 'settings'], ['./clubs/catalogue', 'club-catalogue']] as const) {
        await page.goto(path);
        await expect(page.getByTestId(id)).toBeVisible();
        const header = await page.getByTestId('web-header').boundingBox();
        expect(header!.height).toBeLessThanOrEqual(49);
        await expect(page.getByTestId('header-back')).toBeVisible();
        await noHorizontalOverflow(page);
        await tapTargetsOk(page);
        const scroller = page.getByTestId(`${id}-scroll`);
        await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
        const lastBottom = await scroller.evaluate((el) => (el.firstElementChild?.firstElementChild?.lastElementChild ?? el).getBoundingClientRect().bottom);
        expect(lastBottom).toBeLessThanOrEqual(vp.height + 1);
      }
      // Back without history (page opened directly) goes somewhere sensible instead of doing nothing.
      await page.goto('./bag');
      await page.getByTestId('header-back').click();
      await expect(page.getByTestId('my-game')).toBeVisible();
    });
  });
}
