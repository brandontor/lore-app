import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate as DM', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', process.env.E2E_DM_EMAIL!);
  await page.fill('input[type="password"]', process.env.E2E_DM_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
