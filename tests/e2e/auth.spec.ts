import { test, expect } from '@playwright/test';

test.describe('authentication', () => {
  test('unauthenticated user visiting /dashboard is redirected to /login', async ({ browser }) => {
    // Use a fresh browser context with no stored auth
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
    await context.close();
  });

  test('unauthenticated user visiting /campaigns is redirected to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/campaigns');
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  test('authenticated user visiting /login is redirected to /dashboard', async ({ page }) => {
    // This test uses the stored auth from auth.setup.ts
    await page.goto('/login');
    await expect(page).toHaveURL('/dashboard');
  });

  test('login with invalid credentials shows error', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible();
    await context.close();
  });
});
