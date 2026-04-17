import { test, expect } from '../../fixtures/base.fixture.js';

test('homepage loads and shows heading', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.heading).toBeVisible();
});

test('homepage has a link', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.link).toBeVisible();
});

test('homepage URL is correct', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.page).toHaveURL('https://example.com/');
});

test('homepage title is correct', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.page).toHaveTitle(/Example Domain/);
});

test('homepage body contains expected text', async ({ homePage }) => {
  await homePage.goto();
  await expect(
    homePage.page.getByText(/This domain is for use in documentation examples/)
  ).toBeVisible();
});