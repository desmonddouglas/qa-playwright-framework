import { test, expect, Page } from '@playwright/test';

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

const VALID_RISK_LEVELS = ['low', 'medium', 'high', 'unknown'];
const VALID_RECOMMENDATIONS = [
  'safe_to_release',
  'release_with_caution',
  'do_not_release',
  'unknown',
];

async function waitForDashboardData(page: Page) {
  await expect(page.locator('#riskScore')).not.toHaveText('--');
  await expect(page.locator('#riskLevel')).not.toHaveText('--');
  await expect(page.locator('#releaseRecommendation')).not.toHaveText('--');

  await expect(page.getByTestId('release-status')).not.toContainText('Loading...');
  await expect(page.getByTestId('ai-summary')).not.toContainText('Loading...');
}

async function gotoDashboard(page: Page) {
  await page.goto(DASHBOARD_URL);
  await expect(page.getByTestId('release-risk-panel')).toBeVisible();
  await waitForDashboardData(page);
}

async function getRiskField(page: Page, label: string): Promise<string> {
  const panel = page.getByTestId('release-risk-panel');
  const row = panel.locator('p', { hasText: label });

  await expect(row).toBeVisible();

  const value = await row.locator('span').textContent();
  return (value ?? '').trim();
}

test.describe('QA-103 | Release Risk | Regression', () => {
  test('risk score is numeric and within expected bounds', async ({ page }) => {
    await gotoDashboard(page);

    const scoreText = await getRiskField(page, 'Risk Score:');
    const score = Number(scoreText);

    expect(scoreText).toMatch(/^\d+$/);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('risk level and recommendation use recognized values', async ({ page }) => {
    await gotoDashboard(page);

    const riskLevel = await getRiskField(page, 'Risk Level:');
    const recommendation = await getRiskField(page, 'Recommendation:');

    expect(VALID_RISK_LEVELS).toContain(riskLevel);
    expect(VALID_RECOMMENDATIONS).toContain(recommendation);
  });

  test('release status card matches release risk panel values', async ({ page }) => {
    await gotoDashboard(page);

    const panelRiskLevel = await getRiskField(page, 'Risk Level:');
    const panelRecommendation = await getRiskField(page, 'Recommendation:');

    const releaseStatus = page.getByTestId('release-status');

    await expect(releaseStatus).toContainText(new RegExp(panelRiskLevel, 'i'));
    await expect(releaseStatus).toContainText(panelRecommendation);
  });

  test('risk drivers section does not show broken or raw values', async ({ page }) => {
    await gotoDashboard(page);

    const riskDriversPanel = page.getByTestId('risk-drivers-panel');
    const text = await riskDriversPanel.textContent();

    expect(text ?? '').not.toMatch(/undefined|null|NaN|<[^>]+>/i);
    await expect(riskDriversPanel.locator('li').first()).toBeVisible();
  });

  test('AI summary references release risk information', async ({ page }) => {
    await gotoDashboard(page);

    const riskLevel = await getRiskField(page, 'Risk Level:');
    const recommendation = await getRiskField(page, 'Recommendation:');

    const aiSummary = page.getByTestId('ai-summary');

    await expect(aiSummary).toBeVisible();
    await expect(aiSummary).toContainText(new RegExp(riskLevel, 'i'));
    await expect(aiSummary).toContainText(recommendation);
  });

  test('release risk panel does not show error state text', async ({ page }) => {
    await gotoDashboard(page);

    const panel = page.getByTestId('release-risk-panel');
    const text = await panel.textContent();

    expect(text ?? '').not.toMatch(/error|failed to load|unavailable/i);
  });
});