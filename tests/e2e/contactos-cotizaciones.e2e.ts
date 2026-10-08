import { expect, test } from '@playwright/test';

test.describe('authenticated contact and quotation workflows', () => {
	test.skip(!process.env.TEST_DATABASE_URL, 'requires an isolated TEST_DATABASE_URL');

	test.beforeEach(async ({ context, baseURL }) => {
		await context.addCookies([{ name: 'session', value: 'e2e-test-session', url: baseURL! }]);
	});

	test('creates a contact', async ({ page }) => {
		const razonSocial = `E2E Contacto ${Date.now()}`;
		await page.goto('/contactos/crear');
		await page.getByLabel('Razón social').fill(razonSocial);
		await page.getByRole('button', { name: 'Crear contacto' }).click();

		await expect(page).toHaveURL(/\/contactos\/?$/);
		await expect(page.getByText(razonSocial)).toBeVisible();
	});

	test('creates a quotation', async ({ page }) => {
		const descripcion = `E2E consulta ${Date.now()}`;
		await page.goto('/cotizaciones/crear');
		await page.getByLabel('Nombre del contacto').fill('E2E Cliente');
		await page.getByLabel('¿Qué piden?').fill(descripcion);
		await page.getByRole('button', { name: 'Crear Cotización' }).click();

		await expect(page).toHaveURL(/\/cotizaciones\/\d+$/);
		await expect(page.getByText(descripcion)).toBeVisible();
	});
});
