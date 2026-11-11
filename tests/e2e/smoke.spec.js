import { test, expect } from '@playwright/test';

test('de PWA toont het eerste kluisinstelscherm', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle('Energieverbruik');
  await expect(page.locator('#screen-setup')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#form-setup-new button[type="submit"]')).toHaveText('Kluis aanmaken');
  await expect(page.locator('[data-app-name]').first()).toHaveText('Energieverbruik');
  expect(pageErrors).toEqual([]);
});