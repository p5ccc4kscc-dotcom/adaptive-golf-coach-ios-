// Minimal static server for the exported web build. Used by the Playwright
// end-to-end tests and for local inspection.
//   DIST=dist BASE_PATH=/adaptive-golf-coach-ios- PORT=8081 node scripts/serve-dist.mjs
// With BASE_PATH set it behaves like GitHub Pages: files are served under the
// sub-path, and unknown paths get 404.html (which the Pages build copies from index.html).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), process.env.DIST ?? 'dist');
const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
const port = Number(process.env.PORT ?? 8081);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};

createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (base) {
    if (urlPath === '/') {
      res.writeHead(302, { Location: `${base}/` }).end();
      return;
    }
    if (!urlPath.startsWith(base)) {
      res.writeHead(404).end('Not found');
      return;
    }
    urlPath = urlPath.slice(base.length) || '/';
  }
  let file = normalize(join(root, urlPath));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  let status = 200;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    const notFound = join(root, '404.html');
    if (base && existsSync(notFound)) {
      file = notFound;
      status = 404;
    } else {
      file = join(root, 'index.html');
    }
  }
  res.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}${base}/`));
