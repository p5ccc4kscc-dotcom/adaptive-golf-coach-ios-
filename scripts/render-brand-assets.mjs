// Renders the BadGolfer icon set from assets/brand/*.svg using the Playwright Chromium.
// Run: node scripts/render-brand-assets.mjs   (outputs are committed; rerun after editing the SVGs)
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const mark = readFileSync('assets/brand/mark.svg', 'utf8');
const icon = readFileSync('assets/brand/icon.svg', 'utf8').replace('<!-- MARK -->', mark);
const svg = (inner, { scale = 1, bg = null } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}` +
  `<g transform="translate(${512 - 512 * scale} ${512 - 512 * scale}) scale(${scale})">${inner}</g></svg>`;
const mono = mark.replaceAll('#C6F15A', '#FFFFFF').replaceAll('#D7E2DB', 'none');

const outputs = [
  // iOS: opaque, full-bleed square; iOS applies the rounded mask.
  { file: 'assets/icon.png', size: 1024, svg: icon },
  { file: 'assets/favicon.png', size: 48, svg: icon },
  { file: 'public/apple-touch-icon.png', size: 180, svg: icon },
  { file: 'public/icon-192.png', size: 192, svg: icon },
  { file: 'public/icon-512.png', size: 512, svg: icon },
  { file: 'assets/splash-icon.png', size: 512, svg: svg(mark, { scale: 0.9 }), transparent: true },
  // Android adaptive icon: the mark inside the 66% safe zone.
  { file: 'assets/android-icon-foreground.png', size: 512, svg: svg(mark, { scale: 0.62 }), transparent: true },
  { file: 'assets/android-icon-background.png', size: 512, svg: svg('', { bg: '#0A3A28' }) },
  { file: 'assets/android-icon-monochrome.png', size: 512, svg: svg(mono, { scale: 0.62 }), transparent: true },
];

const browser = await chromium.launch();
for (const o of outputs) {
  const page = await browser.newPage({ viewport: { width: o.size, height: o.size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${o.svg.replace('<svg ', `<svg width="${o.size}" height="${o.size}" `)}</body></html>`,
  );
  await page.screenshot({ path: o.file, omitBackground: !!o.transparent, clip: { x: 0, y: 0, width: o.size, height: o.size } });
  await page.close();
  console.log('wrote', o.file);
}
await browser.close();
