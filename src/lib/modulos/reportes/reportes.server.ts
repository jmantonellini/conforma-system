import {
	and,
	count,
	countDistinct,
	desc,
	eq,
	inArray,
	isNotNull,
	ne,
	sql,
	sum,
	type SQL
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { aliasedTable } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	contactos,
	cotizaciones,
	empleados,
	estados,
	insumos,
	lineas_pedido,
	logs_cambios_estado,
	movimientos_insumos,
	ordenes_fabricacion,
	pagos,
	pedidos,
	productos,
	unidadInsumo,
	unidades_fabricacion
} from '$lib/server/db/schema';
import { CANALES_COTIZACION } from '$lib/modulos/cotizaciones/canales';
import {
	ZONA_HORARIA,
	agrupacionPara,
	hoyLocal,
	rangoDe,
	etiquetaGrupo,
	grupos,
	rangoPrevio,
	type Agrupacion,
	type Periodo,
	type Rango
} from './periodos';
import { puedeVerImportes, requirePermission } from '$lib/server/auth/permissions';
import type { ConsultaReporte } from './consulta';
import type { Indicador, Reporte, SeccionReporte, Serie } from './tipos';

type Contexto = { rango: Rango; previo: Rango; agrupacion: Agrupacion; importes: boolean };

const enRango = (columna: PgColumn, { desde, hasta }: Rango) =>
	sql`(${columna} AT TIME ZONE ${ZONA_HORARIA})::date BETWEEN ${desde}::date AND ${hasta}::date`;

const grupoDe = (columna: PgColumn, agrupacion: Agrupacion) =>
	sql<string>`to_char(date_trunc(${agrupacion}, ${columna} AT TIME ZONE ${ZONA_HORARIA}), 'YYYY-MM-DD')`;

const numero = (valor: unknown) => Number(valor ?? 0);
const division = (a: number, b: number) => (b ? a / b : null);

function serie(
	titulo: string,
	formato: Serie['formato'],
	{ rango, agrupacion }: Contexto,
	filas: { grupo: string; valor: unknown }[]
): Serie {
	const porGrupo = new Map(filas.map((fila) => [fila.grupo, numero(fila.valor)]));
	return {
		titulo,
		formato,
		puntos: grupos(rango, agrupacion).map((clave) => ({
			clave,
			etiqueta: etiquetaGrupo(clave, agrupacion),
			valor: porGrupo.get(clave) ?? 0
		}))
	};
}

const comparar = async <T>(contexto: Contexto, calcular: (rango: Rango) => Promise<T>) => {
	const [actual, previo] = await Promise.all([calcular(contexto.rango), calcular(contexto.previo)]);
	return { actual, previo };
};

const estadoPedido = aliasedTable(estados, 'estado_pedido');
const usdPedido = (columna: PgColumn) =>
	sql<number>`${columna} / (CASE WHEN ${pedidos.moneda} = 'ARS' THEN ${pedidos.tipo_cambio} ELSE 1 END)`;
const usdCotizacion = (columna: PgColumn) =>
	sql<number>`${columna} / (CASE WHEN ${cotizaciones.moneda} = 'ARS' THEN ${cotizaciones.tipo_cambio} ELSE 1 END)`;
const pedidoVigente = (rango: Rango) =>
	and(enRango(pedidos.fecha_pedido, rango), ne(estadoPedido.slug, 'cancelado'));

