import { db } from '$lib/server/db';
import { productos } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export function normalizarCodigoProducto(valor: string) {
	const base = valor
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toUpperCase();

	return (base || 'PROD').slice(0, 24);
}

export async function generarCodigoProductoUnico(nombre?: string) {
	const prefijo = normalizarCodigoProducto(nombre || 'PRODUCTO');
	let codigo = `${prefijo}-${Date.now().toString(36).toUpperCase()}`;
	let intento = 1;

	while (true) {
		const [existente] = await db
			.select({ id: productos.id })
			.from(productos)
			.where(eq(productos.codigo, codigo))
			.limit(1);

		if (!existente) return codigo;

		codigo = `${prefijo}-${Date.now().toString(36).toUpperCase()}-${intento.toString(36).toUpperCase()}`;
		intento += 1;
	}
}
