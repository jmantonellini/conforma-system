import 'dotenv/config';
import pg from 'pg';
import XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { OF_DUPLICADAS_EN_SISTEMA, cotizador, leerHojas, marcaTemporal, unir } from './datos.mjs';
import { Clientes } from './clientes.mjs';
import { construirModelo, construirTrabajos } from './modelo.mjs';
import { construirProductos, vincularProductos } from './productos.mjs';
import { crearEscritor } from './escritor.mjs';

const { values: opciones, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		cotizaciones: { type: 'string' },
		informe: { type: 'string' },
		confirmar: { type: 'boolean', default: false }
	}
});

const [archivo] = positionals;
if (!archivo || !opciones.cotizaciones) {
	console.error(
		'Uso: node scripts/historico/completar.mjs <planilla.xlsx> --cotizaciones <cotizaciones.json> [--informe informe.xlsx] [--confirmar]'
	);
	process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');

const hoy = new Date().toISOString().slice(0, 10);
const cotizacion = cotizador(JSON.parse(readFileSync(opciones.cotizaciones, 'utf8')));
const hojas = leerHojas(archivo, undefined, [
	'TRABAJOS 2003-2020',
	'FACTURAS 2007-2016',
	'CTAS CTES VIEJAS'
]);
const modelo = construirModelo(hojas, { hoy });
const trabajos = construirTrabajos(hojas, { hoy });

const vinculoTrabajo = new Map();
for (const fila of hojas['ESCAPES FABRICADOS']) {
	const numeroEscape = Number(fila['N° ESCAPE']);
	const trabajo = fila['TRABAJO VINCULADO (2003-2020)'];
	if (numeroEscape && trabajo) {
		vinculoTrabajo.set(numeroEscape, {
			trabajo: String(trabajo).trim(),
			confianza: fila['CONFIANZA (trabajo)'] ? String(fila['CONFIANZA (trabajo)']).trim() : null
		});
	}
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const consulta = async (sql, parametros = []) => (await db.query(sql, parametros)).rows;

const resumen = {
	pedidos: 0,
	lineas: 0,
	ordenes: 0,
	unidades: 0,
	escapesNumerados: 0,
	pagos: 0,
	clientesExistentes: 0,
	clientesNuevos: 0,
	variantesDeNuevos: 0,
	escapesReubicados: 0,
	escapesEnUnidadExistente: 0,
	escapesAgregadosAOF: 0,
	sueltosQuitados: 0,
	escapesVinculadosATrabajo: 0
};
const informe = { reubicados: [], omitidos: [] };

try {
	await db.query('BEGIN');
	const terminado = (
		await consulta("SELECT id FROM estados WHERE flujo = 'fabricacion' AND slug = 'terminado'")
	)[0].id;
	const ordenesExistentes = new Set(
		(await consulta('SELECT id FROM ordenes_fabricacion')).map((o) => o.id)
	);
	const pedidosExistentes = new Set(
		(await consulta("SELECT numero_pedido FROM pedidos WHERE numero_pedido LIKE 'T-%'")).map(
			(p) => p.numero_pedido
		)
	);
	const duplicadosLista = new Set(
		(
			await consulta(
				'SELECT numero FROM unidades_fabricacion WHERE numero IS NOT NULL GROUP BY numero HAVING count(*) > 1'
			)
		).map((u) => u.numero)
	);

	const escritor = crearEscritor(db, {
		cotizacion,
		clientes: new Clientes(
			await consulta('SELECT id, razon_social, nombre, apellido FROM contactos')
		),
		resumen
	});

	const nuevas = modelo.ordenes.filter(
		(o) => !ordenesExistentes.has(Number(o.numero)) && !OF_DUPLICADAS_EN_SISTEMA.includes(o.numero)
	);
	for (const o of nuevas) await escritor.crearOrden(o);
	const ordenesNuevas = new Set(nuevas.map((o) => Number(o.numero)));

	for (const o of modelo.ordenes) {
		const ordenId = Number(o.numero);
		if (OF_DUPLICADAS_EN_SISTEMA.includes(o.numero)) continue;
		for (const escape of o.escapes) {
			if (duplicadosLista.has(escape.numero)) {
				informe.omitidos.push({ numero: escape.numero, motivo: 'N° repetido en la lista' });
				continue;
			}
			const unidades = await consulta(
				`SELECT id, orden_fabricacion_id, numero_serie, producto_id FROM unidades_fabricacion
				WHERE numero = $1 ORDER BY id`,
				[escape.numero]
			);
			const enDestino = unidades.find((u) => u.orden_fabricacion_id === ordenId);
			const resto = unidades.filter((u) => u !== enDestino);
			if (!resto.length) continue;
			if (!enDestino && !ordenesNuevas.has(ordenId)) {
				const [libre] = await consulta(
					`SELECT id FROM unidades_fabricacion WHERE orden_fabricacion_id = $1 AND numero IS NULL
					ORDER BY id LIMIT 1`,
					[ordenId]
				);
				const observaciones = unir([escape.detalle, ...escape.notas]);
				if (libre) {
					await consulta(
						`UPDATE unidades_fabricacion SET numero = $2, descripcion = coalesce(descripcion, $3),
							observaciones = $4, fecha_fabricacion = $5, updated_at = now() WHERE id = $1`,
						[
							libre.id,
							escape.numero,
							escape.descripcion,
							observaciones,
							marcaTemporal(escape.fecha)
						]
					);
					resumen.escapesEnUnidadExistente++;
				} else {
					const [{ cantidad }] = await consulta(
						'SELECT count(*)::int AS cantidad FROM unidades_fabricacion WHERE orden_fabricacion_id = $1',
						[ordenId]
					);
					await consulta(
						`INSERT INTO unidades_fabricacion (orden_fabricacion_id, numero_serie, numero, descripcion,
							observaciones, fecha_fabricacion, estado_id, producto_id, created_at)
						VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $6)`,
						[
							ordenId,
							`${ordenId}-${String(cantidad + 1).padStart(3, '0')}`,
							escape.numero,
							escape.descripcion,
							observaciones,
							marcaTemporal(escape.fecha),
							terminado,
							resto[0].producto_id
						]
					);
					await consulta(
						'UPDATE ordenes_fabricacion SET cantidad_total = cantidad_total + 1 WHERE id = $1',
						[ordenId]
					);
					resumen.escapesAgregadosAOF++;
				}
			}
			for (const otra of resto) {
				if (otra.orden_fabricacion_id === null) {
					await consulta('DELETE FROM unidades_fabricacion WHERE id = $1', [otra.id]);
					resumen.sueltosQuitados++;
				} else {
					await consulta(
						`UPDATE unidades_fabricacion SET numero = NULL,
							observaciones = concat_ws(' · ', observaciones, $2::text), updated_at = now()
						WHERE id = $1`,
						[otra.id, `El escape N° ${escape.numero} se reasignó a la OF ${ordenId}`]
					);
					resumen.escapesReubicados++;
					informe.reubicados.push({
						numero: escape.numero,
						desde: otra.orden_fabricacion_id,
						hacia: ordenId
					});
				}
			}
		}
	}

	const pedidosTrabajo = new Map();
	for (const trabajo of trabajos) {
		if (pedidosExistentes.has(trabajo.numeroPedido)) continue;
		const { pedidoId } = await escritor.crearPedido(
			trabajo,
			`trabajo ${trabajo.numero}`,
			trabajo.numeroPedido
		);
		pedidosTrabajo.set(trabajo.numero, pedidoId);
	}

	for (const [numeroEscape, vinculo] of vinculoTrabajo) {
		const pedidoId = pedidosTrabajo.get(vinculo.trabajo);
		if (!pedidoId || duplicadosLista.has(numeroEscape)) continue;
		const filas = await consulta(
			`UPDATE unidades_fabricacion u SET pedido_id = $2,
				contacto_id = coalesce(u.contacto_id, (SELECT contacto_id FROM pedidos WHERE id = $2)),
				observaciones = concat_ws(' · ', u.observaciones, $3::text), updated_at = now()
			WHERE u.numero = $1 AND u.orden_fabricacion_id IS NULL AND u.pedido_id IS NULL
			RETURNING u.id`,
			[
				numeroEscape,
				pedidoId,
				`Vinculado al trabajo ${vinculo.trabajo}${vinculo.confianza ? ` por: ${vinculo.confianza}` : ''}`
			]
		);
		resumen.escapesVinculadosATrabajo += filas.length;
	}

	const completo = construirProductos({
		ordenes: [...modelo.ordenes, ...trabajos],
		sueltos: modelo.sueltos
	});
	const votos = new Map();
	const votar = (clave, productoId) => {
		if (!productoId) return;
		const conteo = votos.get(clave) ?? new Map();
		conteo.set(productoId, (conteo.get(productoId) ?? 0) + 1);
		votos.set(clave, conteo);
	};
	const lineasActuales = new Map(
		(
			await consulta(`SELECT p.numero_pedido, l.orden_linea, l.producto_id FROM lineas_pedido l
				JOIN pedidos p ON p.id = l.pedido_id WHERE p.historico AND l.producto_id IS NOT NULL`)
		).map((l) => [`${l.numero_pedido}|${l.orden_linea}`, l.producto_id])
	);
	for (const linea of completo.lineas)
		votar(linea.clave, lineasActuales.get(`${linea.pedido}|${linea.orden}`));
	const unidadesActuales = new Map(
		(
			await consulta(
				'SELECT numero, producto_id FROM unidades_fabricacion WHERE numero IS NOT NULL AND producto_id IS NOT NULL'
			)
		).map((u) => [u.numero, u.producto_id])
	);
	const porNumero = [...completo.unidadesOF, ...completo.unidadesSueltas].filter((u) => u.numero);
	for (const unidad of porNumero) votar(unidad.clave, unidadesActuales.get(unidad.numero));
	const existentes = new Map(
		[...votos].map(([clave, conteo]) => [clave, [...conteo].sort((a, b) => b[1] - a[1])[0][0]])
	);
	const nuevasClaves = new Set(nuevas.map((o) => `H-${o.numero}`));
	const productos = await vincularProductos(
		consulta,
		{
			productos: completo.productos,
			lineas: completo.lineas.filter(
				(l) => nuevasClaves.has(l.pedido) || pedidosTrabajo.has(l.pedido)
			),
			unidadesOF: completo.unidadesOF.filter((u) => ordenesNuevas.has(Number(u.of))),
			unidadesSueltas: []
		},
		{ existentes, soloSinProducto: true, unidadesPorNumero: porNumero }
	);
	Object.assign(resumen, {
		productosNuevos: productos.productos,
		lineasConProducto: productos.lineasVinculadas,
		unidadesConProducto: productos.unidadesVinculadas
	});

	await consulta(
		"SELECT setval(pg_get_serial_sequence('ordenes_fabricacion', 'id'), (SELECT max(id) FROM ordenes_fabricacion))"
	);

	await db.query(opciones.confirmar ? 'COMMIT' : 'ROLLBACK');
	console.log(
		opciones.confirmar
			? '[completar] Histórico completado.'
			: '[completar] Simulación: no se guardó nada. Agregá --confirmar para guardar.'
	);
	console.table({
		...resumen,
		'OF nuevas': nuevas.length,
		'Trabajos 2003-2020 nuevos': pedidosTrabajo.size
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
			[...escritor.vinculosClientes].map(([planilla, vinculo]) => ({
				'Nombre en la planilla': planilla,
				'Contacto en el sistema': vinculo.via === 'nuevo' ? '(creado)' : vinculo.razon_social,
				'ID contacto': vinculo.id,
				Vinculo: vinculo.via
			}))
		);
		agregar('Escapes reasignados', informe.reubicados);
		agregar('Escapes omitidos', informe.omitidos);
		agregar(
			'Cuentas corrientes viejas',
			(hojas['CTAS CTES VIEJAS'] ?? []).map((fila) => fila)
		);
		XLSX.writeFile(libro, opciones.informe);
		console.log(`[completar] Informe: ${opciones.informe}`);
	}
} catch (error) {
	await db.query('ROLLBACK');
	console.error(`[completar] No se guardó nada: ${error.message}`);
	if (error.detail) console.error(`[completar] ${error.detail}`);
	process.exitCode = 1;
} finally {
	db.release();
	await pool.end();
}
