import { db } from '$lib/server/db';
import { pedidos } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export async function generarNumeroPedido() {
	const primerPedido = 'P-0001';

	// Buscar el último pedido
	const [ultimoPedido] = await db
		.select({
			numero_pedido: pedidos.numero_pedido
		})
		.from(pedidos)
		.orderBy(desc(pedidos.id))
		.limit(1);

	if (!ultimoPedido) {
		return primerPedido;
	}

	// Extraer el número del formato P-XXXX
	const match = ultimoPedido.numero_pedido.match(/P-(\d+)/);
	if (!match) return primerPedido;

	const numero = parseInt(match[1]) + 1;
	return `P-${numero.toString().padStart(5, '0')}`;
}
