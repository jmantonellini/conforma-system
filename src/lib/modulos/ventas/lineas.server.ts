import { secuencial } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import type { Tx } from '$lib/server/db';
import { insumos, tipos_insumo, unidades_medida, unidadInsumo } from '$lib/server/db/schema';
import {
	getProductoConRecetaService,
	obtenerPrecioProducto
} from '$lib/modulos/productos/productos.server';
import type {
	MaterialSnapshot,
	NuevoInsumoComercial,
	TipoLineaComercial
} from '$lib/modulos/ventas/tipos';
import { calcularCostoComposicion, redondearPrecio } from '$lib/utils/precios';
import { sincronizarRecetaProducto } from '$lib/modulos/productos/receta.server';

export type LineaComercialEntrada = {
	tipo?: TipoLineaComercial;
	producto_id?: string | number | null;
	insumo_id?: number | null;
	nuevo_insumo?: NuevoInsumoComercial;
	descripcion?: string | null;
	visible_cliente?: boolean;
	cantidad: number;
	precio_unitario?: number | null;
	precio_lista_unitario?: number | null;
	costo_materiales?: number | null;
	insumos_asociados?: { insumo_id: number; cantidad: number }[];
};

export type LineaComercialResuelta = {
	tipo: TipoLineaComercial;
	producto_id: number | null;
	insumo_id: number | null;
	es_personalizado: boolean;
	descripcion: string;
	visible_cliente: boolean;
	cantidad: number;
	precio_unitario: number;
	precio_lista_unitario: number;
	margen_producto: number;
	costo_materiales: number;
	insumos_snapshot: MaterialSnapshot[];
};

async function componerDesdeInsumos(
	tx: Tx,
	asociados: { insumo_id: number; cantidad: number }[],
	enMoneda: (valorUsd: number | null | undefined) => number
): Promise<MaterialSnapshot[]> {
	const ids = asociados.map((material) => material.insumo_id);
	if (new Set(ids).size !== ids.length) {
		error(400, 'No repitas el mismo insumo en la composición');
	}
	if (!ids.length) return [];
	const materiales = await tx
		.select({
			id: insumos.id,
			codigo: insumos.codigo,
			nombre: insumos.nombre,
			unidad: unidadInsumo,
			costo_unitario: insumos.costo_unitario
		})
		.from(insumos)
		.where(inArray(insumos.id, ids));
	const porId = new Map(materiales.map((material) => [material.id, material]));
	return asociados.map((asociado) => {
		const material = porId.get(asociado.insumo_id);
		if (!material) error(400, 'Uno de los insumos asociados ya no existe');
		const costo_unitario = enMoneda(material.costo_unitario);
		return {
			insumo_id: material.id,
			codigo: material.codigo,
			nombre: material.nombre,
			unidad: material.unidad,
			cantidad: asociado.cantidad,
			costo_unitario,
			subtotal: redondearPrecio(asociado.cantidad * costo_unitario)
		};
	});
}

