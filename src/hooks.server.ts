import { calentarMotorPdf } from '$lib/server/pdf/base';
import { precargarCotizacionDolarBNA } from '$lib/server/integraciones/tipo-cambio-bna';
import { programarLimpiezaNotificaciones } from '$lib/modulos/notificaciones/notificaciones.server';
import { reportarError } from '$lib/server/monitoreo/reportar-error';
import { usuarioDeSesion } from '$lib/server/auth/permissions';
import type { HandleServerError, HandleValidationError } from '@sveltejs/kit';

import type { Handle, ServerInit } from '@sveltejs/kit';

export const init: ServerInit = () => {
	programarLimpiezaNotificaciones();
	void calentarMotorPdf();
	precargarCotizacionDolarBNA();
	process.on('unhandledRejection', (motivo) => {
		console.error('[unhandledRejection]', motivo);
		reportarError(motivo, { ruta: 'unhandledRejection' });
	});
	process.on('uncaughtException', (error) => {
		console.error('[uncaughtException]', error);
		reportarError(error, { ruta: 'uncaughtException' });
		setTimeout(() => process.exit(1), 3000).unref();
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

export const handle: Handle = async ({ event, resolve }) => {
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

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	if (status < 500) {
		if (status !== 404) {
			console.warn(`HTTP ${status} ${event.request.method} ${event.url.pathname}: ${message}`);
		}
		return { message };
	}

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
	reportarError(error, {
		ruta: event.url.pathname,
		metodo: event.request.method,
		estado: status
	});

	return { message: 'Error interno del servidor' };
};

export const handleValidationError: HandleValidationError = ({ issues, event }) => {
	console.warn(
		`[validación] ${event.request.method} ${event.url.pathname}`,
		JSON.stringify(issues.map((issue) => ({ path: issue.path, message: issue.message })))
	);
	return { message: 'Datos inválidos', issues };
};
