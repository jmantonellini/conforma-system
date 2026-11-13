import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/private';

export function iniciarMonitoreo() {
	if (!env.SENTRY_DSN) return;
	Sentry.init({
		dsn: env.SENTRY_DSN,
		environment: env.SENTRY_ENVIRONMENT ?? 'produccion',
		release: env.SENTRY_RELEASE || undefined
	});
}
