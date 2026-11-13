import * as v from 'valibot';
import { query } from '$app/server';
import { obtenerContactoPorId, obtenerContactosCliente } from '../contactos/contactos.remote';
import { getProductoById, getProductosCatalogo } from '../productos/productos.remote';
import { getStockDisponibilidad } from '../stock/stock.remote';
import {
	getCategoriasInsumo,
	getInsumos,
	getTiposInsumo,
	getUnidadesInsumo
} from '../insumos/insumos.remote';

const LIMITE_CATALOGO_PEDIDO = 100;

export const getDatosCreacionPedido = query(
	v.object({
		contactoId: v.optional(v.string()),
		productoId: v.optional(v.string()),
		stockUbicacionId: v.optional(v.string()),
		incluirStock: v.optional(v.boolean(), false)
	}),
	async ({ productoId, stockUbicacionId, incluirStock }) => {
		const [clientes, productos, insumos, tiposInsumo, categoriasInsumo, unidadesInsumo, stock] =
			await Promise.all([
				obtenerContactosCliente({ limit: LIMITE_CATALOGO_PEDIDO }),
				getProductosCatalogo({ limit: LIMITE_CATALOGO_PEDIDO }),
				getInsumos({ limit: LIMITE_CATALOGO_PEDIDO }),
				getTiposInsumo(),
				getCategoriasInsumo(),
				getUnidadesInsumo(),
				incluirStock ? getStockDisponibilidad() : undefined
			]);

		let clientesResultado = clientes;
		let productosResultado = productos;
		const ubicacionSolicitada = stock?.ubicaciones.find(
			(ubicacion) => String(ubicacion.id) === stockUbicacionId
		);

		if (
			ubicacionSolicitada?.contacto_distribuidor_id &&
			!clientesResultado.data.some(
				(cliente) => cliente.id === ubicacionSolicitada.contacto_distribuidor_id
			)
		) {
			const contactoStock = await obtenerContactoPorId(
				ubicacionSolicitada.contacto_distribuidor_id
			);
			clientesResultado = {
				...clientesResultado,
				data: [...clientesResultado.data, contactoStock]
			};
		}

		if (
			productoId &&
			!productosResultado.data.some((producto) => String(producto.id) === productoId)
		) {
			const productoInicial = await getProductoById(productoId);
			productosResultado = {
				...productosResultado,
				data: [
					{
						...productoInicial,
						marca: null,
						modelo: null,
						portada_id: null,
						receta_pendiente: false
					},
					...productosResultado.data
				]
			};
		}

		return {
			clientes: clientesResultado,
			productos: productosResultado,
			insumos,
			tiposInsumo,
			categoriasInsumo,
			unidadesInsumo,
			stock: stock ?? { ubicaciones: [], productos: [], distribuidores: [], balances: [] }
		};
	}
);
