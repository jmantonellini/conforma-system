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

test('user listing remote query requires configuration permission', async ({ page }) => {
	await page.goto('/login');

	const errorMessage = await page.evaluate(async () => {
		const remoteModulePath = '/src/lib/remote/usuarios.remote.ts';
		const { getUsuarios } = await import(/* @vite-ignore */ remoteModulePath);
		try {
			await getUsuarios();
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	});

	expect(errorMessage).not.toBeNull();
});
