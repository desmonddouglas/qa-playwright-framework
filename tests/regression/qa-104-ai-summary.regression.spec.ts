import { test, expect, Page } from '@playwright/test';

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

const VALID_RISK_LEVELS = ['low', 'medium', 'high', 'unknown'];
const VALID_RECOMMENDATIONS = [
  'safe_to_release',
  'release_with_caution',
  'do_not_release',
  'unknown',
];

async function gotoDashboard(page: Page) {
  await page.goto(DASHBOARD_URL);

  await expect(page.getByTestId('ai-summary')).toBeVisible();
  await expect(page.locator('#aiSummary')).not.toContainText('Loading...');
  await expect(page.locator('#aiSummary')).not.toContainText(/No AI summary found/i);
}

async function getSummaryText(page: Page): Promise<string> {
  const summary = page.locator('#aiSummary');
  await expect(summary).toBeVisible();

  return (await summary.textContent())?.trim() ?? '';
}

test.describe('QA-104 | AI QA Summary | Regression', () => {
  test('AI summary contains all expected sections', async ({ page }) => {
    await gotoDashboard(page);

    const summary = page.locator('#aiSummary');

    await expect(summary).toContainText(/Overall Status/i);
    await expect(summary).toContainText(/Key Signals/i);
    await expect(summary).toContainText(/Risk Drivers/i);
    await expect(summary).toContainText(/Recommended Next Steps/i);
  });

  test('AI summary key signals include core metrics', async ({ page }) => {
    await gotoDashboard(page);

    const summary = page.locator('#aiSummary');

    await expect(summary).toContainText(/Total Tests/i);
    await expect(summary).toContainText(/Failed Tests/i);
    await expect(summary).toContainText(/Release Risk Score/i);
    await expect(summary).toContainText(/Release Risk Level/i);
    await expect(summary).toContainText(/Release Recommendation/i);
  });

  test('AI summary includes valid release risk values', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);

    const riskLevelMatch = summaryText.match(/Release Risk Level:\s*(low|medium|high|unknown)/i);
    const recommendationMatch = summaryText.match(
      /Release Recommendation:\s*(safe_to_release|release_with_caution|do_not_release|unknown)/i
    );

    expect(riskLevelMatch, 'Release Risk Level should be present and valid').toBeTruthy();
    expect(recommendationMatch, 'Release Recommendation should be present and valid').toBeTruthy();

    expect(VALID_RISK_LEVELS).toContain(riskLevelMatch![1].toLowerCase());
    expect(VALID_RECOMMENDATIONS).toContain(recommendationMatch![1]);
  });

  test('AI summary includes numeric total test count', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const totalTestsMatch = summaryText.match(/Total Tests:\s*(\d+)/i);

    expect(totalTestsMatch, 'Total Tests count should be present and numeric').toBeTruthy();
    expect(Number(totalTestsMatch![1])).toBeGreaterThanOrEqual(0);
  });

  test('AI summary generated timestamp contains a date', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const timestampMatch = summaryText.match(/Generated:\s*\d{1,2}\/\d{1,2}\/\d{4}/i);

    expect(timestampMatch, 'Generated timestamp should contain a recognizable date').toBeTruthy();
  });

  test('AI summary does not display broken or fallback text', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);

    expect(summaryText).not.toMatch(/No AI summary found/i);
    expect(summaryText).not.toMatch(/Loading\.\.\./i);
    expect(summaryText).not.toMatch(/\bundefined\b/i);
    expect(summaryText).not.toMatch(/\bnull\b/i);
    expect(summaryText).not.toMatch(/\bNaN\b/i);
    expect(summaryText).not.toMatch(/failed to load/i);
    expect(summaryText).not.toMatch(/No AI summary found/i);    
    expect(summaryText.length).toBeGreaterThan(100);
  });
});