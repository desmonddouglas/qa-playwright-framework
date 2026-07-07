import { test, expect, Page } from '@playwright/test';

/**
 * QA-106 | System validates AI release recommendation
 *
 * As a QA Director, I want the framework to validate that the AI release
 * recommendation is consistent with the dashboard quality metrics so that
 * incorrect or contradictory AI guidance can be detected automatically.
 *
 * Suite: Regression
 *
 * Selector strategy:
 *   getByTestId('ai-summary')         → AI summary section wrapper   [data-testid]
 *   getByTestId('release-risk-panel') → release risk panel           [data-testid]
 *   #aiSummary                        → <pre> text written by ai-summary.ts
 *   #riskScore                        → risk score <span> in release risk panel
 *   #riskLevel                        → risk level <span> in release risk panel
 *   #releaseRecommendation            → recommendation <span> in release risk panel
 *   #failedTests                      → failed tests metric card <strong>
 *
 * Release decision rules (source: scripts/release-risk.ts):
 *   score >= 70  → riskLevel: 'high'   → releaseRecommendation: 'do_not_release'
 *   score >= 30  → riskLevel: 'medium' → releaseRecommendation: 'release_with_caution'
 *   score <  30  → riskLevel: 'low'    → releaseRecommendation: 'safe_to_release'
 *
 * Consistency rule:
 *   The AI summary recommendation MUST match the release risk panel recommendation.
 *   The AI summary risk level MUST match the release risk panel risk level.
 *   If failedTests > 0, recommendation must NOT be 'safe_to_release'.
 */

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

const VALID_RISK_LEVELS = ['low', 'medium', 'high', 'unknown'] as const;
const VALID_RECOMMENDATIONS = [
  'safe_to_release',
  'release_with_caution',
  'do_not_release',
  'unknown',
] as const;

const BROKEN_VALUE_PATTERN = /\bundefined\b|\bnull\b|\bNaN\b|<[^>]+>|Loading\.\.\.|--/i;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

async function getRiskPanelField(page: Page, fieldId: string): Promise<string> {
  const value = await page.locator(`#${fieldId}`).textContent();
  return (value ?? '').trim();
}

/**
 * Parse a labelled field from the AI summary pre block.
 * e.g. parseSummaryField(text, 'Release Recommendation') → 'safe_to_release'
 */
function parseSummaryField(summaryText: string, label: string): string | null {
  const match = summaryText.match(new RegExp(`${label}:\\s*(\\S+)`, 'i'));
  return match ? match[1].trim() : null;
}

/**
 * Derive the expected recommendation from a risk level.
 * Mirrors the logic in scripts/release-risk.ts: getReleaseRecommendation()
 */
