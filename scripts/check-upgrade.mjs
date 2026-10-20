// Upgrade check: data saved by an OLD web build must still be there, unchanged, in a NEW build
// served from the same origin (as happens when GitHub Pages is redeployed).
//   node scripts/check-upgrade.mjs <old-dist> <new-dist>
// Both builds must be Pages-style exports for BASE_PATH (default /adaptive-golf-coach-ios-).
// Uses only fictional data.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const [oldDist, newDist] = process.argv.slice(2);
if (!oldDist || !newDist) throw new Error('usage: node scripts/check-upgrade.mjs <old-dist> <new-dist>');
const base = process.env.BASE_PATH ?? '/adaptive-golf-coach-ios-';
const url = (p = '') => `http://localhost:8081${base}/${p}`;

async function serve(dist) {
  const child = spawn('node', ['scripts/serve-dist.mjs'], { env: { ...process.env, DIST: dist, BASE_PATH: base }, stdio: 'ignore' });
  await sleep(800);
  return child;
}
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
  if (!ok) process.exitCode = 1;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
let server = await serve(oldDist);
let page = await ctx.newPage();

// 1. Enter data with the old build.
await page.goto(url());
await page.getByTestId('get-started').click();
await page.getByTestId('display-name').fill('Test Golfer Upgrade');
await page.getByTestId('hand-left').click();
await page.getByTestId('save-continue').click();
await page.getByTestId('skip').click();
await page.getByTestId('challenge-slice_right').click();
await page.getByTestId('goal-text').fill('Fictional goal for upgrade test');
await page.getByTestId('add-goal').click();
await page.getByText('1. Fictional goal for upgrade test').waitFor();
await page.getByTestId('save-continue').click();
await page.getByTestId('skip').click();
for (const [code, brand, model, bag] of [['driver', 'Example Maker A', 'Model One', true], ['iron_7', 'Example Maker B', 'Series 7', true], ['putter', 'Example Maker C', '', false]]) {
  await page.getByTestId(`tile-${code}`).click();
  await page.getByTestId('brand').fill(brand);
  if (model) await page.getByTestId('model').fill(model);
  await page.getByTestId(bag ? 'save-add-bag' : 'save-clubs-only').click();
  await page.getByTestId('add-club-screen').waitFor({ state: 'detached' });
}
await page.getByTestId('save-continue').click();
await page.getByTestId('round-date').fill('2025-05-04');
await page.getByTestId('round-holes-9').click();
await page.getByTestId('round-score').fill('50');
await page.getByTestId('add-round').click();
await page.getByText(/9 holes · 50/).waitFor();
await page.getByTestId('save-continue').click();
await page.getByTestId('finish-setup').click();
await page.goto(url('bag'));
await page.getByTestId('new-preset').click();
await page.getByTestId('new-preset-name').fill('Par-3');
await page.getByTestId('new-start-empty').click();
await page.getByTestId('create-preset').click();
await page.getByTestId('bag-count').filter({ hasText: '0 / 14' }).waitFor();
await page.getByRole('radio', { name: /^My Bag/ }).click();
await page.getByTestId('bag-count').filter({ hasText: '2 / 14' }).waitFor();
await page.close();
server.kill();
await sleep(300);

// 2. Redeploy: same origin, new build.
server = await serve(newDist);
page = await ctx.newPage();
await page.goto(url('today'));
await page.getByTestId('today').waitFor();
// The page must be running the NEW build's JavaScript bundle (compared by its content-hashed
// file name; old and new can share a title, e.g. after a merge to main).
const bundleOf = (html) => html.match(/_expo\/static\/js\/web\/entry-[0-9a-f]+\.js/)?.[0] ?? null;
const expected = bundleOf(readFileSync(`${newDist}/index.html`, 'utf8'));
const served = bundleOf(await page.content());
check(expected !== null && served === expected, `new build is being served (bundle ${served ?? 'none'})`);
check(await page.getByText('Hello, Test Golfer Upgrade').isVisible(), 'profile name kept');
check(await page.getByText('Fictional goal for upgrade test').isVisible(), 'goal kept');
await page.goto(url('clubs'));
await page.getByTestId('owned-count').waitFor();
check((await page.getByTestId('owned-count').textContent()) === '3 clubs owned', 'all 3 clubs kept');
check(await page.getByText('Example Maker A · Model One', { exact: true }).isVisible(), 'driver brand and model kept');
check(await page.getByText('Example Maker B · Series 7', { exact: true }).isVisible(), '7-iron brand and model kept');
check(await page.getByText('Example Maker C', { exact: true }).isVisible(), 'putter brand kept');
await page.goto(url('bag'));
await page.getByTestId('bag-count').waitFor();
check((await page.getByTestId('bag-count').textContent()) === '2 / 14 in bag', 'active bag membership kept (2 / 14)');
check(await page.getByRole('radio', { name: /^Par-3/ }).isVisible(), 'second bag setup "Par-3" kept');
await page.goto(url('game'));
await page.getByTestId('my-game').waitFor();
check(await page.getByTestId('summary-experience').getByText('Left-handed').isVisible(), 'playing hand kept');
check(await page.getByTestId('summary-goals').getByText('Slice — curves to the left').isVisible(), 'challenge kept, now worded for the left-handed golfer');
await page.goto(url('rounds'));
await page.getByTestId('rounds').waitFor();
check(await page.getByText(/9 holes · score 50/).waitFor({ timeout: 5000 }).then(() => true, () => false), 'baseline round kept');

await browser.close();
server.kill();
