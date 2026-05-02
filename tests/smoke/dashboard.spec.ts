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

test('dashboard shows correct QA metrics', async ({ page }) => {
  await page.goto('https://desmonddouglas.github.io/qa-playwright-framework/');

  // Validate release status
  const releaseStatus = page.locator('#releaseStatus');
  await expect(releaseStatus).toContainText(/LOW RISK|MEDIUM RISK|HIGH RISK/);
  await expect(releaseStatus).toContainText(/safe_to_release|release_with_caution|do_not_release/);

  // Validate numeric values are present
  const totalTests = await page.locator('#totalTests').textContent();
  const failedTests = await page.locator('#failedTests').textContent();
  const coverageGaps = await page.locator('#coverageGaps').textContent();

  expect(Number(totalTests)).toBeGreaterThanOrEqual(0);
  expect(Number(failedTests)).toBeGreaterThanOrEqual(0);
  expect(Number(coverageGaps)).toBeGreaterThanOrEqual(0);

  // AI summary should not be empty
  await expect(page.locator('#aiSummary')).not.toHaveText('No AI summary found.');
});