async function ventas(contexto: Contexto): Promise<Omit<Reporte, keyof Contexto | 'seccion'>> {
	const { importes } = contexto;
	const totales = async (rango: Rango) => {
		const [fila] = await db
			.select({
				pedidos: count(),
				monto: sum(usdPedido(pedidos.precio_total)),
				anticipos: sum(usdPedido(pedidos.anticipo))
			})
			.from(pedidos)
			.innerJoin(estadoPedido, eq(estadoPedido.id, pedidos.estado_id))
			.where(pedidoVigente(rango));
		const [cobros] = await db
			.select({ monto: sum(usdPedido(pagos.monto)) })
			.from(pagos)
			.innerJoin(pedidos, eq(pedidos.id, pagos.pedido_id))
			.where(enRango(pagos.fecha_pago, rango));
		const monto = numero(fila.monto);
		return {
			pedidos: fila.pedidos,
			monto,
			ticket: division(monto, fila.pedidos),
			cobrado: numero(fila.anticipos) + numero(cobros.monto)
		};
	};
	const { actual, previo } = await comparar(contexto, totales);

	const [porGrupo, clientes, articulos] = await Promise.all([
		db
			.select({
				grupo: grupoDe(pedidos.fecha_pedido, contexto.agrupacion),
				valor: importes ? sum(usdPedido(pedidos.precio_total)) : count()
			})
			.from(pedidos)
			.innerJoin(estadoPedido, eq(estadoPedido.id, pedidos.estado_id))
			.where(pedidoVigente(contexto.rango))
			.groupBy(sql`1`),
		db
			.select({
				cliente: contactos.razon_social,
				pedidos: count(),
				monto: sum(usdPedido(pedidos.precio_total))
			})
			.from(pedidos)
			.innerJoin(estadoPedido, eq(estadoPedido.id, pedidos.estado_id))
			.innerJoin(contactos, eq(contactos.id, pedidos.contacto_id))
			.where(pedidoVigente(contexto.rango))
			.groupBy(contactos.razon_social)
			.orderBy(desc(importes ? sum(usdPedido(pedidos.precio_total)) : count()))
			.limit(10),
		db
			.select({
				articulo: sql<string>`coalesce(${productos.nombre}, ${lineas_pedido.descripcion_personalizada}, 'Trabajo personalizado')`,
				unidades: sum(lineas_pedido.cantidad),
				monto: sum(usdPedido(lineas_pedido.subtotal))
			})
			.from(lineas_pedido)
			.innerJoin(pedidos, eq(pedidos.id, lineas_pedido.pedido_id))
			.innerJoin(estadoPedido, eq(estadoPedido.id, pedidos.estado_id))
			.leftJoin(productos, eq(productos.id, lineas_pedido.producto_id))
			.where(pedidoVigente(contexto.rango))
			.groupBy(sql`1`)
			.orderBy(desc(sum(lineas_pedido.cantidad)))
			.limit(10)
	]);

	const monto = (valor: number | null) => (importes ? valor : null);
	return {
		indicadores: [
			{
				etiqueta: 'Ventas',
				valor: monto(actual.monto),
				previo: monto(previo.monto),
				formato: 'moneda',
				mejorSiSube: true
			},
			{
				etiqueta: 'Pedidos',
				valor: actual.pedidos,
				previo: previo.pedidos,
				formato: 'numero',
				mejorSiSube: true
			},
			{
				etiqueta: 'Ticket promedio',
				valor: monto(actual.ticket),
				previo: monto(previo.ticket),
				formato: 'moneda',
				mejorSiSube: true
			},
			{
				etiqueta: 'Cobrado',
				valor: monto(actual.cobrado),
				previo: monto(previo.cobrado),
				formato: 'moneda',
				mejorSiSube: true,
				ayuda: 'Anticipos de los pedidos del período más pagos recibidos en el período.'
			}
		].filter((indicador) => importes || indicador.formato !== 'moneda') as Indicador[],
		serie: serie(
			importes ? 'Ventas' : 'Pedidos',
			importes ? 'moneda' : 'numero',
			contexto,
			porGrupo
		),
		tablas: [
			{
				titulo: 'Principales clientes',
				columnas: [
					{ clave: 'cliente', etiqueta: 'Cliente', formato: 'texto' },
					{ clave: 'pedidos', etiqueta: 'Pedidos', formato: 'numero' },
					...(importes ? [{ clave: 'monto', etiqueta: 'Total', formato: 'moneda' as const }] : [])
				],
				filas: clientes.map((c) => ({ ...c, monto: numero(c.monto) }))
			},
			{
				titulo: 'Artículos más vendidos',
				columnas: [
					{ clave: 'articulo', etiqueta: 'Artículo', formato: 'texto' },
					{ clave: 'unidades', etiqueta: 'Unidades', formato: 'numero' },
					...(importes ? [{ clave: 'monto', etiqueta: 'Total', formato: 'moneda' as const }] : [])
				],
				filas: articulos.map((a) => ({
					...a,
					unidades: numero(a.unidades),
					monto: numero(a.monto)
				}))
			}
		]
	};
}

const estadoCotizacion = aliasedTable(estados, 'estado_cotizacion');
const aprobada = sql`(${estadoCotizacion.slug} = 'aprobada' OR ${cotizaciones.pedido_id} IS NOT NULL)`;
const rechazada = sql`${estadoCotizacion.slug} = 'rechazada'`;
const contar = (condicion: SQL) =>
	sql<number>`count(*) filter (where ${condicion})`.mapWith(Number);

