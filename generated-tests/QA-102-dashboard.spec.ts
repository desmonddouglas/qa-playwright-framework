import { test, expect } from '@playwright/test';

/**
 * QA-102: User can view QA Intelligence Dashboard
 *
 * Story: As a quality leader, I want to view a QA dashboard so that I can
 * understand test health, coverage gaps, and release risk.
 *
 * Test Suite: smoke + regression
 * Generated from Jira story QA-102 and live page inspection.
 * ⚠️ REQUIRES HUMAN REVIEW before merging into framework.
 */

const BASE_URL = 'https://desmonddouglas.github.io/qa-playwright-framework/';

test.describe('QA-102 | QA Intelligence Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // ─────────────────────────────────────────────
  // SMOKE TESTS
  // ─────────────────────────────────────────────

  test.describe('Smoke', () => {

    /**
     * AC: Dashboard displays release status
     * Type: positive
     */
    test('displays release status section with risk level and recommendation', async ({ page }) => {
      // Release status banner (header area)
      await expect(page.getByText('LOW RISK')).toBeVisible();
      await expect(page.getByText('safe_to_release')).toBeVisible();

      // Release Risk article
      const releaseRiskSection = page.getByRole('article').filter({ hasText: 'Release Risk' });
      await expect(releaseRiskSection).toBeVisible();
      await expect(releaseRiskSection.getByText(/Risk Score:/i)).toBeVisible();
      await expect(releaseRiskSection.getByText(/Risk Level:/i)).toBeVisible();
      await expect(releaseRiskSection.getByText(/Recommendation:/i)).toBeVisible();
    });

    /**
     * AC: Dashboard displays total tests
     * Type: positive
     */
    test('displays total tests metric card', async ({ page }) => {
      const totalTestsCard = page.locator('div').filter({ hasText: /^🧪Total Tests/ });
      await expect(totalTestsCard).toBeVisible();
      await expect(totalTestsCard.locator('strong')).toBeVisible();
    });

    /**
     * AC: Dashboard displays failed tests
     * Type: positive
     */
    test('displays failed tests metric card', async ({ page }) => {
      const failedTestsCard = page.locator('div').filter({ hasText: /^❌Failed Tests/ });
      await expect(failedTestsCard).toBeVisible();
      await expect(failedTestsCard.locator('strong')).toBeVisible();
    });

    /**
     * AC: Dashboard displays coverage gaps
     * Type: positive
     */
    test('displays coverage gaps metric card and detail section', async ({ page }) => {
      // Metric card
      const coverageGapsCard = page.locator('div').filter({ hasText: /^📉Coverage Gaps/ });
      await expect(coverageGapsCard).toBeVisible();
      await expect(coverageGapsCard.locator('strong')).toBeVisible();

      // Detail section
      const coverageGapsSection = page.getByRole('article').filter({ hasText: 'Coverage Gaps' });
      await expect(coverageGapsSection).toBeVisible();
    });

    /**
     * AC: Dashboard displays AI QA summary
     * Type: positive
     */
    test('displays AI QA Summary section', async ({ page }) => {
      const aiSummaryHeading = page.getByRole('heading', { name: /AI QA Summary/i });
      await expect(aiSummaryHeading).toBeVisible();

      // Summary content block should be non-empty
      const summaryContent = aiSummaryHeading.locator('..').locator('div').last();
      await expect(summaryContent).not.toBeEmpty();
    });

    /**
     * General: Page loads with correct title
     * Type: positive
     */
    test('page has correct title and heading', async ({ page }) => {
      await expect(page).toHaveTitle('QA Intelligence Dashboard');
      await expect(page.getByRole('heading', { name: 'QA Intelligence Dashboard', level: 1 })).toBeVisible();
    });

  });

  // ─────────────────────────────────────────────
  // REGRESSION TESTS
  // ─────────────────────────────────────────────

  test.describe('Regression', () => {

    /**
     * All six metric cards render
     * Type: positive
     */
    test('displays all six metric cards', async ({ page }) => {
      await expect(page.locator('div').filter({ hasText: /^🧪Total Tests/ })).toBeVisible();
      await expect(page.locator('div').filter({ hasText: /^✅Passed Results/ })).toBeVisible();
      await expect(page.locator('div').filter({ hasText: /^❌Failed Tests/ })).toBeVisible();
      await expect(page.locator('div').filter({ hasText: /^⚠️Flaky Tests/ })).toBeVisible();
      await expect(page.locator('div').filter({ hasText: /^🛠️Maintenance Suggestions/ })).toBeVisible();
      await expect(page.locator('div').filter({ hasText: /^📉Coverage Gaps/ })).toBeVisible();
    });

    /**
     * Metric card values are numeric
     * Type: positive
     */
    test('metric card values are numeric', async ({ page }) => {
      const cards = [
        /^🧪Total Tests/,
        /^✅Passed Results/,
        /^❌Failed Tests/,
        /^⚠️Flaky Tests/,
        /^🛠️Maintenance Suggestions/,
        /^📉Coverage Gaps/,
      ];

      for (const pattern of cards) {
        const card = page.locator('div').filter({ hasText: pattern });
        const valueText = await card.locator('strong').textContent();
        expect(Number(valueText?.trim())).not.toBeNaN();
      }
    });

    /**
     * Coverage gaps list items are present
     * Type: positive
     */
    test('coverage gaps section lists individual coverage areas', async ({ page }) => {
      const coverageSection = page.getByRole('article').filter({ hasText: 'Coverage Gaps' });
      const items = coverageSection.getByRole('listitem');
      await expect(items.first()).toBeVisible();
      // At least one coverage area should be listed
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    });

    /**
     * Risk Drivers section is present
     * Type: positive
     */
    test('displays Risk Drivers section', async ({ page }) => {
      const riskDriversSection = page.getByRole('article').filter({ hasText: 'Risk Drivers' });
      await expect(riskDriversSection).toBeVisible();
      await expect(riskDriversSection.getByRole('listitem').first()).toBeVisible();
    });

    /**
     * Maintenance Suggestions section is present
     * Type: positive
     */
    test('displays Maintenance Suggestions section', async ({ page }) => {
      const maintenanceSection = page.getByRole('article').filter({ hasText: 'Maintenance Suggestions' });
      await expect(maintenanceSection).toBeVisible();
    });

    /**
     * Last CI Run timestamp is displayed
     * Type: positive
     */
    test('displays Last CI Run timestamp in release status', async ({ page }) => {
      await expect(page.getByText(/Last CI Run:/i)).toBeVisible();
    });

    /**
     * AI Summary contains key signal labels
     * Type: positive
     */
    test('AI QA Summary content contains expected signal labels', async ({ page }) => {
      const summaryRegion = page.locator('div').filter({ hasText: /Overall Status/i }).last();
      await expect(summaryRegion).toContainText('Total Tests');
      await expect(summaryRegion).toContainText('Failed');
      await expect(summaryRegion).toContainText('Release Risk');
    });

    /**
     * Platform label is visible
     * Type: positive
     */
    test('displays Quality Engineering Platform label', async ({ page }) => {
      await expect(page.getByText('Quality Engineering Platform')).toBeVisible();
    });

    /**
     * Negative: No broken/empty metric card values
     * Type: negative
     */
    test('metric cards do not display empty or undefined values', async ({ page }) => {
      const strongValues = page.locator('strong');
      const count = await strongValues.count();

      for (let i = 0; i < count; i++) {
        const text = await strongValues.nth(i).textContent();
        expect(text?.trim()).not.toBe('');
        expect(text?.toLowerCase()).not.toContain('undefined');
        expect(text?.toLowerCase()).not.toContain('null');
      }
    });

  });

});