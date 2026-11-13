import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		environment: env.PUBLIC_SENTRY_ENVIRONMENT ?? 'produccion',
		release: env.PUBLIC_SENTRY_RELEASE || undefined
	});
}

export const handleError = Sentry.handleErrorWithSentry();
