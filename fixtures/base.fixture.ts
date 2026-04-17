import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/Homepage.js';

type MyFixtures = {
  homePage: HomePage;
};

export const test = base.extend<MyFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
});

export { expect };