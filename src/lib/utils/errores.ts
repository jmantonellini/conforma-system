export function mensajeError(error: unknown, alternativo = 'Ocurrió un error inesperado') {
	if (error && typeof error === 'object') {
		const { body, message } = error as { body?: { message?: unknown }; message?: unknown };
		if (typeof body?.message === 'string') return body.message;
		if (typeof message === 'string' && message) return message;
	}
	return alternativo;
}
