import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	unidades_fabricacion,
	ordenes_fabricacion,
	estados_fabricacion,
	transiciones_estado,
	logs_cambios_estado,
	type EstadoFabricacion
} from '$lib/server/db/schema';

// ─────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────

export interface ResumenOrden {
	orden_id: number;
	cantidad_total: number;
	cantidad_producida: number;
	cantidad_en_proceso: number;
	cantidad_pausadas: number;
	estado_calculado: EstadoFabricacion;
	porcentaje_avance: number;
}

export interface CambioEstadoResult {
	success: boolean;
	unidad_id: number;
	estado_anterior: EstadoFabricacion;
	estado_nuevo: EstadoFabricacion;
	resumen_orden: ResumenOrden;
}

// ─────────────────────────────────────────
// CACHE DE CATÁLOGOS (en memoria por request)
// ─────────────────────────────────────────

let _cacheEstadosFabricacion: Map<number, EstadoFabricacion> | null = null;
let _cacheTransiciones: Map<string, Set<number>> | null = null;

async function cargarCacheEstados() {
	if (_cacheEstadosFabricacion) return;

	const [fab, trans] = await Promise.all([
		db.select().from(estados_fabricacion),
		db.select().from(transiciones_estado)
	]);

	_cacheEstadosFabricacion = new Map(fab.map((e) => [e.id, e]));

	_cacheTransiciones = new Map();
	for (const t of trans) {
		const key = `${t.tipo}:${t.estado_origen_id}`;
		if (!_cacheTransiciones.has(key)) _cacheTransiciones.set(key, new Set());
		_cacheTransiciones.get(key)!.add(t.estado_destino_id);
	}
}

function getEstadoFabricacion(id: number): EstadoFabricacion {
	const e = _cacheEstadosFabricacion?.get(id);
	if (!e) throw new Error(`Estado de fabricación ${id} no encontrado`);
	return e;
}

function getTransicionesPermitidas(tipo: string, estadoOrigenId: number): number[] {
	const key = `${tipo}:${estadoOrigenId}`;
	return Array.from(_cacheTransiciones?.get(key) ?? []);
}

export function invalidarCacheEstados() {
	_cacheEstadosFabricacion = null;
	_cacheTransiciones = null;
}

// ─────────────────────────────────────────
// DERIVACIÓN: Funciones puras, testeables
// ─────────────────────────────────────────

function calcularEstadoOrden(unidades: Array<{ estado_id: number }>): EstadoFabricacion {
	if (unidades.length === 0) {
		const preparando = Array.from(_cacheEstadosFabricacion!.values()).find(
			(e) => e.slug === 'preparando_materiales'
		);
		if (preparando) return preparando;
		throw new Error('Estado "preparando_materiales" no configurado');
	}

	const estados = unidades.map((u) => getEstadoFabricacion(u.estado_id));
	const grupos = new Set(estados.map((e) => e.grupo));

	if (estados.every((e) => e.es_final)) {
		return estados[0];
	}
	if (grupos.has('activo')) {
		const enProd = Array.from(_cacheEstadosFabricacion!.values()).find(
			(e) => e.slug === 'en_produccion'
		);
		if (enProd) return enProd;
	}
	if (grupos.has('pausado')) {
		const pausado = Array.from(_cacheEstadosFabricacion!.values()).find(
			(e) => e.slug === 'pausado'
		);
		if (pausado) return pausado;
	}
	if (grupos.size === 1 && grupos.has('preparacion')) {
		const prep = Array.from(_cacheEstadosFabricacion!.values()).find(
			(e) => e.slug === 'preparando_materiales'
		);
		if (prep) return prep;
	}

	const enProd = Array.from(_cacheEstadosFabricacion!.values()).find(
		(e) => e.slug === 'en_produccion'
	);
	if (enProd) return enProd;
	throw new Error('No se pudo calcular estado de orden');
}

// ─────────────────────────────────────────
// QUERIES PÚBLICAS
// ─────────────────────────────────────────

export async function getResumenOrden(ordenId: number): Promise<ResumenOrden> {
	await cargarCacheEstados();

	const [unidades, orden] = await Promise.all([
		db
			.select({ estado_id: unidades_fabricacion.estado_id })
			.from(unidades_fabricacion)
			.where(eq(unidades_fabricacion.orden_fabricacion_id, ordenId)),
		db
			.select({ id: ordenes_fabricacion.id, cantidad_total: ordenes_fabricacion.cantidad_total })
			.from(ordenes_fabricacion)
			.where(eq(ordenes_fabricacion.id, ordenId))
			.then((rows) => rows[0])
	]);

	if (!orden) throw new Error(`Orden ${ordenId} no encontrada`);

	const estado_calculado = calcularEstadoOrden(unidades);
	const cantidad_producida = unidades.filter(
		(u) => getEstadoFabricacion(u.estado_id).es_final
	).length;
	const cantidad_en_proceso = unidades.filter(
		(u) => getEstadoFabricacion(u.estado_id).grupo === 'activo'
	).length;
	const cantidad_pausadas = unidades.filter(
		(u) => getEstadoFabricacion(u.estado_id).grupo === 'pausado'
	).length;

	return {
		orden_id: orden.id,
		cantidad_total: orden.cantidad_total,
		cantidad_producida,
		cantidad_en_proceso,
		cantidad_pausadas,
		estado_calculado,
		porcentaje_avance:
			orden.cantidad_total > 0 ? Math.round((cantidad_producida / orden.cantidad_total) * 100) : 0
	};
}

