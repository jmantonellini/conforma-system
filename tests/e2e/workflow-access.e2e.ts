import { expect, test } from '@playwright/test';

test('login page is available', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByText('Iniciar Sesión')).toBeVisible();
	await expect(page.getByPlaceholder('Usuario')).toBeVisible();
});

test('contact creation requires an authenticated session', async ({ page }) => {
	await page.goto('/contactos/crear');
	await expect(page).toHaveURL(/\/login\/?$/);
});

test('quotation creation requires an authenticated session', async ({ page }) => {
	await page.goto('/cotizaciones/crear');
	await expect(page).toHaveURL(/\/login\/?$/);
});
