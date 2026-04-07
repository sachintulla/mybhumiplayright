import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Mutation Status search page.
 * Allows checking the status of land mutation (Khata transfer) requests.
 */
export class MutationStatusPage {
  readonly page: Page;
  readonly districtDropdown: Locator;
  readonly talukDropdown: Locator;
  readonly mutationNumberInput: Locator;
  readonly yearInput: Locator;
  readonly searchButton: Locator;
  readonly statusResult: Locator;

  constructor(page: Page) {
    this.page = page;
    this.districtDropdown = page.locator('select[name*="district"], select[id*="district"], select[id*="District"]').first();
    this.talukDropdown = page.locator('select[name*="taluk"], select[id*="taluk"], select[id*="Taluk"]').first();
    this.mutationNumberInput = page.locator('input[name*="mutation"], input[id*="mutation"], input[placeholder*="Mutation"]').first();
    this.yearInput = page.locator('input[name*="year"], input[id*="year"], select[id*="year"]').first();
    this.searchButton = page.getByRole('button', { name: /Search|Submit|Check Status/i }).first();
    this.statusResult = page.locator('.status-result, #statusResult, [id*="status"], table').first();
  }

  async selectDistrict(district: string) {
    await this.districtDropdown.selectOption({ label: district });
  }

  async selectTaluk(taluk: string) {
    await this.talukDropdown.selectOption({ label: taluk });
  }

  async enterMutationNumber(mutationNo: string) {
    await this.mutationNumberInput.fill(mutationNo);
  }

  async enterYear(year: string) {
    await this.yearInput.fill(year);
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async checkStatus(district: string, taluk: string, mutationNo: string, year: string) {
    await this.selectDistrict(district);
    await this.selectTaluk(taluk);
    await this.enterMutationNumber(mutationNo);
    await this.enterYear(year);
    await this.clickSearch();
  }
}
