import { and, eq, or } from 'drizzle-orm';
import logoUrl from '$lib/assets/Logo.png';
import { db } from '$lib/server/db';
import { adjuntos } from '$lib/server/db/schema';
import { obtenerEmpresa } from '$lib/server/empresa';
import { leerObjeto } from '$lib/server/almacenamiento';
import { imagenEnCache, logoEmpresa } from '$lib/server/pdf/imagenes';
import { formatearAtributo } from '$lib/modulos/productos/atributos';
import type { MaterialSnapshot } from '$lib/modulos/ventas/tipos';
import { getOrdenFabricacion } from './fabricacion-consultas.remote';
import { ETIQUETA_PRIORIDAD, PRIORIDAD_FABRICACION } from './tipos';
import { renderizarOrden } from './pdf/render';

async function planosDe(ordenId: number, productoId: number | null | undefined) {
	const condiciones = [
		and(eq(adjuntos.orden_fabricacion_id, ordenId), eq(adjuntos.categoria, 'plano'))
	];
	if (productoId) {
		condiciones.push(and(eq(adjuntos.producto_id, productoId), eq(adjuntos.categoria, 'plano')));
	}
	const filas = await db
		.select({ id: adjuntos.id, key: adjuntos.archivo_key, nombre: adjuntos.nombre_original })
		.from(adjuntos)
		.where(or(...condiciones))
		.orderBy(adjuntos.id);
	return Promise.all(
		filas.map(async (plano) => ({
			nombre: plano.nombre,
			imagen: await imagenEnCache(plano.key, () => leerObjeto(plano.key), { vertical: true }).catch(
				(error) => {
					console.error(`[pdf] Plano ${plano.id} (${plano.nombre}) no se pudo preparar`, error);
					return null;
				}
			)
		}))
	);
}

export async function generarPDFFabricacion(ordenId: number) {
	const orden = await getOrdenFabricacion(ordenId);
	const [planos, empresa] = await Promise.all([
		planosDe(ordenId, orden.producto?.id),
		obtenerEmpresa()
	]);
	const logo = await logoEmpresa(empresa?.logo_url, logoUrl).catch(() => null);

	const medidas = orden.atributos
		.map((grupo) => ({
			nombre: grupo.nombre,
			valores: grupo.atributos
				.filter((a) => a.tipo !== 'texto')
				.map((a) => `${a.etiqueta}: ${formatearAtributo(a)}`)
				.join(' · ')
		}))
		.filter((grupo) => grupo.valores);
	const textos = orden.atributos.flatMap((grupo) =>
		grupo.atributos.filter((a) => a.tipo === 'texto').map((a) => `${a.etiqueta}: ${a.valor}`)
	);
	const material = (m: MaterialSnapshot, adicional: boolean) => ({
		codigo: m.codigo ?? null,
		nombre: m.nombre,
		cantidad: m.cantidad,
		unidad: m.unidad ?? 'unidad',
		adicional
	});
	const prioridad = orden.prioridad ?? PRIORIDAD_FABRICACION.NORMAL;

	return renderizarOrden({
		id: orden.id,
		trabajo: orden.nombre_trabajo,
		producto: orden.producto
			? [orden.producto.codigo, orden.producto.nombre].filter(Boolean).join(' · ')
			: orden.descripcion_producto,
		pedido: orden.pedido_numero ?? null,
		cliente: orden.cliente_nombre ?? null,
		esParaStock: orden.es_para_stock,
		emision: orden.created_at ?? new Date(),
		entregaEstimada: orden.fecha_fin_estimada,
		cantidad: orden.cantidad_total,
		terminadas: orden.cantidad_producida,
		prioridad: {
			nombre: ETIQUETA_PRIORIDAD[prioridad]?.nombre ?? 'Normal',
			urgente: prioridad > PRIORIDAD_FABRICACION.NORMAL
		},
		responsable: orden.empleado
			? [orden.empleado.nombre, orden.empleado.apellido].filter(Boolean).join(' ')
			: null,
		medidas,
		notas: [orden.observaciones, orden.producto?.notas_fabricacion, ...textos].filter(
			(nota): nota is string => !!nota?.trim()
		),
		materiales: [
			...(orden.insumos_requeridos as MaterialSnapshot[]).map((m) => material(m, false)),
			...(orden.insumos_adicionales as MaterialSnapshot[]).map((m) => material(m, true))
		],
		empresa: { razonSocial: empresa?.razon_social || 'Conforma', logo },
		planos,
		impreso: new Date()
	});
}
