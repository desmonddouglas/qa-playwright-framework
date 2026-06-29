import { test, expect, Page } from '@playwright/test';

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

async function gotoDashboard(page: Page) {
  await page.goto(DASHBOARD_URL);

  await expect(page.getByTestId('ai-summary')).toBeVisible();
  await expect(page.locator('#aiSummary')).not.toContainText('Loading...');
  await expect(page.locator('#aiSummary')).not.toContainText(/No AI summary found/i);
}

test.describe('QA-104 | AI QA Summary | Smoke', () => {
  test('AI summary section is visible and populated', async ({ page }) => {
    await gotoDashboard(page);

    const summarySection = page.getByTestId('ai-summary');
    const summary = page.locator('#aiSummary');

    await expect(summarySection).toBeVisible();
    await expect(summary).toBeVisible();
    await expect(summary).not.toHaveText('');
  });

  test('AI summary displays key summary sections', async ({ page }) => {
    await gotoDashboard(page);

    const summary = page.locator('#aiSummary');

    await expect(summary).toContainText(/Generated:/i);
    await expect(summary).toContainText(/Overall Status/i);
    await expect(summary).toContainText(/Key Signals/i);
  });
});