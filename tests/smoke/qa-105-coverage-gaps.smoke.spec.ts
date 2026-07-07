import { test, expect, Page } from '@playwright/test';

/**
 * QA-105: User can view Coverage Gaps
 *
 * As a quality leader, I want to view coverage gaps on the dashboard
 * so that I can identify areas of the product that lack sufficient test coverage.
 *
 * Suite: Smoke
 *
 * Selector strategy:
 *   getByTestId('coverage-gaps')        → metric card wrapper div
 *   getByTestId('coverage-gaps-panel')  → detail article panel
 *   #coverageGaps                       → <strong> value written by app.js
 *   #coverageList                       → <ul> list written by app.js
 *
 * ⚠️ REQUIRES HUMAN REVIEW before merging.
 */

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

async function gotoDashboard(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);
  await expect(page.getByTestId('coverage-gaps-panel')).toBeVisible();
  await expect(page.locator('#coverageGaps')).not.toHaveText('--');
  await expect(page.locator('#coverageList')).not.toContainText('Loading...');
}

test.describe('QA-105 | Coverage Gaps | Smoke', () => {

  test('coverage gaps metric card is visible and shows a count', async ({ page }) => {
    await gotoDashboard(page);

    await expect(page.getByTestId('coverage-gaps')).toBeVisible();
    await expect(page.locator('#coverageGaps')).toContainText(/^\d+$/);
  });

  test('coverage gaps detail panel is visible and contains list items', async ({ page }) => {
    await gotoDashboard(page);

    await expect(page.getByTestId('coverage-gaps-panel')).toBeVisible();
    await expect(page.locator('#coverageList')).toBeVisible();
    await expect(page.locator('#coverageList li').first()).toBeVisible();
  });

});