async function cotizacionesReporte(
	contexto: Contexto
): Promise<Omit<Reporte, keyof Contexto | 'seccion'>> {
	const { importes } = contexto;
	const totales = async (rango: Rango) => {
		const [fila] = await db
			.select({
				recibidas: count(),
				enviadas: contar(sql`${cotizaciones.fecha_envio} IS NOT NULL`),
				aprobadas: contar(aprobada),
				rechazadas: contar(rechazada),
				monto: sum(usdCotizacion(cotizaciones.precio_total)),
				dias: sql<number>`avg(extract(epoch from ${cotizaciones.fecha_envio} - ${cotizaciones.created_at}) / 86400)`.mapWith(
					Number
				)
			})
			.from(cotizaciones)
			.innerJoin(estadoCotizacion, eq(estadoCotizacion.id, cotizaciones.estado_id))
			.where(enRango(cotizaciones.created_at, rango));
		return {
			...fila,
			monto: numero(fila.monto),
			aprobacion: division(fila.aprobadas, fila.aprobadas + fila.rechazadas)
		};
	};
	const { actual, previo } = await comparar(contexto, totales);

	const [porGrupo, canales, responsables] = await Promise.all([
		db
			.select({ grupo: grupoDe(cotizaciones.created_at, contexto.agrupacion), valor: count() })
			.from(cotizaciones)
			.where(enRango(cotizaciones.created_at, contexto.rango))
			.groupBy(sql`1`),
		db
			.select({ canal: cotizaciones.canal, recibidas: count(), aprobadas: contar(aprobada) })
			.from(cotizaciones)
			.innerJoin(estadoCotizacion, eq(estadoCotizacion.id, cotizaciones.estado_id))
			.where(enRango(cotizaciones.created_at, contexto.rango))
			.groupBy(cotizaciones.canal)
			.orderBy(desc(count())),
		db
			.select({
				responsable: sql<string>`coalesce(${empleados.nombre} || ' ' || ${empleados.apellido}, 'Sin asignar')`,
				recibidas: count(),
				aprobadas: contar(aprobada)
			})
			.from(cotizaciones)
			.innerJoin(estadoCotizacion, eq(estadoCotizacion.id, cotizaciones.estado_id))
			.leftJoin(empleados, eq(empleados.id, cotizaciones.asignada_a))
			.where(enRango(cotizaciones.created_at, contexto.rango))
			.groupBy(sql`1`)
			.orderBy(desc(count()))
	]);

	const conTasa = <T extends { recibidas: number; aprobadas: number }>(fila: T) => ({
		...fila,
		tasa: division(fila.aprobadas, fila.recibidas)
	});
	return {
		indicadores: [
			{
				etiqueta: 'Recibidas',
				valor: actual.recibidas,
				previo: previo.recibidas,
				formato: 'numero',
				mejorSiSube: true
			},
			{
				etiqueta: 'Enviadas al cliente',
				valor: actual.enviadas,
				previo: previo.enviadas,
				formato: 'numero',
				mejorSiSube: true
			},
			{
				etiqueta: 'Tasa de aprobación',
				valor: actual.aprobacion,
				previo: previo.aprobacion,
				formato: 'porcentaje',
				mejorSiSube: true,
				ayuda: 'Aprobadas sobre las ya decididas (aprobadas + rechazadas).'
			},
			importes
				? {
						etiqueta: 'Monto cotizado',
						valor: actual.monto,
						previo: previo.monto,
						formato: 'moneda',
						mejorSiSube: true
					}
				: {
						etiqueta: 'Días hasta el envío',
						valor: actual.dias,
						previo: previo.dias,
						formato: 'dias',
						mejorSiSube: false
					}
		],
		serie: serie('Cotizaciones recibidas', 'numero', contexto, porGrupo),
		tablas: [
			{
				titulo: 'Por canal',
				columnas: [
					{ clave: 'canal', etiqueta: 'Canal', formato: 'texto' },
					{ clave: 'recibidas', etiqueta: 'Recibidas', formato: 'numero' },
					{ clave: 'aprobadas', etiqueta: 'Aprobadas', formato: 'numero' },
					{ clave: 'tasa', etiqueta: 'Conversión', formato: 'porcentaje' }
				],
				filas: canales.map((c) =>
					conTasa({
						...c,
						canal: CANALES_COTIZACION[c.canal as keyof typeof CANALES_COTIZACION] ?? c.canal
					})
				)
			},
			{
				titulo: 'Por responsable',
				columnas: [
					{ clave: 'responsable', etiqueta: 'Responsable', formato: 'texto' },
					{ clave: 'recibidas', etiqueta: 'Recibidas', formato: 'numero' },
					{ clave: 'aprobadas', etiqueta: 'Aprobadas', formato: 'numero' },
					{ clave: 'tasa', etiqueta: 'Conversión', formato: 'porcentaje' }
				],
				filas: responsables.map(conTasa)
			}
		]
	};
}

