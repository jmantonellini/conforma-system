import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

const CLAVE_RECARGA = 'recarga-por-version';

window.addEventListener('vite:preloadError', (evento) => {
	try {
		const ultima = Number(sessionStorage.getItem(CLAVE_RECARGA) ?? 0);
		if (Date.now() - ultima < 10_000) return;
		sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
	} catch {
		return;
	}
	evento.preventDefault();
	window.location.reload();
});

if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		environment: env.PUBLIC_SENTRY_ENVIRONMENT ?? 'produccion',
		release: env.PUBLIC_SENTRY_RELEASE || undefined,
		ignoreErrors: [
			'ResizeObserver loop',
			'Failed to fetch dynamically imported module',
			'Importing a module script failed',
			'error loading dynamically imported module',
			'Load failed',
			'NetworkError when attempting to fetch resource',
			'Sesión vencida'
		],
		denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//]
	});
}

export const handleError = Sentry.handleErrorWithSentry();
