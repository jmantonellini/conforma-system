import { db } from '$lib/server/db';
import { producto_componentes, producto_insumos } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => any ? T : never;

export type RecetaLineaProducto = {
	insumo_id?: number;
	producto_id?: number;
	cantidad: number;
};

export function parsearRecetaProducto(recetaJson?: string): RecetaLineaProducto[] {
	if (!recetaJson) return [];

	try {
		const parsed = JSON.parse(recetaJson);
		if (!Array.isArray(parsed)) throw new Error();

		return parsed
			.filter((linea) => linea?.insumo_id || linea?.producto_id)
			.map((linea) => {
				const cantidad = Number(linea.cantidad);
				if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error();
				return {
					insumo_id: linea.insumo_id ? Number(linea.insumo_id) : undefined,
					producto_id: linea.producto_id ? Number(linea.producto_id) : undefined,
					cantidad
				};
			});
	} catch {
		throw new Error('La receta del producto no es válida');
	}
}

export function validarComponentes(
	productosRelacionados: { componente_id: number }[],
	productoId: number
) {
	if (productosRelacionados.some((componente) => componente.componente_id === productoId)) {
		throw new Error('Un producto no puede contenerse a sí mismo');
	}
}

export async function sincronizarRecetaProducto({
	tx,
	productoId,
	receta
}: {
	tx: Tx;
	productoId: number;
	receta: RecetaLineaProducto[];
}) {
	await tx.delete(producto_insumos).where(eq(producto_insumos.producto_id, productoId));
	await tx.delete(producto_componentes).where(eq(producto_componentes.producto_id, productoId));

	const componentes = receta.filter((linea) => linea.producto_id) as {
		producto_id: number;
		cantidad: number;
	}[];

	validarComponentes(
		componentes.map((linea) => ({ componente_id: linea.producto_id })),
		productoId
	);

	if (receta.some((linea) => linea.insumo_id)) {
		await tx.insert(producto_insumos).values(
			receta
				.filter((linea) => linea.insumo_id)
				.map((linea, orden) => ({
					insumo_id: linea.insumo_id!,
					cantidad: linea.cantidad,
					producto_id: productoId,
					orden
				}))
		);
	}

	if (componentes.length) {
		await tx.insert(producto_componentes).values(
			componentes.map((linea, orden) => ({
				componente_id: linea.producto_id,
				cantidad: linea.cantidad,
				producto_id: productoId,
				orden
			}))
		);
	}
}
