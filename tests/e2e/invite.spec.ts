import { test, expect } from '@playwright/test';

test.describe('invitation flow', () => {
  test('unauthenticated user visiting /invite/[token] is redirected through /login', async ({ browser }) => {
    const context = await browser.newContext(); // no storageState
    const page = await context.newPage();
    await page.goto('/invite/some-test-token');
    await expect(page).toHaveURL(/\/login\?redirect=%2Finvite\//);
    await context.close();
  });

  test('DM can send an invitation from the members page', async ({ page }) => {
    // First create a campaign
    await page.goto('/campaigns/new');
    await page.fill('input[name="name"]', 'Campaign With Invite');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/campaigns\/.+/);

    // Navigate to members page
    const campaignUrl = page.url();
    const campaignId = campaignUrl.split('/campaigns/')[1];
    await page.goto(`/campaigns/${campaignId}/members`);

    // Send an invitation
    await page.fill('input[name="email"]', 'newplayer@example.com');
    await page.selectOption('select[name="permission"]', 'read');
    await page.click('button:has-text("Send invite")');

    await expect(page.locator('text=/invitation sent/i')).toBeVisible();
  });

  test('DM can revoke a pending invitation', async ({ page }) => {
    // Create campaign and send invite
    await page.goto('/campaigns/new');
    await page.fill('input[name="name"]', 'Revoke Test Campaign');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/campaigns\/.+/);
    const campaignId = page.url().split('/campaigns/')[1];

    await page.goto(`/campaigns/${campaignId}/members`);
    await page.fill('input[name="email"]', 'torevoke@example.com');
    await page.click('button:has-text("Send invite")');
    await page.waitForSelector('text=/invitation sent/i');

    // Revoke it
    await page.reload();
    await page.click('button:has-text("Revoke")');
    await expect(page.locator('text=torevoke@example.com')).not.toBeVisible();
  });
});
