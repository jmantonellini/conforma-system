import 'dotenv/config';
import pg from 'pg';
import XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { cotizador, leerHojas } from './datos.mjs';
import { Clientes } from './clientes.mjs';
import { crearEscritor } from './escritor.mjs';
import { construirModelo } from './modelo.mjs';
import { construirProductos, desvincularProductos, vincularProductos } from './productos.mjs';

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
const modelo = construirModelo(leerHojas(archivo), { hoy, hasta: opciones.hasta });
const { ordenes, ventas, sueltos, informe } = modelo;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const consulta = async (sql, parametros = []) => (await db.query(sql, parametros)).rows;

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
let vinculosClientes;

try {
	await db.query('BEGIN');

	const [{ count: previos }] = await consulta('SELECT count(*)::int FROM pedidos WHERE historico');
	if (previos && !opciones.reemplazar) {
		throw new Error(
			`Ya hay ${previos} pedidos históricos importados. Usá --reemplazar para volver a importar.`
		);
	}
	if (opciones.reemplazar) {
		await desvincularProductos(consulta);
		resumen.borrados = await borrarImportacionAnterior();
		resumen.productosBorrados = await desvincularProductos(consulta);
	}

	const numerosOF = ordenes.map((o) => Number(o.numero));
	const ocupadas = await consulta('SELECT id FROM ordenes_fabricacion WHERE id = ANY($1::int[])', [
		numerosOF
	]);
	if (ocupadas.length) {
		throw new Error(
			`Estos números de OF ya existen en el sistema: ${ocupadas.map((o) => o.id).join(', ')}`
		);
	}

	const escritor = crearEscritor(db, {
		cotizacion,
		clientes: new Clientes(
			await consulta('SELECT id, razon_social, nombre, apellido FROM contactos')
		),
		resumen
	});
	for (const o of ordenes) await escritor.crearOrden(o);
	for (const venta of ventas) await escritor.crearPedido(venta, 'cobro sin OF');
	await escritor.crearSueltos(sueltos);
	vinculosClientes = escritor.vinculosClientes;

	await consulta(
		"SELECT setval(pg_get_serial_sequence('ordenes_fabricacion', 'id'), (SELECT max(id) FROM ordenes_fabricacion))"
	);
	const [{ count: productosPrevios }] = await consulta(
		'SELECT count(*)::int FROM productos WHERE historico'
	);
	if (!productosPrevios) {
		const vinculados = await vincularProductos(consulta, construirProductos(modelo));
		resumen.productos = vinculados.productos;
		resumen.unidadesConProducto = vinculados.unidadesVinculadas;
	}

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