export async function getTransicionesUnidad(unidadId: number): Promise<EstadoFabricacion[]> {
	await cargarCacheEstados();

	const unidad = await db
		.select({ estado_id: unidades_fabricacion.estado_id })
		.from(unidades_fabricacion)
		.where(eq(unidades_fabricacion.id, unidadId))
		.then((rows) => rows[0]);

	if (!unidad) throw new Error(`Unidad ${unidadId} no encontrada`);

	const destinosIds = getTransicionesPermitidas('fabricacion', unidad.estado_id);
	return destinosIds.map((id) => getEstadoFabricacion(id));
}

// ─────────────────────────────────────────
// CAMBIO DE ESTADO — ÚNICA FUNCIÓN DE ESCRITURA
// ─────────────────────────────────────────

export interface CambioEstadoParams {
	unidad_id: number;
	estado_destino_id: number;
	usuario_id: number;
	comentario?: string;
}

export async function cambiarEstadoUnidad(params: CambioEstadoParams): Promise<CambioEstadoResult> {
	await cargarCacheEstados();
	const { unidad_id, estado_destino_id, usuario_id, comentario } = params;
	const now = new Date();

	// 1. Validar que la unidad existe
	const unidad = await db
		.select({
			id: unidades_fabricacion.id,
			estado_id: unidades_fabricacion.estado_id,
			orden_fabricacion_id: unidades_fabricacion.orden_fabricacion_id,
			historial_estados: unidades_fabricacion.historial_estados
		})
		.from(unidades_fabricacion)
		.where(eq(unidades_fabricacion.id, unidad_id))
		.then((rows) => rows[0]);

	if (!unidad) throw new Error(`Unidad ${unidad_id} no encontrada`);

	// 2. Validar que la transición está permitida
	const destinosPermitidos = getTransicionesPermitidas('fabricacion', unidad.estado_id);
	if (!destinosPermitidos.includes(estado_destino_id)) {
		const actual = getEstadoFabricacion(unidad.estado_id);
		const destino = getEstadoFabricacion(estado_destino_id);
		throw new Error(`Transición no permitida: ${actual.nombre} → ${destino.nombre}`);
	}

	const estado_anterior = getEstadoFabricacion(unidad.estado_id);
	const estado_nuevo = getEstadoFabricacion(estado_destino_id);

	// 3. Actualizar historial JSONB
	const historial = unidad.historial_estados ?? [];
	historial.push({
		estado_id: unidad.estado_id,
		fecha: now.toISOString(),
		comentario: comentario ?? undefined
	});

	// 4. Ejecutar UPDATE + INSERT en transacción real (PostgreSQL sí lo soporta)
	await db.transaction(async (tx) => {
		await tx
			.update(unidades_fabricacion)
			.set({
				estado_id: estado_destino_id,
				historial_estados: historial,
				comentario_estado: comentario ?? null,
				updated_at: now
			})
			.where(eq(unidades_fabricacion.id, unidad_id));

		await tx.insert(logs_cambios_estado).values({
			entidad_tipo: 'unidad',
			entidad_id: unidad_id,
			usuario_id,
			estado_anterior_id: estado_anterior.id,
			estado_nuevo_id: estado_nuevo.id,
			comentario: comentario ?? null,
			created_at: now
		});
	});

	// 5. Calcular resúmenes derivados (lectura, no escritura)
	const resumen_orden = await getResumenOrden(unidad.orden_fabricacion_id);

	return {
		success: true,
		unidad_id,
		estado_anterior,
		estado_nuevo,
		resumen_orden
	};
}

/**
 * Reanudar una unidad pausada — va al último estado activo del historial.
 * NO usa transiciones_estado. Usa el historial JSONB.
 */
export async function reanudarUnidad(
	unidad_id: number,
	usuario_id: number,
	comentario?: string
): Promise<CambioEstadoResult> {
	await cargarCacheEstados();

	const unidad = await db
		.select({
			estado_id: unidades_fabricacion.estado_id,
			historial_estados: unidades_fabricacion.historial_estados,
			orden_fabricacion_id: unidades_fabricacion.orden_fabricacion_id
		})
		.from(unidades_fabricacion)
		.where(eq(unidades_fabricacion.id, unidad_id))
		.then((rows) => rows[0]);

	if (!unidad) throw new Error(`Unidad ${unidad_id} no encontrada`);

	const estadoActual = getEstadoFabricacion(unidad.estado_id);
	if (estadoActual.grupo !== 'pausado') {
		throw new Error(`La unidad no está pausada (estado: ${estadoActual.nombre})`);
	}

	// Buscar el último estado no-pausado en el historial
	const historial = unidad.historial_estados ?? [];
	const estadoReanudar = historial
		.slice()
		.reverse()
		.find((h) => getEstadoFabricacion(h.estado_id).grupo !== 'pausado');

	if (!estadoReanudar) {
		throw new Error('No hay estado anterior para reanudar');
	}

	return cambiarEstadoUnidad({
		unidad_id,
		estado_destino_id: estadoReanudar.estado_id,
		usuario_id,
		comentario: comentario ?? `Reanudado desde ${estadoActual.nombre}`
	});
}
