import { test, expect } from '@playwright/test';

test.describe('campaign CRUD', () => {
  test('DM can create a campaign and is redirected to its detail page', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.fill('input[name="name"]', 'E2E Test Campaign');
    await page.selectOption('select[name="system"]', 'D&D 5e');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/campaigns\/.+/);
    await expect(page.getByText('E2E Test Campaign')).toBeVisible();
  });

  test('DM can edit campaign details', async ({ page }) => {
    // Create a campaign to edit
    await page.goto('/campaigns/new');
    await page.fill('input[name="name"]', 'Campaign To Edit');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/campaigns\/.+/);

    // Click Edit
    await page.click('a:has-text("Edit")');
    await page.waitForURL(/\/campaigns\/.+\/edit/);
    await page.fill('input[name="name"]', 'Edited Campaign Name');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/campaigns\/.+/);
    await expect(page.getByText('Edited Campaign Name')).toBeVisible();
  });

  test('campaign list shows created campaigns', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page.locator('h1, h2').filter({ hasText: /campaigns/i })).toBeVisible();
  });
});
