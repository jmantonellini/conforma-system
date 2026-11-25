import 'dotenv/config';
import pg from 'pg';
import XLSX from 'xlsx';
import { parseArgs } from 'node:util';
import { leerHojas } from './datos.mjs';
import { construirModelo } from './modelo.mjs';
import { construirProductos, desvincularProductos, vincularProductos } from './productos.mjs';

const { values: opciones, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		informe: { type: 'string' },
		confirmar: { type: 'boolean', default: false },
		reemplazar: { type: 'boolean', default: false }
	}
});

const [archivo] = positionals;
if (!archivo) {
	console.error(
		'Uso: node scripts/historico/vincular-productos.mjs <planilla.xlsx> [--informe productos.xlsx] [--reemplazar] [--confirmar]'
	);
	process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');

const construido = construirProductos(
	construirModelo(leerHojas(archivo), { hoy: new Date().toISOString().slice(0, 10) })
);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const consulta = async (sql, parametros = []) => (await db.query(sql, parametros)).rows;

try {
	await db.query('BEGIN');
	const [{ count: previos }] = await consulta(
		'SELECT count(*)::int FROM productos WHERE historico'
	);
	if (previos && !opciones.reemplazar) {
		throw new Error(`Ya hay ${previos} productos históricos. Usá --reemplazar para rehacerlos.`);
	}
	const borrados = opciones.reemplazar ? await desvincularProductos(consulta) : 0;
	const resumen = await vincularProductos(consulta, construido);
	await db.query(opciones.confirmar ? 'COMMIT' : 'ROLLBACK');
	console.log(
		opciones.confirmar
			? '[productos] Productos creados y vinculados.'
			: '[productos] Simulación: no se guardó nada. Agregá --confirmar para guardar.'
	);
	console.table({ productosAnterioresBorrados: borrados, ...resumen });

	if (opciones.informe) {
		const filas = [...construido.productos.values()]
			.sort((a, b) => b.usos - a.usos)
			.map((p) => ({
				Producto: p.nombre,
				Tipo: p.tipo,
				Marca: p.marca,
				Modelo: p.modelo,
				Motor: p.motor,
				'Categoría planilla': p.categoria,
				'Categoría competición': p.categoriaCompetencia ?? '',
				Vehículo: p.tipoVehiculo ?? '',
				Registros: p.usos,
				Atributos: JSON.stringify(p.valores)
			}));
		const libro = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Productos');
		XLSX.writeFile(libro, opciones.informe);
		console.log(`[productos] Informe: ${opciones.informe}`);
	}
} catch (error) {
	await db.query('ROLLBACK');
	console.error(`[productos] No se guardó nada: ${error.message}`);
	if (error.detail) console.error(`[productos] ${error.detail}`);
	process.exitCode = 1;
} finally {
	db.release();
	await pool.end();
}
