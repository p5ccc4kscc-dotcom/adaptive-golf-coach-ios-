// Copies the sql.js WebAssembly build into public/ so the browser preview can
// load SQLite without a CDN. The native app uses expo-sqlite instead.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'sql.js', 'dist');
const dest = join(root, 'public', 'vendor', 'sqljs');

if (!existsSync(src)) {
  console.warn('[copy-sqljs] sql.js not installed; skipping.');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const file of ['sql-wasm.js', 'sql-wasm.wasm']) {
  copyFileSync(join(src, file), join(dest, file));
}
console.log('[copy-sqljs] copied sql.js browser build to public/vendor/sqljs');
