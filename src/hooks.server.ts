import { db } from '$lib/server/db';
import type { HandleValidationError } from '@sveltejs/kit';

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

	// FK: Key (cliente_id)=(0) is not present in table "clientes"
	if (code === '23503') {
		const m = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
		if (m) return { message: `El valor seleccionado no es válido`, field: m[1] };
	}

	// NOT NULL: null value in column "x" violates not-null constraint
	if (code === '23502') {
		const m = msg.match(/column "([^"]+)"/);
		if (m) return { message: `Este campo es obligatorio`, field: m[1] };
	}

	// UNIQUE: duplicate key value violates unique constraint
	if (code === '23505') {
		const m = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
		if (m) return { message: `Ya existe un registro con este valor`, field: m[1] };
	}

	// CHECK
	if (code === '23514') {
		return { message: `El valor no cumple las reglas de validación` };
	}

	// INVALID INPUT
	if (code === '22P02') {
		const m = msg.match(/column "([^"]+)"/);
		return { message: `Formato inválido`, field: m?.[1] };
	}

	return { message: 'Error del servidor' };
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = db;

	try {
		return await resolve(event);
	} catch (error) {
		const err = error as any;

		// Si es un error de PostgreSQL (tiene code que empieza con 23 o 22)
		if (err?.code && PG_ERROR_CODES[err.code]) {
			const parsed = parsePgError(err);

			// Devolvemos 422 Unprocessable Entity con el error como JSON
			// SvelteKit lo convierte automáticamente en error de form
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

		// Si es redirect u otra cosa, la dejamos pasar
		throw error;
	}
};

export const handleValidationError: HandleValidationError = ({ event, issues }) => {
	console.log('🔴 VALIDATION ERROR:', event.url.pathname);
	console.log('📦 ISSUES:', JSON.stringify(issues, null, 2));

	// Devolver el error con más contexto
	return {
		message: 'Validation error',
		issues: issues
	};
};
