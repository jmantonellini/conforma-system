import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/private';

export function causaRaiz(error: unknown): Record<string, unknown> {
	let actual = error;
	const vistos = new Set<object>();

	while (actual && typeof actual === 'object' && 'cause' in actual) {
		if (vistos.has(actual)) break;
		vistos.add(actual);
		const causa = actual.cause;
		if (!causa || typeof causa !== 'object') break;
		actual = causa;
	}

	return actual && typeof actual === 'object'
		? (actual as Record<string, unknown>)
		: { message: String(actual) };
}

function texto(valor: unknown) {
	return typeof valor === 'string' && valor ? valor : undefined;
}

function agruparErrorDeBase(evento: Sentry.ErrorEvent, error: unknown) {
	const causa = causaRaiz(error);
	const codigo = texto(causa.code);
	if (!codigo || !/^[0-9A-Z]{5}$/.test(codigo)) return evento;

	const tabla = texto(causa.table);
	const restriccion = texto(causa.constraint) ?? texto(causa.column);
	const origen = texto(evento.tags?.remota) ?? evento.transaction ?? '';

	evento.tags = {
		...evento.tags,
		postgres: codigo,
		...(tabla ? { tabla } : {}),
		...(restriccion ? { restriccion } : {})
	};
	evento.fingerprint = ['postgres', codigo, tabla ?? '', restriccion ?? '', origen];
	return evento;
}

export function iniciarMonitoreo() {
	if (!env.SENTRY_DSN) return;
	Sentry.init({
		dsn: env.SENTRY_DSN,
		environment: env.SENTRY_ENVIRONMENT ?? 'produccion',
		release: env.SENTRY_RELEASE || undefined,
		beforeSend: (evento, pista) => agruparErrorDeBase(evento, pista.originalException)
	});
}
