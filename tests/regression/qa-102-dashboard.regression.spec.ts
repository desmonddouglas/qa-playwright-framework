import { test, expect } from '@playwright/test';

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

test.describe('QA-102 | QA Intelligence Dashboard | Regression', () => {
  test('dashboard displays expected metric values as numbers', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
  
    await expect(page.locator('#totalTests')).toContainText(/^\d+$/);
    await expect(page.locator('#failedTests')).toContainText(/^\d+$/);
    await expect(page.locator('#flakyTests')).toContainText(/^\d+$/);
    await expect(page.locator('#coverageGaps')).toContainText(/^\d+$/);
  });

  test('dashboard displays release risk details', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(page.locator('#riskScore')).toBeVisible();
    await expect(page.locator('#riskLevel')).toBeVisible();
    await expect(page.locator('#releaseRecommendation')).toBeVisible();

    await expect(page.locator('#riskLevel')).toContainText(/low|medium|high|unknown/i);
    await expect(page.locator('#releaseRecommendation')).toContainText(
      /safe_to_release|release_with_caution|do_not_release|unknown/i
    );
  });

  test('dashboard displays coverage and maintenance sections', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(page.locator('#coverageList')).toBeVisible();
    await expect(page.locator('#maintenanceList')).toBeVisible();

    await expect(page.locator('#coverageList')).not.toHaveText('');
    await expect(page.locator('#maintenanceList')).not.toHaveText('');
  });

  test('dashboard displays AI summary content', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    const aiSummary = page.locator('#aiSummary');

    await expect(aiSummary).toBeVisible();
    await expect(aiSummary).not.toHaveText(/No AI summary found/i);
    await expect(aiSummary).toContainText(/Overall Status|Key Signals|Release Risk|Generated/i);
  });
});