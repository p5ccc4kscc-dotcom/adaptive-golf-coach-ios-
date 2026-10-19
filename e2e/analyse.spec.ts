import { expect, test } from './fixtures';
import { exploreEmpty } from './helpers';

/** The browser preview has no Apple Vision: the Analyse tab must say so and offer no analysis. */
test('Analyse in the browser explains it is iPhone-only and shows no analysis or import', async ({ page }) => {
  await exploreEmpty(page);
  await page.goto('./analyse');
  await expect(page.getByText(/cannot run in this browser preview/)).toBeVisible();
  await expect(page.getByTestId('import-video')).toHaveCount(0);
  await expect(page.getByTestId('pose-viewer')).toHaveCount(0);
  await page.getByTestId('not-measurable').click();
  await expect(page.getByText(/Clubface angle, Club path, Face-to-path/)).toBeVisible();

  // A deep link to a video screen also shows the explanation, never a mock result.
  await page.goto('./analyse/does-not-exist');
  await expect(page.getByText(/cannot run in this browser preview/)).toBeVisible();
  await expect(page.getByTestId('measurements')).toHaveCount(0);
});
