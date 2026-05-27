import { test, expect } from '@playwright/test';

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

test.describe('QA-102 | QA Intelligence Dashboard | Smoke', () => {
  test('dashboard key sections are visible', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(page.locator('#releaseStatus')).toBeVisible();
    await expect(page.locator('#totalTests')).toBeVisible();
    await expect(page.locator('#failedTests')).toBeVisible();
    await expect(page.locator('#coverageGaps')).toBeVisible();
    await expect(page.locator('#aiSummary')).toBeVisible();
  });

  test('dashboard displays valid release and metric data', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(page.locator('#releaseStatus')).toContainText(/LOW RISK|MEDIUM RISK|HIGH RISK|UNKNOWN RISK/);
    await expect(page.locator('#releaseStatus')).toContainText(/safe_to_release|release_with_caution|do_not_release|unknown/);

    await expect(page.locator('#totalTests')).toContainText(/^\d+$/);
    await expect(page.locator('#failedTests')).toContainText(/^\d+$/);
    await expect(page.locator('#coverageGaps')).toContainText(/^\d+$/);

    await expect(page.locator('#aiSummary')).not.toHaveText(/No AI summary found/i);
  });
});