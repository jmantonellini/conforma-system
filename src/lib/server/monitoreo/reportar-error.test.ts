import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: { GITHUB_ISSUES_TOKEN: 'token', GITHUB_ISSUES_REPO: 'org/erp' }
}));

const respuesta = (cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: 200 });
const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('reportarError', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetModules();
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('abre un issue cuando el error es nuevo', async () => {
		fetchMock
			.mockResolvedValueOnce(respuesta({ items: [] }))
			.mockResolvedValueOnce(respuesta({ number: 1 }));
		const { reportarError } = await import('./reportar-error');

		reportarError(new Error('Falla 42'), { ruta: '/pedidos', metodo: 'GET' });
		await esperar();
		await esperar();

		const [url, init] = fetchMock.mock.calls[1];
		expect(url).toBe('https://api.github.com/repos/org/erp/issues');
		expect(JSON.parse(init.body).title).toBe('[prod] Falla 42');
	});

	it('comenta el issue abierto si la huella ya existe', async () => {
		fetchMock
			.mockResolvedValueOnce(respuesta({ items: [{ number: 7 }] }))
			.mockResolvedValueOnce(respuesta({}));
		const { reportarError } = await import('./reportar-error');

		reportarError(new Error('Otra falla'));
		await esperar();
		await esperar();

		expect(fetchMock.mock.calls[1][0]).toBe(
			'https://api.github.com/repos/org/erp/issues/7/comments'
		);
	});

	it('no repite el aviso del mismo error dentro de la hora', async () => {
		fetchMock.mockResolvedValue(respuesta({ items: [] }));
		const { reportarError } = await import('./reportar-error');

		reportarError(new Error('Falla 1'));
		reportarError(new Error('Falla 2'));
		await esperar();
		await esperar();

		const busquedas = fetchMock.mock.calls.filter(([url]) => String(url).includes('/search/'));
		expect(busquedas).toHaveLength(1);
	});
});