export async function resolverLineaComercial(
	tx: Tx,
	linea: LineaComercialEntrada,
	codigoPrefijo: 'COT' | 'PED',
	factor = 1
): Promise<LineaComercialResuelta> {
	const enMoneda = (valorUsd: number | null | undefined) =>
		redondearPrecio((valorUsd ?? 0) * factor);
	const productoEntrada = String(linea.producto_id ?? '');
	const tipo =
		(productoEntrada === 'personalizado' && !linea.insumo_id && !linea.nuevo_insumo
			? 'concepto'
			: linea.tipo) ??
		(linea.nuevo_insumo || linea.insumo_id ? 'insumo' : productoEntrada ? 'producto' : 'concepto');
	const visible_cliente = linea.visible_cliente ?? tipo !== 'insumo';
	let producto_id: number | null = null;
	let insumo_id: number | null = null;
	let descripcion = linea.descripcion?.trim() ?? '';
	let costo_materiales = redondearPrecio(linea.costo_materiales ?? 0);
	let precio_lista_unitario = redondearPrecio(
		linea.precio_lista_unitario ?? linea.precio_unitario ?? 0
	);
	let margen_producto = 0;
	let insumos_snapshot: MaterialSnapshot[] = [];

	if (tipo === 'producto') {
		producto_id = Number(linea.producto_id);
		if (!Number.isSafeInteger(producto_id) || producto_id < 1) {
			error(400, 'Seleccioná un producto válido');
		}
		const [producto, precio] = await Promise.all([
			getProductoConRecetaService(producto_id),
			obtenerPrecioProducto(producto_id)
		]);
		descripcion = producto.producto.nombre;
		costo_materiales = enMoneda(precio.costo_materiales);
		const precioBase = enMoneda(precio.precio_venta);
		precio_lista_unitario = redondearPrecio(
			linea.precio_lista_unitario ?? linea.precio_unitario ?? precioBase
		);
		if (precio_lista_unitario < precioBase) {
			error(400, 'El precio de lista no puede ser menor al precio base del producto');
		}
		margen_producto = precio.margen_porcentaje;
		const asociados = linea.insumos_asociados ?? [];
		if (!producto.recetaDirecta.length && asociados.length) {
			insumos_snapshot = await componerDesdeInsumos(tx, asociados, enMoneda);
			costo_materiales = calcularCostoComposicion(insumos_snapshot);
			await sincronizarRecetaProducto({
				tx,
				productoId: producto_id,
				receta: asociados.map(({ insumo_id, cantidad }) => ({ insumo_id, cantidad }))
			});
		} else {
			insumos_snapshot = producto.recetaDirecta.map((material) => {
				if (material.insumo_id) {
					const insumo = producto.receta.find((item) => item.insumo_id === material.insumo_id);
					const costo_unitario = enMoneda(insumo?.costo_unitario);
					return {
						insumo_id: material.insumo_id,
						codigo: insumo?.codigo ?? null,
						nombre: insumo?.nombre ?? 'Insumo',
						cantidad: material.cantidad,
						costo_unitario,
						unidad: insumo?.unidad ?? '',
						subtotal: redondearPrecio(material.cantidad * costo_unitario)
					};
				}

				const componente = producto.componentes.find(
					(item) => item.componente_id === material.producto_id
				);
				return {
					producto_id: material.producto_id ?? null,
					nombre: `${componente?.nombre ?? 'Componente'} (${material.cantidad}x)`,
					cantidad: material.cantidad,
					unidad: 'subproducto',
					costo_unitario: 0,
					subtotal: 0
				};
			});
		}
	} else if (tipo === 'insumo') {
		if (linea.nuevo_insumo) {
			const nuevo = linea.nuevo_insumo;
			const [tipo, unidad] = await secuencial(
				() =>
					tx
						.select({ codigo: tipos_insumo.codigo })
						.from(tipos_insumo)
						.where(eq(tipos_insumo.id, nuevo.tipo_id))
						.limit(1),
				() =>
					tx
						.select({ codigo: unidades_medida.codigo })
						.from(unidades_medida)
						.where(eq(unidades_medida.id, nuevo.unidad_id))
						.limit(1)
			);
			if (!tipo[0] || !unidad[0]) {
				error(400, 'El tipo o la unidad seleccionados no existen');
			}
			const [creado] = await tx
				.insert(insumos)
				.values({
					codigo: `${codigoPrefijo}-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
					nombre: nuevo.nombre.trim(),
					tipo_id: nuevo.tipo_id,
					categoria_id: nuevo.categoria_id ?? null,
					unidad_id: nuevo.unidad_id,
					costo_unitario: redondearPrecio(nuevo.costo_unitario / factor),
					flete_porcentaje: 0,
					activo: true
				})
				.returning({ id: insumos.id });
			insumo_id = creado.id;
		} else {
			insumo_id = Number(linea.insumo_id);
		}
		if (!Number.isSafeInteger(insumo_id) || insumo_id < 1) {
			error(400, 'Seleccioná un insumo válido');
		}
		const [insumo] = await tx
			.select({
				id: insumos.id,
				codigo: insumos.codigo,
				nombre: insumos.nombre,
				costo_unitario: insumos.costo_unitario,
				unidad: unidadInsumo
			})
			.from(insumos)
			.where(eq(insumos.id, insumo_id))
			.limit(1);
		if (!insumo) error(404, 'Insumo no encontrado');
		descripcion = insumo.nombre;
		costo_materiales = linea.nuevo_insumo
			? redondearPrecio(linea.nuevo_insumo.costo_unitario)
			: enMoneda(insumo.costo_unitario);
		precio_lista_unitario = redondearPrecio(
			linea.precio_lista_unitario ?? linea.precio_unitario ?? costo_materiales
		);
		if (precio_lista_unitario < costo_materiales) {
			error(400, 'El precio del insumo no puede ser menor al costo unitario');
		}
		insumos_snapshot = [
			{
				insumo_id: insumo.id,
				codigo: insumo.codigo,
				nombre: insumo.nombre,
				cantidad: 1,
				costo_unitario: costo_materiales,
				unidad: insumo.unidad,
				subtotal: costo_materiales
			}
		];
	} else {
		if (!descripcion) error(400, 'La descripción del trabajo es requerida');
		const composicion = await componerDesdeInsumos(tx, linea.insumos_asociados ?? [], enMoneda);
		if (composicion.length) {
			insumos_snapshot = composicion;
			costo_materiales = calcularCostoComposicion(composicion);
		}
	}

	return {
		tipo,
		producto_id,
		insumo_id,
		es_personalizado: tipo === 'concepto',
		descripcion,
		visible_cliente,
		cantidad: linea.cantidad,
		precio_unitario: precio_lista_unitario,
		precio_lista_unitario,
		margen_producto,
		costo_materiales,
		insumos_snapshot
	};
}