const estadoFinal = aliasedTable(estados, 'estado_final');
const terminadas = (rango: Rango) =>
	and(
		eq(logs_cambios_estado.entidad_tipo, 'unidad'),
		eq(estadoFinal.es_final, true),
		enRango(logs_cambios_estado.created_at, rango)
	);

async function produccion(contexto: Contexto): Promise<Omit<Reporte, keyof Contexto | 'seccion'>> {
	const totales = async (rango: Rango) => {
		const [unidades] = await db
			.select({
				terminadas: countDistinct(logs_cambios_estado.entidad_id),
				defectuosas:
					sql<number>`count(distinct ${logs_cambios_estado.entidad_id}) filter (where ${unidades_fabricacion.es_defectuoso})`.mapWith(
						Number
					)
			})
			.from(logs_cambios_estado)
			.innerJoin(estadoFinal, eq(estadoFinal.id, logs_cambios_estado.estado_nuevo_id))
			.innerJoin(unidades_fabricacion, eq(unidades_fabricacion.id, logs_cambios_estado.entidad_id))
			.where(terminadas(rango));
		const [ordenes] = await db
			.select({ creadas: count() })
			.from(ordenes_fabricacion)
			.where(enRango(ordenes_fabricacion.created_at, rango));
		return { ...unidades, creadas: ordenes.creadas };
	};
	const { actual, previo } = await comparar(contexto, totales);

	const productoId = sql`coalesce(${lineas_pedido.producto_id}, ${ordenes_fabricacion.producto_id})`;
	const [porGrupo, responsables, fabricados, [enCurso]] = await Promise.all([
		db
			.select({
				grupo: grupoDe(logs_cambios_estado.created_at, contexto.agrupacion),
				valor: countDistinct(logs_cambios_estado.entidad_id)
			})
			.from(logs_cambios_estado)
			.innerJoin(estadoFinal, eq(estadoFinal.id, logs_cambios_estado.estado_nuevo_id))
			.where(terminadas(contexto.rango))
			.groupBy(sql`1`),
		db
			.select({
				responsable: sql<string>`coalesce(${empleados.nombre} || ' ' || ${empleados.apellido}, 'Sin asignar')`,
				unidades: countDistinct(logs_cambios_estado.entidad_id),
				ordenes: countDistinct(ordenes_fabricacion.id)
			})
			.from(logs_cambios_estado)
			.innerJoin(estadoFinal, eq(estadoFinal.id, logs_cambios_estado.estado_nuevo_id))
			.innerJoin(unidades_fabricacion, eq(unidades_fabricacion.id, logs_cambios_estado.entidad_id))
			.innerJoin(
				ordenes_fabricacion,
				eq(ordenes_fabricacion.id, unidades_fabricacion.orden_fabricacion_id)
			)
			.leftJoin(empleados, eq(empleados.id, ordenes_fabricacion.asignado_a))
			.where(terminadas(contexto.rango))
			.groupBy(sql`1`)
			.orderBy(desc(countDistinct(logs_cambios_estado.entidad_id))),
		db
			.select({
				producto: sql<string>`coalesce(${productos.nombre}, ${ordenes_fabricacion.nombre_trabajo})`,
				unidades: countDistinct(logs_cambios_estado.entidad_id)
			})
			.from(logs_cambios_estado)
			.innerJoin(estadoFinal, eq(estadoFinal.id, logs_cambios_estado.estado_nuevo_id))
			.innerJoin(unidades_fabricacion, eq(unidades_fabricacion.id, logs_cambios_estado.entidad_id))
			.innerJoin(
				ordenes_fabricacion,
				eq(ordenes_fabricacion.id, unidades_fabricacion.orden_fabricacion_id)
			)
			.leftJoin(lineas_pedido, eq(lineas_pedido.id, ordenes_fabricacion.linea_pedido_id))
			.leftJoin(productos, sql`${productos.id} = ${productoId}`)
			.where(terminadas(contexto.rango))
			.groupBy(sql`1`)
			.orderBy(desc(countDistinct(logs_cambios_estado.entidad_id)))
			.limit(10),
		db
			.select({ unidades: count() })
			.from(unidades_fabricacion)
			.innerJoin(estados, eq(estados.id, unidades_fabricacion.estado_id))
			.where(eq(estados.es_final, false))
	]);

	return {
		indicadores: [
			{
				etiqueta: 'Unidades terminadas',
				valor: actual.terminadas,
				previo: previo.terminadas,
				formato: 'numero',
				mejorSiSube: true
			},
			{
				etiqueta: 'Órdenes creadas',
				valor: actual.creadas,
				previo: previo.creadas,
				formato: 'numero',
				mejorSiSube: true
			},
			{
				etiqueta: 'Defectuosas',
				valor: actual.defectuosas,
				previo: previo.defectuosas,
				formato: 'numero',
				mejorSiSube: false
			},
			{
				etiqueta: 'En curso hoy',
				valor: enCurso.unidades,
				previo: null,
				formato: 'numero',
				ayuda: 'Unidades que todavía no llegaron a un estado final.'
			}
		],
		serie: serie('Unidades terminadas', 'numero', contexto, porGrupo),
		tablas: [
			{
				titulo: 'Por responsable',
				columnas: [
					{ clave: 'responsable', etiqueta: 'Responsable', formato: 'texto' },
					{ clave: 'ordenes', etiqueta: 'Órdenes', formato: 'numero' },
					{ clave: 'unidades', etiqueta: 'Unidades', formato: 'numero' }
				],
				filas: responsables
			},
			{
				titulo: 'Productos fabricados',
				columnas: [
					{ clave: 'producto', etiqueta: 'Producto', formato: 'texto' },
					{ clave: 'unidades', etiqueta: 'Unidades', formato: 'numero' }
				],
				filas: fabricados
			}
		]
	};
}

