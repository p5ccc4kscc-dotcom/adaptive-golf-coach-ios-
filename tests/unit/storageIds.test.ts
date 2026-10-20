import { STORAGE_IDS } from '@/data/db/storageIds';

/**
 * Data preservation (M0.1): the product was renamed to BadGolfer, but the
 * places where golfers' data already lives must not move. If this test fails,
 * existing browser-preview data and iPhone databases would no longer be found.
 */
describe('storage identifiers survive the BadGolfer rename', () => {
  it('keeps the IndexedDB name, SQLite file name and export format tag', () => {
    expect(STORAGE_IDS).toEqual({
      indexedDbName: 'adaptive-golf-coach',
      sqliteFileName: 'adaptive-golf-coach.db',
      exportFormat: 'adaptive-golf-coach-export',
    });
  });
});
