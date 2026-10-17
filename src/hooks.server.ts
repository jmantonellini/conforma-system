import { db } from '$lib/server/db';
import type { HandleServerError, HandleValidationError } from '@sveltejs/kit';

import type { Handle } from '@sveltejs/kit';

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

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = db;

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

export const handleValidationError: HandleValidationError = ({ issues }) => ({
	message: 'Validation error',
	issues
});
