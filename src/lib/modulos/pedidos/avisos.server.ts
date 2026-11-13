import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contactos, pedidos } from '$lib/server/db/schema';
import type { Ejecutor } from '$lib/server/estados';
import {
	combinar,
	notificar,
	participantesPedido,
	type PermisoDestino
} from '$lib/modulos/notificaciones/notificaciones.server';
import { formatearMoneda } from '$lib/utils/precios';
import { PEDIDO_SLUG } from './tipos';

const PRODUCCION: PermisoDestino = { modulo: 'fabricacion', accion: 'create' };
const DESPACHO: PermisoDestino = { modulo: 'envios', accion: 'edit' };

async function datosPedido(pedidoId: number, ejecutor: Ejecutor) {
	const [pedido] = await ejecutor
		.select({
			numero: pedidos.numero_pedido,
			cliente: contactos.razon_social,
			moneda: pedidos.moneda
		})
		.from(pedidos)
		.leftJoin(contactos, eq(contactos.id, pedidos.contacto_id))
		.where(eq(pedidos.id, pedidoId));
	return pedido;
}

async function avisar(
	pedidoId: number,
	actor: number,
	armar: (pedido: { numero: string; cliente: string | null; moneda: 'USD' | 'ARS' }) => {
		titulo: string;
		mensaje: string;
	},
	{ permisos = [], ejecutor = db }: { permisos?: PermisoDestino[]; ejecutor?: Ejecutor } = {}
) {
	const pedido = await datosPedido(pedidoId, ejecutor);
	if (!pedido) return;
	const destinatarios = combinar(await participantesPedido(pedidoId, ejecutor), { permisos });
	await notificar(
		destinatarios,
		{ modulo: 'pedido', link: `/pedidos/${pedidoId}`, ...armar(pedido) },
		{ actor, ejecutor }
	);
}

export const avisarPedidoNuevo = (pedidoId: number, actor: number) =>
	avisar(
		pedidoId,
		actor,
		({ numero, cliente }) => ({
			titulo: `Nuevo pedido ${numero}`,
			mensaje: `${cliente ?? 'Sin cliente'} · listo para planificar la producción.`
		}),
		{ permisos: [PRODUCCION] }
	);

export const avisarCambioEstadoPedido = (
	pedidoId: number,
	estado: { slug: string; nombre: string },
	actor: number,
	ejecutor: Ejecutor = db
) => {
	const listo = estado.slug === PEDIDO_SLUG.COMPLETADO;
	return avisar(
		pedidoId,
		actor,
		({ numero, cliente }) => ({
			titulo: listo ? `Pedido ${numero} listo para entregar` : `Pedido ${numero}: ${estado.nombre}`,
			mensaje: listo
				? `Producción terminada. Coordiná la entrega con ${cliente ?? 'el cliente'}.`
				: `${cliente ?? 'Sin cliente'} · cambió a «${estado.nombre}».`
		}),
		{ permisos: listo ? [DESPACHO] : [], ejecutor }
	);
};

export const avisarPago = (pedidoId: number, monto: number, actor: number) =>
	avisar(pedidoId, actor, ({ numero, cliente, moneda }) => ({
		titulo: `Pago registrado en ${numero}`,
		mensaje: `${formatearMoneda(monto, moneda)} de ${cliente ?? 'el cliente'}.`
	}));

export const avisarEnvio = (pedidoId: number, entregado: boolean, actor: number) =>
	avisar(pedidoId, actor, ({ numero, cliente }) => ({
		titulo: entregado ? `Pedido ${numero} entregado` : `Pedido ${numero} despachado`,
		mensaje: entregado
			? `${cliente ?? 'El cliente'} recibió el envío.`
			: `Salió hacia ${cliente ?? 'el cliente'}.`
	}));
