import { test, expect, Page } from '@playwright/test';

/**
 * QA-105 | User can view coverage gap analysis
 *
 * As a quality leader, I want to view coverage gap analysis so that I can
 * identify areas of the application that need additional test coverage.
 *
 * Suite: Regression
 *
 * Selector strategy:
 *   getByTestId('coverage-gaps')        → metric card wrapper  [data-testid]
 *   getByTestId('coverage-gaps-panel')  → detail article panel [data-testid]
 *   #coverageGaps                       → <strong> value populated by app.js
 *   #coverageList                       → <ul> list populated by app.js
 *   #aiSummary                          → <pre> text populated by app.js
 *
 * Recommendation strings are sourced from scripts/coverage-gap.ts:
 *   covered  → 'Coverage exists for this area.'
 *   missing + requiredForSmoke   → 'Add at least one smoke test for this required area.'
 *   missing + !requiredForSmoke  → 'Consider adding regression coverage for this area if it is relevant to the product.'
 */

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

const VALID_STATUSES = ['covered', 'missing'] as const;

const VALID_RECOMMENDATIONS = [
  'Coverage exists for this area.',
  'Add at least one smoke test for this required area.',
  'Consider adding regression coverage for this area if it is relevant to the product.',
] as const;

const BROKEN_VALUE_PATTERN = /\bundefined\b|\bnull\b|\bNaN\b|<[^>]+>|Loading\.\.\.|--/i;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function gotoDashboard(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);
  await expect(page.getByTestId('coverage-gaps-panel')).toBeVisible();
  await expect(page.locator('#coverageGaps')).not.toHaveText('--');
  await expect(page.locator('#coverageList li').first()).toBeVisible();
}

async function getCoverageGapCardCount(page: Page): Promise<number> {
  const text = await page.locator('#coverageGaps').textContent();
  return Number((text ?? '').trim());
}

async function getCoverageListItems(page: Page): Promise<string[]> {
  const items = await page.locator('#coverageList li').allTextContents();
  return items.map(text => text.trim());
}

async function getAISummaryText(page: Page): Promise<string> {
  const summary = page.locator('#aiSummary');
  await expect(summary).toBeVisible();
  return (await summary.textContent() ?? '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('QA-105 | Coverage Gap Analysis | Regression', () => {

  // ── AC: Dashboard displays a Coverage Gaps metric card ────────────────────

  test('coverage gaps metric card count is a non-negative integer', async ({ page }) => {
    await gotoDashboard(page);

    const count = await getCoverageGapCardCount(page);

    expect(Number.isInteger(count), 'Count should be an integer').toBe(true);
    expect(count, 'Count should be >= 0').toBeGreaterThanOrEqual(0);
  });

  test('coverage gaps metric card does not show broken or placeholder values', async ({ page }) => {
    await gotoDashboard(page);

    const text = (await page.locator('#coverageGaps').textContent() ?? '').trim();
    expect(text, 'Metric card value should not match broken value pattern').not.toMatch(BROKEN_VALUE_PATTERN);
  });

  // ── AC: Dashboard displays a Coverage Gaps section ────────────────────────

  test('coverage gaps panel heading is visible', async ({ page }) => {
    await gotoDashboard(page);

    await expect(
      page.getByTestId('coverage-gaps-panel').getByRole('heading', { name: /Coverage Gaps/i })
    ).toBeVisible();
  });

  test('coverage gaps panel does not show error or fallback text', async ({ page }) => {
    await gotoDashboard(page);

    const panelText = (await page.getByTestId('coverage-gaps-panel').textContent() ?? '');
    expect(panelText).not.toMatch(/error|failed to load|unavailable/i);
    expect(panelText).not.toMatch(BROKEN_VALUE_PATTERN);
  });

  // ── AC: Coverage Gaps section lists uncovered or under-tested areas ────────

  test('coverage gaps panel list contains at least one item', async ({ page }) => {
    await gotoDashboard(page);

    const items = await getCoverageListItems(page);
    expect(items.length, 'Coverage list should have at least one item').toBeGreaterThan(0);
  });

  test('every coverage list item contains an area name and a recognized status', async ({ page }) => {
    await gotoDashboard(page);

    const items = await getCoverageListItems(page);

    for (const text of items) {
      expect(text, 'Item should not be empty').not.toBe('');

      const hasValidStatus = VALID_STATUSES.some(status => text.includes(status));
      expect(
        hasValidStatus,
        `Item "${text}" should contain a valid status: ${VALID_STATUSES.join(' | ')}`
      ).toBe(true);
    }
  });

  test('every missing coverage area includes a recognized recommendation', async ({ page }) => {
    await gotoDashboard(page);

    const items = await getCoverageListItems(page);
    const missingItems = items.filter(text => text.includes('missing'));

    expect(
      missingItems.length,
      'At least one missing item must exist for this assertion to be meaningful'
    ).toBeGreaterThan(0);

    for (const text of missingItems) {
      const hasValidRecommendation = VALID_RECOMMENDATIONS.some(rec => text.includes(rec));
      expect(
        hasValidRecommendation,
        `Missing item "${text}" should include one of the recognized recommendations`
      ).toBe(true);
    }
  });

  // ── AC: Coverage gap count is numeric ─────────────────────────────────────

  test('coverage gap count in metric card matches the number of missing areas in the panel', async ({ page }) => {
    await gotoDashboard(page);

    const cardCount = await getCoverageGapCardCount(page);
    const items = await getCoverageListItems(page);
    const missingCount = items.filter(text => text.includes('missing')).length;

    expect(
      missingCount,
      `Metric card shows ${cardCount} gaps but panel has ${missingCount} missing items`
    ).toBe(cardCount);
  });

  // ── AC: Coverage gap content does not display broken or fallback text ──────

  test('coverage gap list items do not contain broken or placeholder values', async ({ page }) => {
    await gotoDashboard(page);

    const items = await getCoverageListItems(page);

    for (const text of items) {
      expect(
        text,
        `List item "${text}" should not match broken value pattern`
      ).not.toMatch(BROKEN_VALUE_PATTERN);
    }
  });

  test('AI summary does not show broken or fallback text', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getAISummaryText(page);

    expect(summaryText).not.toMatch(/No AI summary found/i);
    expect(summaryText).not.toMatch(BROKEN_VALUE_PATTERN);
    expect(summaryText.length, 'AI summary should contain meaningful content').toBeGreaterThan(100);
  });

});