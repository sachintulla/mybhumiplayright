import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Bhu Bharathi home page.
 * URL: https://bhubharati.karnataka.gov.in
 */
export class HomePage {
  readonly page: Page;
  readonly rtcLink: Locator;
  readonly mutationStatusLink: Locator;
  readonly encumbranceLink: Locator;
  readonly propertySearchLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rtcLink = page.getByRole('link', { name: /RTC|Pahani|Record of Rights/i }).first();
    this.mutationStatusLink = page.getByRole('link', { name: /Mutation|Khata/i }).first();
    this.encumbranceLink = page.getByRole('link', { name: /Encumbrance/i }).first();
    this.propertySearchLink = page.getByRole('link', { name: /Property|Search/i }).first();
  }

  async goto() {
    await this.page.goto('/');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