const valorMovimiento =
	sql<number>`coalesce(sum(${movimientos_insumos.cantidad} * ${insumos.costo_unitario}), 0)`.mapWith(
		Number
	);
const consumos = (rango: Rango) =>
	and(
		inArray(movimientos_insumos.tipo, ['consumo', 'ajuste_salida']),
		enRango(movimientos_insumos.created_at, rango)
	);

async function insumosReporte(
	contexto: Contexto
): Promise<Omit<Reporte, keyof Contexto | 'seccion'>> {
	const { importes } = contexto;
	const totales = async (rango: Rango) => {
		const [consumo] = await db
			.select({
				valor: valorMovimiento,
				insumos: countDistinct(movimientos_insumos.insumo_id),
				movimientos: count()
			})
			.from(movimientos_insumos)
			.innerJoin(insumos, eq(insumos.id, movimientos_insumos.insumo_id))
			.where(consumos(rango));
		const [ingresos] = await db
			.select({ valor: valorMovimiento })
			.from(movimientos_insumos)
			.innerJoin(insumos, eq(insumos.id, movimientos_insumos.insumo_id))
			.where(
				and(
					inArray(movimientos_insumos.tipo, ['ingreso', 'ajuste_entrada']),
					enRango(movimientos_insumos.created_at, rango)
				)
			);
		return {
			consumo: consumo.valor,
			insumos: consumo.insumos,
			movimientos: consumo.movimientos,
			ingresos: ingresos.valor
		};
	};
	const { actual, previo } = await comparar(contexto, totales);

	const [porGrupo, principales, porOrden] = await Promise.all([
		db
			.select({
				grupo: grupoDe(movimientos_insumos.created_at, contexto.agrupacion),
				valor: importes ? valorMovimiento : count()
			})
			.from(movimientos_insumos)
			.innerJoin(insumos, eq(insumos.id, movimientos_insumos.insumo_id))
			.where(consumos(contexto.rango))
			.groupBy(sql`1`),
		db
			.select({
				codigo: insumos.codigo,
				insumo: insumos.nombre,
				unidad: unidadInsumo,
				cantidad: sum(movimientos_insumos.cantidad),
				valor: valorMovimiento
			})
			.from(movimientos_insumos)
			.innerJoin(insumos, eq(insumos.id, movimientos_insumos.insumo_id))
			.where(consumos(contexto.rango))
			.groupBy(insumos.id, insumos.codigo, insumos.nombre)
			.orderBy(desc(importes ? valorMovimiento : sum(movimientos_insumos.cantidad)))
			.limit(15),
		db
			.select({
				orden: sql<string>`'OF-' || ${ordenes_fabricacion.id} || ' · ' || ${ordenes_fabricacion.nombre_trabajo}`,
				insumos: countDistinct(movimientos_insumos.insumo_id),
				valor: valorMovimiento
			})
			.from(movimientos_insumos)
			.innerJoin(insumos, eq(insumos.id, movimientos_insumos.insumo_id))
			.innerJoin(
				ordenes_fabricacion,
				eq(ordenes_fabricacion.id, movimientos_insumos.orden_fabricacion_id)
			)
			.where(and(consumos(contexto.rango), isNotNull(movimientos_insumos.orden_fabricacion_id)))
			.groupBy(ordenes_fabricacion.id, ordenes_fabricacion.nombre_trabajo)
			.orderBy(desc(valorMovimiento))
			.limit(10)
	]);

	return {
		indicadores: [
			...(importes
				? ([
						{
							etiqueta: 'Consumo valorizado',
							valor: actual.consumo,
							previo: previo.consumo,
							formato: 'moneda',
							mejorSiSube: false,
							ayuda: 'Cantidades consumidas al costo actual de cada insumo.'
						},
						{
							etiqueta: 'Ingresos valorizados',
							valor: actual.ingresos,
							previo: previo.ingresos,
							formato: 'moneda'
						}
					] satisfies Indicador[])
				: []),
			{
				etiqueta: 'Insumos distintos',
				valor: actual.insumos,
				previo: previo.insumos,
				formato: 'numero'
			},
			{
				etiqueta: 'Movimientos de salida',
				valor: actual.movimientos,
				previo: previo.movimientos,
				formato: 'numero'
			}
		],
		serie: serie(
			importes ? 'Consumo valorizado' : 'Movimientos de salida',
			importes ? 'moneda' : 'numero',
			contexto,
			porGrupo
		),
		tablas: [
			{
				titulo: 'Insumos más consumidos',
				columnas: [
					{ clave: 'insumo', etiqueta: 'Insumo', formato: 'texto' },
					{ clave: 'cantidad', etiqueta: 'Cantidad', formato: 'numero' },
					{ clave: 'unidad', etiqueta: 'Unidad', formato: 'texto' },
					...(importes ? [{ clave: 'valor', etiqueta: 'Valor', formato: 'moneda' as const }] : [])
				],
				filas: principales.map((fila) => ({ ...fila, cantidad: numero(fila.cantidad) }))
			},
			{
				titulo: 'Consumo por orden de fabricación',
				columnas: [
					{ clave: 'orden', etiqueta: 'Orden', formato: 'texto' },
					{ clave: 'insumos', etiqueta: 'Insumos', formato: 'numero' },
					...(importes ? [{ clave: 'valor', etiqueta: 'Valor', formato: 'moneda' as const }] : [])
				],
				filas: porOrden
			}
		]
	};
}

const GENERADORES = {
	ventas,
	cotizaciones: cotizacionesReporte,
	produccion,
	insumos: insumosReporte
} satisfies Record<SeccionReporte, (contexto: Contexto) => Promise<unknown>>;

export async function generarReporte(
	seccion: SeccionReporte,
	rango: Rango,
	importes: boolean,
	periodo?: Periodo
): Promise<Reporte> {
	const contexto: Contexto = {
		rango,
		previo: rangoPrevio(rango, periodo),
		agrupacion: agrupacionPara(rango),
		importes
	};
	const contenido = await GENERADORES[seccion](contexto);
	return {
		seccion,
		rango: contexto.rango,
		previo: contexto.previo,
		agrupacion: contexto.agrupacion,
		...contenido
	};
}

export async function reporteDe({ seccion, periodo, desde, hasta }: ConsultaReporte) {
	const usuario = await requirePermission('reportes', 'view');
	const rango = rangoDe(periodo, hoyLocal(), { desde, hasta });
	return generarReporte(seccion, rango, await puedeVerImportes(usuario), periodo);
}
