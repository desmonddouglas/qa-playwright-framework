import { test, expect, Page } from '@playwright/test';

/**
 * QA-106 | System validates AI release recommendation
 *
 * As a QA Director, I want the framework to validate that the AI release
 * recommendation is consistent with the dashboard quality metrics so that
 * incorrect or contradictory AI guidance can be detected automatically.
 *
 * Suite: Smoke
 *
 * Selector strategy:
 *   getByTestId('ai-summary')      → AI summary section wrapper   [data-testid]
 *   getByTestId('release-risk-panel') → release risk panel        [data-testid]
 *   #aiSummary                     → <pre> text populated by app.js / ai-summary.ts
 *   #riskLevel                     → risk level span in release risk panel
 *   #releaseRecommendation         → recommendation span in release risk panel
 */

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

const VALID_RISK_LEVELS = ['low', 'medium', 'high', 'unknown'];
const VALID_RECOMMENDATIONS = [
  'safe_to_release',
  'release_with_caution',
  'do_not_release',
  'unknown',
];

async function gotoDashboard(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);

  // Wait for release risk panel data
  await expect(page.getByTestId('release-risk-panel')).toBeVisible();
  await expect(page.locator('#riskScore')).not.toHaveText('--');
  await expect(page.locator('#riskLevel')).not.toHaveText('--');
  await expect(page.locator('#releaseRecommendation')).not.toHaveText('--');

  // Wait for AI summary to finish rendering
  await expect(page.getByTestId('ai-summary')).toBeVisible();
  await expect(page.locator('#aiSummary')).not.toContainText('Loading...');
  await expect(page.locator('#aiSummary')).not.toContainText(/No AI summary found/i);
}

async function getSummaryText(page: Page): Promise<string> {
  const summary = page.locator('#aiSummary');
  await expect(summary).toBeVisible();
  return (await summary.textContent() ?? '').trim();
}

test.describe('QA-106 | AI Release Recommendation Validation | Smoke', () => {

  test('AI summary displays a Release Recommendation field', async ({ page }) => {
    await gotoDashboard(page);

    await expect(page.locator('#aiSummary')).toContainText(/Release Recommendation:/i);
  });

  test('AI summary displays a Release Risk Level field', async ({ page }) => {
    await gotoDashboard(page);

    await expect(page.locator('#aiSummary')).toContainText(/Release Risk Level:/i);
  });

  test('AI summary Release Recommendation is a recognized value', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const match = summaryText.match(
      /Release Recommendation:\s*(safe_to_release|release_with_caution|do_not_release|unknown)/i
    );

    expect(match, 'Release Recommendation should be present and a recognized value').toBeTruthy();
    expect(VALID_RECOMMENDATIONS).toContain(match![1]);
  });

  test('AI summary Release Risk Level is a recognized value', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const match = summaryText.match(
      /Release Risk Level:\s*(low|medium|high|unknown)/i
    );

    expect(match, 'Release Risk Level should be present and a recognized value').toBeTruthy();
    expect(VALID_RISK_LEVELS).toContain(match![1].toLowerCase());
  });

});