function expectedRecommendation(
  riskLevel: string
): 'safe_to_release' | 'release_with_caution' | 'do_not_release' | 'unknown' {
  if (riskLevel === 'high') return 'do_not_release';
  if (riskLevel === 'medium') return 'release_with_caution';
  if (riskLevel === 'low') return 'safe_to_release';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('QA-106 | AI Release Recommendation Validation | Regression', () => {

  // ── AC: AI QA Summary displays a Release Recommendation ───────────────────

  test('AI summary contains Release Recommendation label and value', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const value = parseSummaryField(summaryText, 'Release Recommendation');

    expect(value, 'Release Recommendation should be present in AI summary').not.toBeNull();
    expect(
      VALID_RECOMMENDATIONS as readonly string[],
      `Release Recommendation "${value}" should be a recognized value`
    ).toContain(value);
  });

  // ── AC: AI QA Summary displays a Release Risk Level ───────────────────────

  test('AI summary contains Release Risk Level label and value', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const value = parseSummaryField(summaryText, 'Release Risk Level');

    expect(value, 'Release Risk Level should be present in AI summary').not.toBeNull();
    expect(
      VALID_RISK_LEVELS as readonly string[],
      `Release Risk Level "${value}" should be a recognized value`
    ).toContain(value?.toLowerCase());
  });

  // ── AC: AI QA Summary displays Failed Tests count ─────────────────────────

  test('AI summary contains a numeric Failed Tests count', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const match = summaryText.match(/Failed Tests:\s*(\d+)/i);

    expect(match, 'Failed Tests count should be present in AI summary').toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(0);
  });

  // ── AC: AI QA Summary displays Release Risk Score ─────────────────────────

  test('AI summary contains a numeric Release Risk Score', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const match = summaryText.match(/Release Risk Score:\s*(\d+)/i);

    expect(match, 'Release Risk Score should be present in AI summary').toBeTruthy();
    const score = Number(match![1]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  // ── AC: Release Recommendation is one of the valid enum values ─────────────

  test('AI summary Release Recommendation is a valid enum value', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const value = parseSummaryField(summaryText, 'Release Recommendation');

    expect(value, 'Release Recommendation must be present').not.toBeNull();
    expect(
      VALID_RECOMMENDATIONS as readonly string[],
      `"${value}" is not a valid recommendation`
    ).toContain(value);
  });

  // ── AC: Release Risk Level is one of the valid enum values ────────────────

  test('AI summary Release Risk Level is a valid enum value', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const value = parseSummaryField(summaryText, 'Release Risk Level');

    expect(value, 'Release Risk Level must be present').not.toBeNull();
    expect(
      VALID_RISK_LEVELS as readonly string[],
      `"${value}" is not a valid risk level`
    ).toContain(value?.toLowerCase());
  });

  // ── AC: Release Recommendation aligns with the defined release decision rules

  test('AI summary recommendation is consistent with its risk level', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);
    const riskLevel = parseSummaryField(summaryText, 'Release Risk Level')?.toLowerCase() ?? '';
    const recommendation = parseSummaryField(summaryText, 'Release Recommendation') ?? '';

    const expected = expectedRecommendation(riskLevel);

    expect(
      recommendation,
      `Risk level "${riskLevel}" should produce recommendation "${expected}" but got "${recommendation}"`
    ).toBe(expected);
  });

  test('AI summary recommendation matches the release risk panel recommendation', async ({ page }) => {
    await gotoDashboard(page);

    const panelRecommendation = await getRiskPanelField(page, 'releaseRecommendation');
    const summaryText = await getSummaryText(page);
    const summaryRecommendation = parseSummaryField(summaryText, 'Release Recommendation');

    expect(
      summaryRecommendation,
      `AI summary recommendation "${summaryRecommendation}" should match release risk panel "${panelRecommendation}"`
    ).toBe(panelRecommendation);
  });

  test('AI summary risk level matches the release risk panel risk level', async ({ page }) => {
    await gotoDashboard(page);

    const panelRiskLevel = await getRiskPanelField(page, 'riskLevel');
    const summaryText = await getSummaryText(page);
    const summaryRiskLevel = parseSummaryField(summaryText, 'Release Risk Level')?.toLowerCase();

    expect(
      summaryRiskLevel,
      `AI summary risk level "${summaryRiskLevel}" should match release risk panel "${panelRiskLevel}"`
    ).toBe(panelRiskLevel.toLowerCase());
  });

  // ── AC: Test fails if recommendation contradicts available quality metrics ─

  test('recommendation is not safe_to_release when failed tests are present', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);

    const failedTestsMatch = summaryText.match(/Failed Tests:\s*(\d+)/i);
    expect(failedTestsMatch, 'Failed Tests count must be parseable').toBeTruthy();

    const failedTests = Number(failedTestsMatch![1]);
    const recommendation = parseSummaryField(summaryText, 'Release Recommendation');

    if (failedTests > 0) {
      expect(
        recommendation,
        `Failed tests = ${failedTests}: recommendation should not be "safe_to_release" but got "${recommendation}"`
      ).not.toBe('safe_to_release');
    }

    // When no failures exist, safe_to_release is the correct outcome — no assertion needed.
  });

  test('recommendation is not safe_to_release when risk level is high or medium', async ({ page }) => {
    await gotoDashboard(page);

    const panelRiskLevel = await getRiskPanelField(page, 'riskLevel');
    const summaryText = await getSummaryText(page);
    const recommendation = parseSummaryField(summaryText, 'Release Recommendation');

    if (panelRiskLevel === 'high') {
      expect(
        recommendation,
        `Risk level is "high": recommendation must be "do_not_release" but got "${recommendation}"`
      ).toBe('do_not_release');
    }

    if (panelRiskLevel === 'medium') {
      expect(
        recommendation,
        `Risk level is "medium": recommendation must be "release_with_caution" but got "${recommendation}"`
      ).toBe('release_with_caution');
    }
  });

  // ── No broken/fallback text ────────────────────────────────────────────────

  test('AI summary does not display broken or fallback text', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getSummaryText(page);

    expect(summaryText).not.toMatch(/No AI summary found/i);
    expect(summaryText).not.toMatch(BROKEN_VALUE_PATTERN);
    expect(summaryText.length, 'AI summary should contain meaningful content').toBeGreaterThan(100);
  });

});