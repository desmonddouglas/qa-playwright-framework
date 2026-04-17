import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly link: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('Example Domain');
    this.link = page.locator('a');
  }

  async goto() {
    await this.page.goto('/');
  }
}