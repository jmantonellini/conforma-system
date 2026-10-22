import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { insumos, tipos_insumo, unidades_medida } from '$lib/server/db/schema';
import {
	getProductoConRecetaService,
	obtenerPrecioProducto
} from '$lib/server/services/productos.service';
import type {
	MaterialSnapshot,
	NuevoInsumoComercial,
	TipoLineaComercial
} from '$lib/types/linea-comercial';
import { calcularCostoComposicion, redondearPrecio } from '$lib/utils/precios';

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown ? T : never;

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

export async function resolverLineaComercial(
	tx: Tx,
	linea: LineaComercialEntrada,
	codigoPrefijo: 'COT' | 'PED'
): Promise<LineaComercialResuelta> {
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
			throw new Error('Seleccioná un producto válido');
		}
		const [producto, precio] = await Promise.all([
			getProductoConRecetaService(producto_id),
			obtenerPrecioProducto(producto_id)
		]);
		descripcion = producto.producto.nombre;
		costo_materiales = redondearPrecio(precio.costo_materiales);
		precio_lista_unitario = redondearPrecio(
			linea.precio_lista_unitario ?? linea.precio_unitario ?? precio.precio_venta
		);
		if (precio_lista_unitario < precio.precio_venta) {
			throw new Error('El precio de lista no puede ser menor al precio base del producto');
		}
		margen_producto = precio.margen_porcentaje;
		insumos_snapshot = producto.recetaDirecta.map((material) => {
			if (material.insumo_id) {
				const insumo = producto.receta.find((item) => item.insumo_id === material.insumo_id);
				const costo_unitario = redondearPrecio(insumo?.costo_unitario ?? 0);
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
	} else if (tipo === 'insumo') {
		if (linea.nuevo_insumo) {
			const nuevo = linea.nuevo_insumo;
			const [tipoInsumo, unidad] = await Promise.all([
				tx
					.select({ codigo: tipos_insumo.codigo })
					.from(tipos_insumo)
					.where(eq(tipos_insumo.id, nuevo.tipo_id))
					.limit(1),
				tx
					.select({ codigo: unidades_medida.codigo })
					.from(unidades_medida)
					.where(eq(unidades_medida.id, nuevo.unidad_id))
					.limit(1)
			]);
			if (!tipoInsumo[0] || !unidad[0]) {
				throw new Error('El tipo o la unidad seleccionados no existen');
			}
			const [creado] = await tx
				.insert(insumos)
				.values({
					codigo: `${codigoPrefijo}-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
					nombre: nuevo.nombre.trim(),
					tipo_id: nuevo.tipo_id,
					categoria_id: nuevo.categoria_id ?? null,
					unidad_id: nuevo.unidad_id,
					tipo: tipoInsumo[0].codigo,
					unidad: unidad[0].codigo,
					costo_unitario: redondearPrecio(nuevo.costo_unitario),
					flete_porcentaje: 0,
					activo: true
				})
				.returning({ id: insumos.id });
			insumo_id = creado.id;
		} else {
			insumo_id = Number(linea.insumo_id);
		}
		if (!Number.isSafeInteger(insumo_id) || insumo_id < 1) {
			throw new Error('Seleccioná un insumo válido');
		}
		const [insumo] = await tx.select().from(insumos).where(eq(insumos.id, insumo_id)).limit(1);
		if (!insumo) throw new Error('Insumo no encontrado');
		descripcion = insumo.nombre;
		costo_materiales = redondearPrecio(insumo.costo_unitario);
		precio_lista_unitario = redondearPrecio(
			linea.precio_lista_unitario ?? linea.precio_unitario ?? insumo.costo_unitario
		);
		if (precio_lista_unitario < costo_materiales) {
			throw new Error('El precio del insumo no puede ser menor al costo unitario');
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
		if (!descripcion) throw new Error('La descripción del concepto es requerida');
		const asociados = linea.insumos_asociados ?? [];
		const ids = asociados.map((material) => material.insumo_id);
		if (new Set(ids).size !== ids.length) {
			throw new Error('No repitas el mismo insumo en la composición');
		}
		if (ids.length) {
			const materiales = await tx
				.select({
					id: insumos.id,
					codigo: insumos.codigo,
					nombre: insumos.nombre,
					unidad: insumos.unidad,
					costo_unitario: insumos.costo_unitario
				})
				.from(insumos)
				.where(inArray(insumos.id, ids));
			const porId = new Map(materiales.map((material) => [material.id, material]));
			insumos_snapshot = asociados.map((asociado) => {
				const material = porId.get(asociado.insumo_id);
				if (!material) throw new Error('Uno de los insumos asociados ya no existe');
				const costo_unitario = redondearPrecio(material.costo_unitario);
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
			costo_materiales = calcularCostoComposicion(insumos_snapshot);
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
