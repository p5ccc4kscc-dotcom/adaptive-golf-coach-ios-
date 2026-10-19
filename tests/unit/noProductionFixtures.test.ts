import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the "no hidden personal sample data" rule: production code under
 * src/ must not reference test fixtures or fixture-like personal data.
 */
const SRC = join(__dirname, '..', '..', 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('production source contains no test fixtures or seeded golfer data', () => {
  const sources = files(SRC).map((p) => ({ p, text: readFileSync(p, 'utf8') }));

  it('scans a non-trivial number of files', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it.each(['Example Maker', 'Test Golfer', 'FICTIONAL-TEST-FIXTURE', 'fictionalGolfers', '/tests/'])('does not contain %s', (needle) => {
    const offenders = sources.filter((s) => s.text.includes(needle)).map((s) => s.p);
    expect(offenders).toEqual([]);
  });
});
