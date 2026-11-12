import { and, eq, isNull } from 'drizzle-orm';
import logoUrl from '$lib/assets/Logo.png';
import { db } from '$lib/server/db';
import {
	contactos,
	cotizaciones,
	empleados,
	lineas_cotizacion,
	productos
} from '$lib/server/db/schema';
import { obtenerEmpresa } from '$lib/server/empresa';
import { obtenerCotizacionDolarBNA } from '$lib/server/integraciones/tipo-cambio-bna';
import { logoEmpresa } from '$lib/server/pdf/imagenes';
import { formatearCuit } from '$lib/utils/cuit';
import { calcularIva21, redondearPrecio } from '$lib/utils/precios';
import { renderizarCotizacion } from './pdf/render';

export type MonedaPDFCotizacion = 'USD' | 'ARS';

const unir = (partes: (string | null | undefined)[], separador = ', ') =>
	partes
		.map((p) => p?.trim())
		.filter(Boolean)
		.join(separador) || null;

export async function generarPDFCotizacion(
	cotizacionId: number,
	moneda: MonedaPDFCotizacion = 'USD'
) {
	const empresaPromesa = obtenerEmpresa();
	const [[cot], lineas, empresa, logo, tipoCambio] = await Promise.all([
		db
			.select({
				numero: cotizaciones.numero_cotizacion,
				precio_total: cotizaciones.precio_total,
				descuento: cotizaciones.descuento_global_porcentaje,
				incluir_iva: cotizaciones.incluir_iva,
				condiciones_pago: cotizaciones.condiciones_pago,
				descripcion: cotizaciones.descripcion,
				validez_dias: cotizaciones.validez_dias,
				created_at: cotizaciones.created_at,
				cliente: contactos,
				responsable_nombre: empleados.nombre,
				responsable_apellido: empleados.apellido
			})
			.from(cotizaciones)
			.leftJoin(contactos, eq(cotizaciones.contacto_id, contactos.id))
			.leftJoin(empleados, eq(cotizaciones.asignada_a, empleados.id))
			.where(eq(cotizaciones.id, cotizacionId))
			.limit(1),
		db
			.select({
				codigo: productos.codigo,
				descripcion: lineas_cotizacion.descripcion,
				cantidad: lineas_cotizacion.cantidad,
				precio: lineas_cotizacion.precio_unitario,
				subtotal: lineas_cotizacion.subtotal
			})
			.from(lineas_cotizacion)
			.leftJoin(productos, eq(productos.id, lineas_cotizacion.producto_id))
			.where(
				and(
					eq(lineas_cotizacion.cotizacion_id, cotizacionId),
					eq(lineas_cotizacion.visible_cliente, true),
					isNull(lineas_cotizacion.insumo_id)
				)
			)
			.orderBy(lineas_cotizacion.orden_linea, lineas_cotizacion.id),
		empresaPromesa,
		empresaPromesa.then((e) => logoEmpresa(e?.logo_url, logoUrl).catch(() => null)),
		moneda === 'ARS' ? obtenerCotizacionDolarBNA() : null
	]);
	if (!cot) throw new Error('Cotización no encontrada');

	const factor = tipoCambio?.venta ?? 1;
	const convertir = (valor: number) => redondearPrecio(valor * factor);
	const subtotalUsd = redondearPrecio(
		lineas.reduce((s, l) => s + (l.subtotal ?? l.cantidad * l.precio), 0)
	);
	const descuentoPorcentaje = cot.descuento ?? 0;
	const descuentoUsd = redondearPrecio(subtotalUsd * (descuentoPorcentaje / 100));
	const ivaUsd = cot.incluir_iva ? calcularIva21(subtotalUsd - descuentoUsd) : null;
	const totalUsd = cot.precio_total ?? redondearPrecio(subtotalUsd - descuentoUsd + (ivaUsd ?? 0));

	const cliente = cot.cliente;
	const contacto = unir([cliente?.nombre, cliente?.apellido], ' ');
	const razonSocial = cliente?.razon_social?.trim() || contacto || 'Cliente';
	const fecha = cot.created_at ?? new Date();
	const validezDias = cot.validez_dias ?? 15;
	const validoHasta = new Date(fecha.getTime() + validezDias * 86_400_000);

	const pdf = await renderizarCotizacion({
		numero: cot.numero,
		fecha,
		validoHasta,
		validezDias,
		moneda,
		tipoCambio,
		empresa: {
			razonSocial: empresa?.razon_social || 'Conforma',
			cuit: empresa?.cuit ? formatearCuit(empresa.cuit) : null,
			direccion: empresa?.direccion ?? null,
			telefono: empresa?.telefono ?? null,
			email: empresa?.email ?? null,
			logo
		},
		cliente: {
			razonSocial,
			contacto: contacto && contacto !== razonSocial ? contacto : null,
			cuit: cliente?.cuit ? formatearCuit(cliente.cuit) : null,
			direccion: unir([
				unir([cliente?.calle, cliente?.numero], ' '),
				cliente?.piso && `piso ${cliente.piso}`,
				cliente?.departamento && `depto. ${cliente.departamento}`,
				cliente?.ciudad,
				cliente?.provincia,
				cliente?.codigo_postal && `(${cliente.codigo_postal})`
			]),
			telefono: cliente?.telefono ?? null,
			email: cliente?.email ?? null
		},
		responsable: unir([cot.responsable_nombre, cot.responsable_apellido], ' '),
		referencia: cot.descripcion?.trim() || null,
		lineas: lineas.map((l) => ({
			codigo: l.codigo,
			descripcion: l.descripcion,
			cantidad: l.cantidad,
			precio: convertir(l.precio),
			importe: convertir(l.subtotal ?? l.cantidad * l.precio)
		})),
		subtotal: convertir(subtotalUsd),
		descuentoPorcentaje,
		descuento: convertir(descuentoUsd),
		iva: ivaUsd === null ? null : convertir(ivaUsd),
		total: convertir(totalUsd),
		condicionesPago:
			cot.condiciones_pago === null
				? '50% de anticipo al aprobar, saldo contra entrega.'
				: cot.condiciones_pago.trim()
	});

	return { pdf, clienteNombre: razonSocial, fechaCotizacion: fecha };
}
