import 'dotenv/config';
import pg from 'pg';
import XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { cotizador, leerHojas, marcaTemporal, normalizarTransportista, unir } from './datos.mjs';
import { Clientes, limpiarNombreCliente } from './clientes.mjs';
import { construirModelo } from './modelo.mjs';

const RETIRA_EN_FABRICA = 'Retira en fábrica';
const redondear = (valor) => Number(valor.toFixed(2));

const { values: opciones, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		cotizaciones: { type: 'string' },
		informe: { type: 'string' },
		hasta: { type: 'string' },
		confirmar: { type: 'boolean', default: false },
		reemplazar: { type: 'boolean', default: false }
	}
});

const [archivo] = positionals;
if (!archivo || !opciones.cotizaciones) {
	console.error(
		'Uso: node scripts/historico/importar.mjs <planilla.xlsx> --cotizaciones <oficial.json> [--informe informe.xlsx] [--hasta AAAA-MM-DD] [--reemplazar] [--confirmar]'
	);
	process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');

const hoy = new Date().toISOString().slice(0, 10);
const cotizacion = cotizador(JSON.parse(readFileSync(opciones.cotizaciones, 'utf8')));
const { ordenes, ventas, sueltos, informe } = construirModelo(leerHojas(archivo), {
	hoy,
	hasta: opciones.hasta
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const consulta = async (sql, parametros = []) => (await db.query(sql, parametros)).rows;

async function insertarVarios(tabla, columnas, filas) {
	for (let desde = 0; desde < filas.length; desde += 500) {
		const lote = filas.slice(desde, desde + 500);
		const parametros = [];
		const tuplas = lote.map((fila) => {
			const marcadores = columnas.map((columna) => {
				parametros.push(fila[columna] ?? null);
				return `$${parametros.length}`;
			});
			return `(${marcadores.join(', ')})`;
		});
		await db.query(
			`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES ${tuplas.join(', ')}`,
			parametros
		);
	}
}

async function idEstado(flujo, slug) {
	const [fila] = await consulta('SELECT id FROM estados WHERE flujo = $1 AND slug = $2', [
		flujo,
		slug
	]);
	if (!fila) throw new Error(`No existe el estado ${flujo}/${slug}`);
	return fila.id;
}

async function borrarImportacionAnterior() {
	await consulta(`DELETE FROM ordenes_fabricacion WHERE linea_pedido_id IN (
		SELECT l.id FROM lineas_pedido l JOIN pedidos p ON p.id = l.pedido_id WHERE p.historico)`);
	const [{ count: pedidos }] = await consulta(
		'WITH borrados AS (DELETE FROM pedidos WHERE historico RETURNING 1) SELECT count(*)::int FROM borrados'
	);
	await consulta(
		"DELETE FROM unidades_fabricacion WHERE orden_fabricacion_id IS NULL AND numero_serie LIKE 'H-%'"
	);
	await consulta(`DELETE FROM contactos c WHERE c.historico
		AND NOT EXISTS (SELECT 1 FROM pedidos p WHERE c.id IN (p.contacto_id, p.contacto_distribuidor_id))
		AND NOT EXISTS (SELECT 1 FROM cotizaciones q WHERE c.id IN (q.contacto_id, q.contacto_distribuidor_id))
		AND NOT EXISTS (SELECT 1 FROM proveedores v WHERE v.contacto_id = c.id)
		AND NOT EXISTS (SELECT 1 FROM ubicaciones_stock u WHERE u.contacto_distribuidor_id = c.id)`);
	return pedidos;
}

const resumen = {
	pedidos: 0,
	lineas: 0,
	ordenes: 0,
	unidades: 0,
	escapesNumerados: 0,
	escapesSueltos: 0,
	pagos: 0,
	clientesExistentes: 0,
	clientesNuevos: 0,
	variantesDeNuevos: 0
};
const vinculosClientes = new Map();

try {
	await db.query('BEGIN');

	const [{ count: previos }] = await consulta('SELECT count(*)::int FROM pedidos WHERE historico');
	if (previos && !opciones.reemplazar) {
		throw new Error(
			`Ya hay ${previos} pedidos históricos importados. Usá --reemplazar para volver a importar.`
		);
	}
	if (opciones.reemplazar) resumen.borrados = await borrarImportacionAnterior();

	const numerosOF = ordenes.map((o) => Number(o.numero));
	const ocupadas = await consulta('SELECT id FROM ordenes_fabricacion WHERE id = ANY($1::int[])', [
		numerosOF
	]);
	if (ocupadas.length) {
		throw new Error(
			`Estos números de OF ya existen en el sistema: ${ocupadas.map((o) => o.id).join(', ')}`
		);
	}

	const entregado = await idEstado('pedido', 'entregado');
	const terminado = await idEstado('fabricacion', 'terminado');

	const clientes = new Clientes(
		await consulta('SELECT id, razon_social, nombre, apellido FROM contactos')
	);
	const creados = new Set();
	async function contactoDe(nombre, crear) {
		const original = nombre ?? 'Cliente sin identificar';
		if (vinculosClientes.has(original)) return vinculosClientes.get(original).id;
		const encontrado = clientes.buscar(original);
		if (encontrado) {
			const variante = creados.has(encontrado.id);
			resumen[variante ? 'variantesDeNuevos' : 'clientesExistentes']++;
			const [{ razon_social }] = await consulta(
				'SELECT razon_social FROM contactos WHERE id = $1',
				[encontrado.id]
			);
			vinculosClientes.set(original, {
				id: encontrado.id,
				via: variante ? 'variante de uno nuevo' : encontrado.via,
				razon_social
			});
			return encontrado.id;
		}
		if (!crear) {
			vinculosClientes.set(original, { id: null, via: 'sin contacto', razon_social: null });
			return null;
		}
		const razonSocial = limpiarNombreCliente(original) || 'Cliente sin identificar';
		const [{ id }] = await consulta(
			'INSERT INTO contactos (razon_social, es_cliente, historico) VALUES ($1, true, true) RETURNING id',
			[razonSocial]
		);
		clientes.indexar({ id, razon_social: razonSocial });
		creados.add(id);
		resumen.clientesNuevos++;
		vinculosClientes.set(original, { id, via: 'nuevo', razon_social: original });
		return id;
	}

	async function crearPedido(o, origen) {
		const contactoId = await contactoDe(o.cliente, true);
		const tipoCambio = cotizacion(o.fecha);
		const lineas = [...o.items, ...o.anexos];
		const subtotal = lineas.reduce((total, item) => total + item.cantidad * item.precio, 0);
		if (subtotal === 0 && o.totalResumen > 0) {
			o.items[0].precio = o.totalResumen / o.items[0].cantidad;
		}
		const precioTotal = redondear(
			lineas.reduce((total, item) => total + item.cantidad * redondear(item.precio), 0)
		);
		const observaciones = unir(
			[
				`Importado del histórico de producción y ventas (${origen}). Importes sin IVA.`,
				...o.notas,
				o.detalle.observaciones && `Observaciones: ${o.detalle.observaciones}`,
				o.detalle.contacto && `Contacto: ${o.detalle.contacto}`,
				o.detalle.pago && `Pago: ${o.detalle.pago}`,
				o.detalle.entrega && `Entrega: ${o.detalle.entrega}`,
				o.detalle.remito && `Remito: ${o.detalle.remito}`,
				...o.cobrosInfo.map(
					(c) =>
						`Cobranza ${c.fecha ?? ''}: ${unir([c.factura && `factura ${c.factura}`, c.recibo && `recibo ${c.recibo}`, c.estado, c.observaciones]) ?? 'sin importe'}`
				),
				o.detalle.fuentes && `Fuentes: ${o.detalle.fuentes}`
			],
			'\n'
		);
		const [pedido] = await consulta(
			`INSERT INTO pedidos (numero_pedido, contacto_id, fecha_pedido, fecha_entrega_real, estado_id, moneda,
				tipo_cambio, precio_total, observaciones, factura, tipo_trabajo, entrega_transportista, historico, created_at)
			VALUES ($1, $2, $3, $4, $5, 'ARS', $6, $7, $8, $9, $10, $11, true, $3) RETURNING id`,
			[
				`H-${o.numero}`,
				contactoId,
				marcaTemporal(o.fecha),
				marcaTemporal(o.fechaEntrega),
				entregado,
				tipoCambio,
				precioTotal,
				observaciones,
				unir(o.facturas, ', '),
				o.reparacion ? 'reparacion' : 'fabricacion',
				normalizarTransportista(o.transporte, RETIRA_EN_FABRICA)
			]
		);
		resumen.pedidos++;

		const idsLineas = [];
		for (const [orden, item] of lineas.entries()) {
			const [linea] = await consulta(
				`INSERT INTO lineas_pedido (pedido_id, es_personalizado, descripcion_personalizada, cantidad,
					precio_unitario, precio_lista_unitario, orden_linea, created_at)
				VALUES ($1, true, $2, $3, $4, $4, $5, $6) RETURNING id`,
				[
					pedido.id,
					item.descripcion,
					item.cantidad,
					redondear(item.precio),
					orden,
					marcaTemporal(o.fecha)
				]
			);
			idsLineas.push(linea.id);
			resumen.lineas++;
		}

		const pagos = o.pagos.map((pago) => {
			const conCambio = pago.moneda === 'USD';
			const tipo = conCambio ? cotizacion(pago.fecha) : null;
			return {
				pedido_id: pedido.id,
				monto: pago.monto,
				moneda: pago.moneda,
				tipo_cambio: tipo,
				monto_aplicado: redondear(conCambio ? pago.monto * tipo : pago.monto),
				recibo: pago.recibo,
				metodo_pago: pago.metodo,
				observaciones: pago.observaciones,
				fecha_pago: marcaTemporal(pago.fecha),
				created_at: marcaTemporal(pago.fecha)
			};
		});
		await insertarVarios(
			'pagos',
			[
				'pedido_id',
				'monto',
				'moneda',
				'tipo_cambio',
				'monto_aplicado',
				'recibo',
				'metodo_pago',
				'observaciones',
				'fecha_pago',
				'created_at'
			],
			pagos
		);
		resumen.pagos += pagos.length;
		return idsLineas;
	}

	for (const o of ordenes) {
		const idsLineas = await crearPedido(o, `OF ${o.numero}`);
		const lineas = [...o.items, ...o.anexos];
		const unidades = [];
		for (const item of o.items) {
			const total = Math.max(item.cantidad, item.escapes.length);
			for (let i = 0; i < total; i++) {
				const escape = item.escapes[i];
				unidades.push({
					numero: escape?.numero ?? null,
					descripcion: escape?.descripcion ?? (o.items.length > 1 ? item.nombre : null),
					observaciones: escape ? unir([escape.detalle, ...escape.notas]) : null,
					fecha_fabricacion: marcaTemporal(escape?.fecha ?? o.fechaEntrega ?? o.fecha)
				});
				if (escape) resumen.escapesNumerados++;
			}
		}
		const fechasEscapes = o.escapes
			.map((e) => e.fecha)
			.filter(Boolean)
			.sort();
		const fin = o.fechaEntrega ?? fechasEscapes.at(-1) ?? o.fecha;
		const nombre = o.items[0].nombre + (o.items.length > 1 ? ` y ${o.items.length - 1} más` : '');
		const detalleItems = lineas.map((item) =>
			unir([`• ${item.cantidad} × ${item.descripcion}`, item.ficha], '\n   ')
		);
		await consulta(
			`INSERT INTO ordenes_fabricacion (id, linea_pedido_id, nombre_trabajo, cantidad_total, fecha_inicio,
				fecha_fin_real, observaciones, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $5)`,
			[
				Number(o.numero),
				idsLineas[0],
				nombre.slice(0, 200),
				unidades.length,
				marcaTemporal(o.fecha),
				marcaTemporal(fin),
				unir(
					[
						...detalleItems,
						o.repeticiones.length > 0 &&
							`Repite el diseño del escape N° ${[...new Set(o.repeticiones)].join(', ')}`
					],
					'\n'
				)
			]
		);
		resumen.ordenes++;
		await insertarVarios(
			'unidades_fabricacion',
			[
				'orden_fabricacion_id',
				'numero_serie',
				'numero',
				'descripcion',
				'observaciones',
				'fecha_fabricacion',
				'estado_id',
				'created_at'
			],
			unidades.map((unidad, i) => ({
				...unidad,
				orden_fabricacion_id: Number(o.numero),
				numero_serie: `${o.numero}-${String(i + 1).padStart(3, '0')}`,
				estado_id: terminado,
				created_at: marcaTemporal(o.fecha)
			}))
		);
		resumen.unidades += unidades.length;
	}

	for (const venta of ventas) await crearPedido(venta, 'cobro sin OF');

	const filasSueltas = [];
	for (const escape of sueltos) {
		filasSueltas.push({
			numero_serie: `H-E${escape.numero}`,
			numero: escape.numero,
			contacto_id: escape.cliente ? await contactoDe(escape.cliente, false) : null,
			descripcion: escape.descripcion,
			observaciones: unir([
				escape.cliente && `Cliente: ${escape.cliente}`,
				escape.detalle,
				...escape.notas
			]),
			fecha_fabricacion: marcaTemporal(escape.fecha),
			estado_id: terminado,
			created_at: marcaTemporal(escape.fecha)
		});
	}
	await insertarVarios(
		'unidades_fabricacion',
		[
			'numero_serie',
			'numero',
			'contacto_id',
			'descripcion',
			'observaciones',
			'fecha_fabricacion',
			'estado_id',
			'created_at'
		],
		filasSueltas
	);
	resumen.escapesSueltos = filasSueltas.length;

	await consulta(
		"SELECT setval(pg_get_serial_sequence('ordenes_fabricacion', 'id'), (SELECT max(id) FROM ordenes_fabricacion))"
	);

	await db.query(opciones.confirmar ? 'COMMIT' : 'ROLLBACK');
	console.log(
		opciones.confirmar
			? '[historico] Importación confirmada.'
			: '[historico] Simulación: no se guardó nada. Agregá --confirmar para importar.'
	);
	console.table(resumen);
	console.table({
		'OF reasignadas': informe.reasignadas.length,
		'OF con fecha estimada': informe.fechasOF.length,
		'Escapes con fecha corregida o estimada': informe.fechasEscapes.length,
		'OF excluidas por --hasta': informe.excluidas.length,
		'OF con entrega pendiente': informe.pendientes.length,
		'Escapes sin OF': informe.escapesSueltos.length,
		'Ventas sin OF creadas': ventas.length,
		'Cobros sin OF ni importe': informe.cobrosSinOF.length
	});

	if (opciones.informe) {
		const libro = XLSX.utils.book_new();
		const agregar = (nombre, filas) =>
			XLSX.utils.book_append_sheet(
				libro,
				XLSX.utils.json_to_sheet(filas.length ? filas : [{ resultado: 'Sin casos' }]),
				nombre
			);
		agregar(
			'Resumen',
			Object.entries(resumen).map(([concepto, cantidad]) => ({ concepto, cantidad }))
		);
		agregar(
			'Clientes',
			[...vinculosClientes].map(([planilla, vinculo]) => ({
				'Nombre en la planilla': planilla,
				'Contacto en el sistema':
					vinculo.via === 'nuevo'
						? '(creado)'
						: vinculo.via === 'sin contacto'
							? '(solo en el escape)'
							: vinculo.razon_social,
				'ID contacto': vinculo.id,
				Vinculo: vinculo.via
			}))
		);
		agregar('OF reasignadas', informe.reasignadas);
		agregar('OF fecha estimada', informe.fechasOF);
		agregar('Fechas de escapes', informe.fechasEscapes);
		agregar('Entrega pendiente', informe.pendientes);
		agregar('Excluidas', informe.excluidas);
		agregar('Escapes sin OF', informe.escapesSueltos);
		agregar('Cobros sin OF', informe.cobrosSinOF);
		XLSX.writeFile(libro, opciones.informe);
		console.log(`[historico] Informe: ${opciones.informe}`);
	}
} catch (error) {
	await db.query('ROLLBACK');
	console.error(`[historico] No se importó nada: ${error.message}`);
	if (error.detail) console.error(`[historico] ${error.detail}`);
	process.exitCode = 1;
} finally {
	db.release();
	await pool.end();
}
