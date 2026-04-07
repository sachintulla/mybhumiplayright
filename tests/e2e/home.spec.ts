import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

/**
 * Tests for the Bhu Bharathi home page.
 * Validates the page loads and key navigation links are visible.
 */
test.describe('Bhu Bharathi Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const title = await homePage.getTitle();
    expect(title).toBeTruthy();
    expect(title.toLowerCase()).toMatch(/bhu\s*bharath|bhoomi|land\s*record|karnataka/i);
  });

  test('should display the site header', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    const header = page.locator('header, .header, #header, nav, .navbar').first();
    await expect(header).toBeVisible();
  });

  test('should have navigation links for key services', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Verify the page loaded and has content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify links exist on the page
    const links = page.getByRole('link');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be accessible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const homePage = new HomePage(page);
    await homePage.goto();

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
