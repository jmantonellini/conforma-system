import { getDb } from '$lib/server/db';
import type { HandleValidationError } from '@sveltejs/kit';

export const handle = async ({ event, resolve }) => {
	const start = Date.now();

	// Inyectar DB en locals para otros usos
	if (event.platform?.env?.DB) {
		event.locals.db = getDb(event.platform.env.DB);
	}

	console.log('📨', event.request.method, event.url.pathname);
	console.log('📦 PARAMS:', event.params);
	console.log('📦 QUERY:', Object.fromEntries(event.url.searchParams));

	try {
		const response = await resolve(event);
		console.log('✅', response.status, event.url.pathname, `${Date.now() - start}ms`);
		return response;
	} catch (error) {
		console.error('❌ ERROR:', error);
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
