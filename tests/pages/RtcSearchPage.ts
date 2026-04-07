import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the RTC (Record of Rights, Tenancy and Crops) search page.
 * Allows searching land records by district, taluk, hobli, village and survey number.
 */
export class RtcSearchPage {
  readonly page: Page;
  readonly districtDropdown: Locator;
  readonly talukDropdown: Locator;
  readonly hobliDropdown: Locator;
  readonly villageDropdown: Locator;
  readonly surveyNumberInput: Locator;
  readonly searchButton: Locator;
  readonly resultsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.districtDropdown = page.locator('select[name*="district"], select[id*="district"], select[id*="District"]').first();
    this.talukDropdown = page.locator('select[name*="taluk"], select[id*="taluk"], select[id*="Taluk"]').first();
    this.hobliDropdown = page.locator('select[name*="hobli"], select[id*="hobli"], select[id*="Hobli"]').first();
    this.villageDropdown = page.locator('select[name*="village"], select[id*="village"], select[id*="Village"]').first();
    this.surveyNumberInput = page.locator('input[name*="survey"], input[id*="survey"], input[placeholder*="Survey"]').first();
    this.searchButton = page.getByRole('button', { name: /Search|Submit|Get Details/i }).first();
    this.resultsSection = page.locator('.result, #result, [id*="result"], table.rtc-table').first();
  }

  async selectDistrict(district: string) {
    await this.districtDropdown.selectOption({ label: district });
  }

  async selectTaluk(taluk: string) {
    await this.talukDropdown.selectOption({ label: taluk });
  }

  async selectHobli(hobli: string) {
    await this.hobliDropdown.selectOption({ label: hobli });
  }

  async selectVillage(village: string) {
    await this.villageDropdown.selectOption({ label: village });
  }

  async enterSurveyNumber(surveyNo: string) {
    await this.surveyNumberInput.fill(surveyNo);
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async search(district: string, taluk: string, hobli: string, village: string, surveyNo: string) {
    await this.selectDistrict(district);
    await this.selectTaluk(taluk);
    await this.selectHobli(hobli);
    await this.selectVillage(village);
    await this.enterSurveyNumber(surveyNo);
    await this.clickSearch();
  }
}
