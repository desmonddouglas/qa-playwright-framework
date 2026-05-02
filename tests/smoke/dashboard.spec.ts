import { test, expect } from '@playwright/test';

test('dashboard displays QA intelligence summary', async ({ page }) => {
  await page.goto('https://desmonddouglas.github.io/qa-playwright-framework/');

  await expect(page.locator('#releaseStatus')).toBeVisible();
  await expect(page.locator('#totalTests')).toBeVisible();
  await expect(page.locator('#failedTests')).toBeVisible();
  await expect(page.locator('#coverageGaps')).toBeVisible();
  await expect(page.locator('#aiSummary')).toBeVisible();
});

test('dashboard shows release recommendation', async ({ page }) => {
  await page.goto('https://desmonddouglas.github.io/qa-playwright-framework/');

  await expect(page.locator('#releaseStatus')).toContainText(/LOW RISK|MEDIUM RISK|HIGH RISK/);
  await expect(page.locator('#releaseStatus')).toContainText(/safe_to_release|release_with_caution|do_not_release/);
});