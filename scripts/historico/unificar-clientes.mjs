import 'dotenv/config';
import pg from 'pg';
import XLSX from 'xlsx';
import { parseArgs } from 'node:util';
import { limpiarNombreCliente, palabras } from './clientes.mjs';

const { values: opciones } = parseArgs({
	options: {
		informe: { type: 'string' },
		confirmar: { type: 'boolean', default: false }
	}
});
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio');

const REFERENCIAS = [
	['pedidos', 'contacto_id'],
	['pedidos', 'contacto_distribuidor_id'],
	['cotizaciones', 'contacto_id'],
	['cotizaciones', 'contacto_distribuidor_id'],
	['unidades_fabricacion', 'contacto_id'],
	['ubicaciones_stock', 'contacto_distribuidor_id']
];

function distancia(a, b) {
	if (Math.abs(a.length - b.length) > 1) return 2;
	const previa = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = previa[0];
		previa[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const actual = previa[j];
			previa[j] = Math.min(
				previa[j] + 1,
				previa[j - 1] + 1,
				diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
			diagonal = actual;
		}
	}
	return previa[b.length];
}

function palabrasParecidas(a, b) {
	if (a.length !== b.length) return false;
	const restantes = [...b];
	for (const palabra of a) {
		const indice = restantes.findIndex(
			(otra) =>
				otra === palabra ||
				(palabra.length >= 6 &&
					otra.length >= 6 &&
					palabra[0] === otra[0] &&
					distancia(palabra, otra) <= 1)
		);
		if (indice < 0) return false;
		restantes.splice(indice, 1);
	}
	return true;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const consulta = async (sql, parametros = []) => (await db.query(sql, parametros)).rows;

try {
	await db.query('BEGIN');
	const contactos = await consulta(`
		SELECT c.id, c.razon_social, c.nombre, c.apellido, c.cuit, c.historico,
			EXISTS (SELECT 1 FROM proveedores v WHERE v.contacto_id = c.id) AS proveedor,
			(SELECT count(*)::int FROM pedidos p WHERE p.contacto_id = c.id) AS pedidos
		FROM contactos c WHERE c.activo IS NOT FALSE`);
	for (const c of contactos) {
		const nombre = limpiarNombreCliente(c.razon_social);
		c.palabras = [...new Set(palabras(nombre))].sort();
		c.clave = c.palabras.join(' ');
		c.combinado = /[/(]|\s-|-\s/.test(c.razon_social);
	}

	const padre = new Map(contactos.map((c) => [c.id, c.id]));
	const raiz = (id) => {
		while (padre.get(id) !== id) {
			padre.set(id, padre.get(padre.get(id)));
			id = padre.get(id);
		}
		return id;
	};
	const cuitDe = new Map(contactos.map((c) => [c.id, c.cuit || null]));
	const compatibles = (a, b) => {
		const cuitA = cuitDe.get(raiz(a.id));
		const cuitB = cuitDe.get(raiz(b.id));
		return (
			(a.historico || b.historico) &&
			!(a.proveedor && b.proveedor) &&
			!(cuitA && cuitB && cuitA !== cuitB)
		);
	};
	const unir = (a, b) => {
		const raizA = raiz(a.id);
		const raizB = raiz(b.id);
		if (raizA === raizB || !compatibles(a, b)) return;
		padre.set(raizB, raizA);
		cuitDe.set(raizA, cuitDe.get(raizA) ?? cuitDe.get(raizB));
	};

	const bloques = new Map();
	for (const c of contactos) {
		for (const palabra of c.palabras) {
			if (palabra.length < 3) continue;
			const lista = bloques.get(palabra) ?? [];
			lista.push(c);
			bloques.set(palabra, lista);
		}
	}

	const porClave = new Map();
	for (const c of contactos) {
		if (!c.clave) continue;
		const lista = porClave.get(c.clave) ?? [];
		lista.push(c);
		porClave.set(c.clave, lista);
	}
	for (const lista of porClave.values()) {
		for (const otro of lista.slice(1)) unir(lista[0], otro);
	}

	for (const lista of bloques.values()) {
		if (lista.length > 400) continue;
		for (let i = 0; i < lista.length; i++) {
			for (let j = i + 1; j < lista.length; j++) {
				const a = lista[i];
				const b = lista[j];
				if (a.clave === b.clave || a.palabras.length < 2) continue;
				if (palabrasParecidas(a.palabras, b.palabras)) unir(a, b);
			}
		}
	}

	for (const c of contactos) {
		if (c.palabras.length < 2 || c.combinado) continue;
		const rara = c.palabras.find((p) => p.length >= 4 && (bloques.get(p)?.length ?? 0) <= 5);
		if (!rara) continue;
		const candidatos = (bloques.get(rara) ?? []).filter(
			(otro) =>
				otro.id !== c.id &&
				!otro.combinado &&
				otro.palabras.length === c.palabras.length + 1 &&
				c.palabras.every((p) => otro.palabras.includes(p))
		);
		const grupos = new Set(candidatos.map((otro) => raiz(otro.id)));
		if (grupos.size === 1) unir(candidatos[0], c);
	}

	const grupos = new Map();
	for (const c of contactos) {
		const id = raiz(c.id);
		const lista = grupos.get(id) ?? [];
		lista.push(c);
		grupos.set(id, lista);
	}

	const fusiones = [];
	for (const lista of grupos.values()) {
		if (lista.length < 2) continue;
		const ordenados = [...lista].sort(
			(a, b) =>
				Number(a.historico) - Number(b.historico) ||
				Number(Boolean(b.cuit)) - Number(Boolean(a.cuit)) ||
				b.pedidos - a.pedidos ||
				b.razon_social.length - a.razon_social.length
		);
		const [queda, ...resto] = ordenados;
		if (lista.filter((c) => !c.historico).length > 1) continue;
		for (const otro of resto) {
			fusiones.push({ queda, otro });
			for (const [tabla, columna] of REFERENCIAS) {
				await consulta(`UPDATE ${tabla} SET ${columna} = $1 WHERE ${columna} = $2`, [
					queda.id,
					otro.id
				]);
			}
			if (!queda.cuit && otro.cuit) {
				await consulta('UPDATE contactos SET cuit = NULL WHERE id = $1', [otro.id]);
				await consulta('UPDATE contactos SET cuit = $2 WHERE id = $1', [queda.id, otro.cuit]);
				queda.cuit = otro.cuit;
			}
			await consulta('DELETE FROM contactos WHERE id = $1', [otro.id]);
		}
	}

	await db.query(opciones.confirmar ? 'COMMIT' : 'ROLLBACK');
	console.log(
		opciones.confirmar
			? '[clientes] Contactos unificados.'
			: '[clientes] Simulación: no se guardó nada. Agregá --confirmar para guardar.'
	);
	console.table({
		contactos: contactos.length,
		fusionados: fusiones.length,
		grupos: new Set(fusiones.map((f) => f.queda.id)).size
	});
	if (opciones.informe) {
		const libro = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			libro,
			XLSX.utils.json_to_sheet(
				fusiones.map(({ queda, otro }) => ({
					Queda: queda.razon_social,
					'ID que queda': queda.id,
					Fusionado: otro.razon_social,
					'ID fusionado': otro.id,
					'Pedidos del fusionado': otro.pedidos
				}))
			),
			'Fusiones'
		);
		XLSX.writeFile(libro, opciones.informe);
		console.log(`[clientes] Informe: ${opciones.informe}`);
	}
} catch (error) {
	await db.query('ROLLBACK');
	console.error(`[clientes] No se guardó nada: ${error.message}`);
	if (error.detail) console.error(`[clientes] ${error.detail}`);
	process.exitCode = 1;
} finally {
	db.release();
	await pool.end();
}
