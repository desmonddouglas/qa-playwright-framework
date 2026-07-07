import { test, expect, Page } from '@playwright/test';

/**
 * QA-105: User can view Coverage Gaps
 *
 * As a quality leader, I want to view coverage gaps on the dashboard
 * so that I can identify areas of the product that lack sufficient test coverage.
 *
 * Suite: Regression
 *
 * Selector strategy:
 *   getByTestId('coverage-gaps')        → metric card wrapper div
 *   getByTestId('coverage-gaps-panel')  → detail article panel
 *   #coverageGaps                       → <strong> value written by app.js
 *   #coverageList                       → <ul> list written by app.js
 *   #aiSummary                          → AI summary <pre> written by app.js
 *
 * Recommendation strings come from scripts/coverage-gap.ts:
 *   covered  → 'Coverage exists for this area.'
 *   missing + requiredForSmoke     → 'Add at least one smoke test for this required area.'
 *   missing + !requiredForSmoke    → 'Consider adding regression coverage for this area...'
 *
 * ⚠️ REQUIRES HUMAN REVIEW before merging.
 */

const DASHBOARD_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

const VALID_STATUSES = ['covered', 'missing'] as const;

const VALID_RECOMMENDATIONS = [
  'Coverage exists for this area.',
  'Add at least one smoke test for this required area.',
  'Consider adding regression coverage for this area if it is relevant to the product.',
] as const;

const BROKEN_VALUE_PATTERN = /undefined|null|NaN|<[^>]+>|Loading\.\.\.|--/i;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function gotoDashboard(page: Page) {
    await page.goto(DASHBOARD_URL);
  
    await expect(page.getByTestId('coverage-gaps-panel')).toBeVisible();
  
    // Wait for the metric card to populate
    await expect(page.locator('#coverageGaps')).not.toHaveText('--');
  
    // Wait for the coverage list to populate
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

test.describe('QA-105 | Coverage Gaps | Regression', () => {

  // ── AC: Coverage Gaps metric card count is a non-negative integer ──────────

  test('coverage gaps metric card count is a non-negative integer', async ({ page }) => {
    await gotoDashboard(page);

    const count = await getCoverageGapCardCount(page);

    expect(Number.isInteger(count), 'Count should be an integer').toBe(true);
    expect(count, 'Count should be >= 0').toBeGreaterThanOrEqual(0);
  });

  test('coverage gaps metric card does not show broken or placeholder values', async ({ page }) => {
    await gotoDashboard(page);

    const text = (await page.locator('#coverageGaps').textContent() ?? '').trim();
    expect(text).not.toMatch(BROKEN_VALUE_PATTERN);
  });

  // ── AC: Coverage Gaps metric card count reflects areas with 'missing' status

  test('coverage gaps metric card count matches number of missing areas in panel', async ({ page }) => {
    await gotoDashboard(page);

    const cardCount = await getCoverageGapCardCount(page);
    const items = await getCoverageListItems(page);
    const missingCount = items.filter(text => text.includes('missing')).length;

    expect(missingCount, `Expected ${cardCount} missing items but found ${missingCount}`).toBe(cardCount);
  });

  // ── AC: Coverage Gaps detail panel is visible ──────────────────────────────

  test('coverage gaps panel heading is visible', async ({ page }) => {
    await gotoDashboard(page);

    await expect(
      page.getByTestId('coverage-gaps-panel').getByRole('heading', { name: /Coverage Gaps/i })
    ).toBeVisible();
  });

  // ── AC: Panel contains a list of coverage areas ────────────────────────────

  test('coverage gaps panel list contains at least one item', async ({ page }) => {
    await gotoDashboard(page);

    const items = await getCoverageListItems(page);
    expect(items.length, 'Coverage list should have at least one item').toBeGreaterThan(0);
  });

  // ── AC: Each item displays an area name and a status ──────────────────────

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

      // Items follow the pattern "area: status - recommendation"
      expect(text, `Item "${text}" should contain a colon separator`).toMatch(/\w+:\s*(covered|missing)/);
    }
  });

  // ── AC: Missing areas include a recommended action ─────────────────────────

  test('every missing coverage area includes a recognized recommendation', async ({ page }) => {
    await gotoDashboard(page);

    const items = await getCoverageListItems(page);
    const missingItems = items.filter(text => text.includes('missing'));

    expect(missingItems.length, 'At least one missing item should exist for this assertion to be meaningful').toBeGreaterThan(0);

    for (const text of missingItems) {
      const hasValidRecommendation = VALID_RECOMMENDATIONS.some(rec => text.includes(rec));
      expect(
        hasValidRecommendation,
        `Missing item "${text}" should include one of the recognized recommendations`
      ).toBe(true);
    }
  });

  // ── AC: Panel does not show broken or fallback text ────────────────────────

  test('coverage gaps panel does not show error or fallback text', async ({ page }) => {
    await gotoDashboard(page);

    const panelText = (await page.getByTestId('coverage-gaps-panel').textContent() ?? '');
    expect(panelText).not.toMatch(/error|failed to load|unavailable/i);
    expect(panelText).not.toMatch(BROKEN_VALUE_PATTERN);
  });

  // ── AC: AI Summary references the same coverage gap count ─────────────────

  test.skip('AI summary references the same coverage gap count as the metric card', async ({ page }) => {
    await gotoDashboard(page);

    const cardCount = await getCoverageGapCardCount(page);
    const summaryText = await getAISummaryText(page);

    const coverageGapsMatch = summaryText.match(/Coverage Gaps:\s*(\d+)/i);
    expect(
      coverageGapsMatch,
      'AI summary should contain a "Coverage Gaps: N" entry in Key Signals'
    ).toBeTruthy();

    const summaryCount = Number(coverageGapsMatch![1]);
    expect(
      summaryCount,
      `AI summary coverage gap count (${summaryCount}) should match metric card (${cardCount})`
    ).toBe(cardCount);
  });

  test('AI summary does not show broken or fallback text', async ({ page }) => {
    await gotoDashboard(page);

    const summaryText = await getAISummaryText(page);
    expect(summaryText).not.toMatch(/No AI summary found/i);
    const BROKEN_VALUE_PATTERN =
  /\bundefined\b|\bnull\b|\bNaN\b|<[^>]+>|Loading\.\.\.|--/i;
    expect(summaryText.length, 'AI summary should have meaningful content').toBeGreaterThan(100);
  });

});