import { calentarMotorPdf } from '$lib/server/pdf/base';
import { precargarCotizacionDolarBNA } from '$lib/server/integraciones/tipo-cambio-bna';
import { programarLimpiezaNotificaciones } from '$lib/modulos/notificaciones/notificaciones.server';
import { iniciarMonitoreo } from '$lib/server/monitoreo/sentry';
import { usuarioDeSesion } from '$lib/server/auth/permissions';
import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError, HandleValidationError, ServerInit } from '@sveltejs/kit';

export const init: ServerInit = () => {
	iniciarMonitoreo();
	programarLimpiezaNotificaciones();
	void calentarMotorPdf();
	precargarCotizacionDolarBNA();
	process.on('unhandledRejection', (motivo) => {
		console.error('[unhandledRejection]', motivo);
	});
	process.on('uncaughtException', (error) => {
		console.error('[uncaughtException]', error);
		void Promise.resolve(Sentry.flush(2000)).finally(() => process.exit(1));
	});
};

const PG_ERROR_CODES: Record<string, string> = {
	'23503': 'foreign key',
	'23502': 'not null',
	'23505': 'unique',
	'23514': 'check',
	'22P02': 'invalid input'
};

function parsePgError(err: any): { message: string; field?: string } {
	const code = err?.code || '';
	const detail = err?.detail || '';
	const msg = err?.message || '';

	if (code === '23503') {
		const match = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
		if (match) return { message: 'El valor seleccionado no es válido', field: match[1] };
	}

	if (code === '23502') {
		const match = msg.match(/column "([^"]+)"/);
		if (match) return { message: 'Este campo es obligatorio', field: match[1] };
	}

	if (code === '23505') {
		const match = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
		if (match) return { message: 'Ya existe un registro con este valor', field: match[1] };
	}

	if (code === '23514') {
		return { message: 'El valor no cumple las reglas de validación' };
	}

	if (code === '22P02') {
		const match = msg.match(/column "([^"]+)"/);
		return { message: 'Formato inválido', field: match?.[1] };
	}

	return { message: 'Error del servidor' };
}

const REMOTAS_PUBLICAS = new Set(['login']);

function remotaInvocada(url: URL) {
	const prefijo = '/_app/remote/';
	if (url.pathname.startsWith(prefijo)) return url.pathname.slice(prefijo.length);
	return url.searchParams.get('/remote');
}

const RUTAS_SIN_REGISTRO = new Set(['/salud']);
const REMOTAS_DE_SONDEO = new Set(['getNotificaciones']);

const registrarRequest: Handle = async ({ event, resolve }) => {
	if (RUTAS_SIN_REGISTRO.has(event.url.pathname)) return resolve(event);
	const inicio = performance.now();
	const usuario = await usuarioDeSesion().catch(() => null);
	if (usuario) Sentry.setUser({ id: String(usuario.id), username: usuario.username });
	let estado = 500;
	try {
		const respuesta = await resolve(event);
		estado = respuesta.status;
		return respuesta;
	} finally {
		const remota = remotaInvocada(new URL(event.request.url))?.split('/').pop();
		const destino = remota ? `remota ${remota}` : event.url.pathname;
		const ms = Math.round(performance.now() - inicio);
		const linea = `[http] ${event.request.method} ${destino} ${estado} ${ms}ms ${usuario?.username ?? '-'}`;
		if (estado >= 500) console.error(linea);
		else if (estado >= 400) console.warn(linea);
		else if (!REMOTAS_DE_SONDEO.has(remota ?? '')) console.info(linea);
	}
};

const protegerYTraducirErrores: Handle = async ({ event, resolve }) => {
	const remota = remotaInvocada(new URL(event.request.url));
	if (
		remota &&
		!REMOTAS_PUBLICAS.has(remota.split('/').pop() ?? '') &&
		!(await usuarioDeSesion())
	) {
		return new Response(
			JSON.stringify({ type: 'error', status: 401, error: { message: 'Sesión vencida' } }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		return await resolve(event);
	} catch (error) {
		const err = error as any;

		if (err?.code && PG_ERROR_CODES[err.code]) {
			const parsed = parsePgError(err);

			return new Response(
				JSON.stringify({
					type: 'failure',
					status: 422,
					data: {
						error: parsed.message,
						field: parsed.field || null
					}
				}),
				{
					status: 422,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		throw error;
	}
};

export const handle = sequence(Sentry.sentryHandle(), registrarRequest, protegerYTraducirErrores);

function getRootCause(error: unknown): Record<string, unknown> {
	let current = error;
	const seen = new Set<object>();

	while (current && typeof current === 'object' && 'cause' in current) {
		if (seen.has(current)) break;
		seen.add(current);
		const cause = current.cause;
		if (!cause || typeof cause !== 'object') break;
		current = cause;
	}

	return current && typeof current === 'object'
		? (current as Record<string, unknown>)
		: { message: String(current) };
}

const registrarError: HandleServerError = ({ error, event, status, message }) => {
	if (status < 500) return { message };

	const cause = getRootCause(error);
	const causeMessage = typeof cause.message === 'string' ? cause.message : message;
	const databaseLocation = [cause.schema, cause.table, cause.column]
		.filter((value): value is string => typeof value === 'string')
		.join('.');
	const details = [
		`HTTP ${status} ${event.request.method} ${event.url.pathname}`,
		`${cause.code ? `[PostgreSQL ${String(cause.code)}] ` : ''}${causeMessage}`,
		databaseLocation ? `Database location: ${databaseLocation}` : undefined,
		typeof cause.detail === 'string' ? `Detail: ${cause.detail}` : undefined,
		typeof cause.hint === 'string' ? `Hint: ${cause.hint}` : undefined,
		typeof cause.stack === 'string' ? cause.stack : undefined
	].filter((line): line is string => Boolean(line));
	console.error(details.join('\n'));

	return { message: 'Error interno del servidor' };
};

export const handleError = Sentry.handleErrorWithSentry(registrarError);

export const handleValidationError: HandleValidationError = ({ issues, event }) => {
	console.warn(
		`[validación] ${event.request.method} ${event.url.pathname}`,
		JSON.stringify(issues.map((issue) => ({ path: issue.path, message: issue.message })))
	);
	return { message: 'Datos inválidos', issues };
};
