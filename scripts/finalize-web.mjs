// Post-processes the exported web build in dist/:
// - fills %BASE_URL% in index.html with EXPO_BASE_URL ('' for a root build, e.g. '/adaptive-golf-coach-ios-' for Pages);
// - with --spa-fallback, copies index.html to 404.html so GitHub Pages serves deep links.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
const file = 'dist/index.html';
const html = readFileSync(file, 'utf8');
if (!html.includes('%BASE_URL%')) throw new Error('dist/index.html has no %BASE_URL% placeholder; was public/index.html used?');
writeFileSync(file, html.replaceAll('%BASE_URL%', base));
if (process.argv.includes('--spa-fallback')) copyFileSync(file, 'dist/404.html');
console.log(`finalize-web: base URL "${base || '/'}"`);
