import { texto, unir } from './datos.mjs';

const ETIQUETA_TIPO = {
	escape_completo: 'Escape completo',
	multiple: 'Múltiple',
	bajada: 'Bajada',
	downpipe: 'Downpipe',
	trombon: 'Trombón',
	silenciador: 'Silenciador',
	salida: 'Salida de escape',
	secundario: 'Secundario',
	otra: 'Pieza'
};

const TIPO_POR_PALABRA = {
	ESCAPE: 'escape_completo',
	'ESCAPE COMPLETO': 'escape_completo',
	MULTIPLE: 'multiple',
	PRIMARIOS: 'multiple',
	BAJADA: 'bajada',
	DOWNPIPE: 'downpipe',
	TROMBON: 'trombon',
	SILENCIADOR: 'silenciador',
	'SALIDA DE ESCAPE': 'salida',
	SECUNDARIO: 'secundario',
	CONECTOR: 'secundario'
};

const NO_COMPETENCIA = new Set(['', 'CALLE', 'AVION', 'MOTO', 'MOTOS', 'EXTRANJEROS', 'CAR SHOW']);
const PICADAS = /PICADA/;
const MARCAS_MOTO = new Set([
	'YAMAHA',
	'KAWASAKI',
	'SUZUKI',
	'KTM',
	'MV AGUSTA',
	'DUCATI',
	'HARLEY DAVIDSON',
	'TRIUMPH',
	'BENELLI',
	'ZANELLA',
	'MOTOMEL'
]);
const MODELOS_HONDA_MOTO = /^(CB|CBR|XR|CRF|XRE|TITAN|TORNADO|TWISTER|NX|VTX|SHADOW)/;
const CAMIONETAS = new Set([
	'AMAROK',
	'HILUX',
	'RANGER',
	'S10',
	'S 10',
	'F100',
	'F 100',
	'F150',
	'F 150',
	'TORO',
	'FRONTIER',
	'RAM',
	'D20',
	'SW4',
	'TRAILBLAZER',
	'L200',
	'ALASKAN',
	'TACOMA',
	'TUNDRA',
	'C10',
	'OROCH'
]);
const MINIMO_CATEGORIA = 3;

export const normal = (valor) =>
	String(valor ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase()
		.replace(/\./g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^-$/, '');

const compacto = (valor) => normal(valor).replace(/[^A-Z0-9]/g, '');

export function titulo(valor) {
	return normal(valor)
		.toLowerCase()
		.split(' ')
		.map((palabra) =>
			/\d/.test(palabra) || palabra.length <= 2
				? palabra.toUpperCase()
				: palabra[0].toUpperCase() + palabra.slice(1)
		)
		.join(' ');
}

export function categoriaCanonica(valor) {
	let c = normal(valor)
		.replace(/\bTC2000\b/g, 'TC 2000')
		.replace(/\bTC4000\b/g, 'TC 4000')
		.replace(/\bMAXY\b/g, 'MAXI')
		.replace(/\bPRO CAR\b/g, 'PROCAR')
		.replace(/\bTCMV\b/g, 'TC MV')
		.replace(/\bTN C(\d)\b/g, 'TN CLASE $1')
		.replace(/\s*\/\s*/g, ' / ')
		.trim();
	if (PICADAS.test(c)) c = 'PICADAS';
	if (c === 'MOTOS') c = 'MOTO';
	return c;
}

const capitalizar = (valor) =>
	String(valor)
		.toLocaleLowerCase('es')
		.replace(/(^|\s)\p{L}/gu, (letra) => letra.toLocaleUpperCase('es'));

function tipoDe(palabra, porDefecto) {
	const p = normal(palabra);
	if (!p) return porDefecto ? { tipo: porDefecto, pieza: null } : null;
	if (TIPO_POR_PALABRA[p]) return { tipo: TIPO_POR_PALABRA[p], pieza: null };
	return { tipo: 'otra', pieza: capitalizar(texto(palabra)) };
}

const ETIQUETA_ATRIBUTO = {
	primario_diametro: 'Primario Ø',
	primario_diametro_final: 'Primario Ø final',
	primario_largo_escalon: 'Largo del escalón',
	primario_largo: 'Primario largo',
	secundario_diametro: 'Secundario Ø',
	secundario_largo: 'Secundario largo',
	trombon_diametro_inicial: 'Trombón Ø inicial',
	trombon_diametro_final: 'Trombón Ø final',
	trombon_largo: 'Trombón largo',
	material: 'Material',
	terminacion: 'Terminación'
};

function tipoVehiculo({ marca, modelo, categoria }) {
	if (marca === 'AVION' || categoria === 'AVION') return 'avion';
	if (
		/MOTO/.test(categoria) ||
		MARCAS_MOTO.has(marca) ||
		(marca === 'HONDA' && MODELOS_HONDA_MOTO.test(modelo))
	) {
		return 'moto';
	}
	if (CAMIONETAS.has(modelo)) return 'camioneta';
	return marca || modelo || categoria ? 'auto' : null;
}

function normalizarMarca(marca, modelo) {
	let m = normal(marca);
	let mo = normal(modelo);
	if (m === 'IKA TORINO') {
		m = 'IKA';
		mo ||= 'TORINO';
	}
	if (m === 'MERCEDES BENZ') m = 'MERCEDES-BENZ';
	return { marca: m, modelo: mo };
}

function material(valor) {
	const t = normal(valor);
	if (!t) return null;
	if (/316/.test(t)) return 'Inoxidable 316';
	if (/430/.test(t)) return 'Inoxidable 430';
	if (/304/.test(t)) return 'Inoxidable 304';
	if (/INOX/.test(t)) return 'Inoxidable';
	if (/TITANIO/.test(t)) return 'Titanio';
	if (/ALUMINIO/.test(t)) return 'Aluminio';
	if (/HIERRO|NEGRO/.test(t)) return 'Hierro';
	return titulo(t);
}

function terminacion(valor) {
	const t = normal(valor);
	if (!t) return null;
	const partes = [];
	if (/GRABAD/.test(t)) partes.push('Grabado');
	if (/LOGO/.test(t)) partes.push('Con logo');
	if (/PULID/.test(t)) partes.push('Pulido');
	if (/ESMERIL/.test(t)) partes.push('Esmerilado');
	if (/PINTAD/.test(t)) partes.push('Pintado');
	return partes.join(' y ') || titulo(t);
}

const numeros = (t) =>
	[...t.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));

function medidasFicha(valor) {
	const t = texto(valor);
	if (!t) return {};
	const resultado = {};
	for (const parte of t.split('|')) {
		const [nombre, resto = ''] = parte.split(':');
		const n = numeros(resto);
		const clave = normal(nombre);
		if (clave === 'PRIMARIO' && n.length === 2) {
			resultado.primario_diametro = n[0];
			resultado.primario_largo = n[1];
		} else if (clave === 'PRIMARIO' && n.length === 4) {
			resultado.primario_diametro = n[0];
			resultado.primario_largo_escalon = n[1];
			resultado.primario_diametro_final = n[2];
			resultado.primario_largo = n[3];
		} else if (clave === 'SECUNDARIO' && n.length === 2) {
			resultado.secundario_diametro = n[0];
			resultado.secundario_largo = n[1];
		} else if (clave === 'TROMBON' && n.length === 3) {
			resultado.trombon_diametro_inicial = n[0];
			resultado.trombon_largo = n[1];
			resultado.trombon_diametro_final = n[2];
		} else if (clave === 'TROMBON' && n.length === 2) {
			resultado.trombon_diametro_inicial = n[0];
			resultado.trombon_diametro_final = n[1];
		}
	}
	return resultado;
}

function registroMedidas(fila) {
	return unir([
		fila.DIÁMETROS,
		texto(fila.ESPESOR) && `Espesor ${texto(fila.ESPESOR)}`,
		texto(fila.LARGO) && `Largo ${texto(fila.LARGO)}`,
		texto(fila['RADIO / ÁNGULO']) && `Radio ${texto(fila['RADIO / ÁNGULO'])}`,
		texto(fila.SALIDA) && `Salida ${texto(fila.SALIDA)}`,
		fila['MEDIDAS (ficha OF)'],
		fila['MEDIDAS (lista escapes)'],
		fila['OBSERVACIONES ORIGINALES']
	]);
}

function describir(fila, tipoPorDefecto) {
	const pieza = tipoDe(fila.PRODUCTO, tipoPorDefecto);
	if (!pieza) return null;
	const { marca, modelo } = normalizarMarca(fila.MARCA, fila.MODELO);
	const motor = normal(fila['MOTOR / VERSIÓN']);
	const original = categoriaCanonica(fila.CATEGORÍA);
	const competencia = !NO_COMPETENCIA.has(original);
	if (!marca && !modelo && !competencia) return null;
	const categoria = competencia ? original : '';
	const clave = [
		pieza.tipo,
		compacto(pieza.pieza),
		compacto(marca),
		compacto(modelo),
		compacto(motor),
		categoria
	].join('|');
	return { clave, ...pieza, marca, modelo, motor, categoria, original };
}

export function construirProductos(modelo) {
	const productos = new Map();
	const lineas = [];
	const unidadesOF = [];
	const unidadesSueltas = [];

	const registrar = (descripcion, fila, referencia, fecha) => {
		let producto = productos.get(descripcion.clave);
		if (!producto) {
			producto = { ...descripcion, registros: [], atributos: [], usos: 0, originales: new Set() };
			productos.set(descripcion.clave, producto);
		}
		producto.usos++;
		producto.originales.add(descripcion.original);
		producto.registros.push({ referencia, fecha, medidas: registroMedidas(fila) });
		producto.atributos.push({
			...medidasFicha(fila['MEDIDAS (ficha OF)']),
			material: material(fila.MATERIAL),
			terminacion: terminacion(fila.TERMINACIÓN)
		});
		return producto.clave;
	};

	for (const o of modelo.ordenes) {
		let serie = 0;
		for (const [orden, item] of o.items.entries()) {
			const descripcion = describir(item.fila, item.escapes.length ? 'escape_completo' : null);
			const util = descripcion && (descripcion.tipo !== 'otra' || item.escapes.length > 0);
			const clave = util ? registrar(descripcion, item.fila, `OF ${o.numero}`, o.fecha) : null;
			if (clave) lineas.push({ of: o.numero, orden, clave });
			const total = Math.max(item.cantidad, item.escapes.length);
			for (let i = 0; i < total; i++) {
				serie++;
				const escape = item.escapes[i];
				let claveUnidad = clave;
				if (escape && !clave) {
					const propia = describir(escape.fila, 'escape_completo');
					if (propia)
						claveUnidad = registrar(propia, escape.fila, `N° ${escape.numero}`, escape.fecha);
				} else if (escape && clave) {
					productos.get(clave).registros.push({
						referencia: `N° ${escape.numero}`,
						fecha: escape.fecha,
						medidas: registroMedidas(escape.fila)
					});
				}
				if (claveUnidad) {
					unidadesOF.push({
						of: o.numero,
						serie: `${o.numero}-${String(serie).padStart(3, '0')}`,
						clave: claveUnidad
					});
				}
			}
		}
	}

	for (const escape of modelo.sueltos) {
		const descripcion = describir(escape.fila, 'escape_completo');
		if (!descripcion) continue;
		const clave = registrar(descripcion, escape.fila, `N° ${escape.numero}`, escape.fecha);
		unidadesSueltas.push({ serie: `H-E${escape.numero}`, fecha: escape.fecha, clave });
	}

	const usosCategoria = new Map();
	for (const p of productos.values()) {
		if (!NO_COMPETENCIA.has(p.categoria)) {
			usosCategoria.set(p.categoria, (usosCategoria.get(p.categoria) ?? 0) + p.usos);
		}
	}

	for (const p of productos.values()) {
		const especial = ['AVION', 'MOTO'].find((c) => p.originales.has(c)) ?? '';
		p.tipoVehiculo = tipoVehiculo({ ...p, categoria: p.categoria || especial });
		p.competencia = Boolean(p.categoria);
		p.uso = p.competencia ? 'competencia' : p.originales.has('CALLE') ? 'calle' : null;
		p.categoriaCompetencia =
			p.competencia && (usosCategoria.get(p.categoria) ?? 0) >= MINIMO_CATEGORIA
				? p.categoria
				: null;
		const base = p.tipo === 'otra' ? p.pieza : ETIQUETA_TIPO[p.tipo];
		const vehiculo = [p.marca && titulo(p.marca), p.modelo && titulo(p.modelo), p.motor]
			.filter(Boolean)
			.join(' ');
		p.base = base;
		const avion = especial === 'AVION' || p.marca === 'AVION';
		p.sufijo = [avion && 'Avión', p.competencia && p.categoria].filter(Boolean).join(' ');
		p.nombre = [base, vehiculo, p.sufijo].filter(Boolean).join(' ').slice(0, 200);

		const valores = {};
		const claves = new Set(p.atributos.flatMap((a) => Object.keys(a)));
		const distintos = [];
		for (const clave of claves) {
			const vistos = [
				...new Set(p.atributos.map((a) => a[clave]).filter((v) => v !== null && v !== undefined))
			];
			if (vistos.length === 1) valores[clave] = vistos[0];
			else if (vistos.length > 1) {
				distintos.push(`${ETIQUETA_ATRIBUTO[clave] ?? clave}: ${vistos.join(' / ')}`);
			}
		}
		p.valores = valores;

		const porMedida = new Map();
		for (const r of [...p.registros].sort((a, b) => ((a.fecha ?? '') < (b.fecha ?? '') ? 1 : -1))) {
			if (!r.medidas) continue;
			const lista = porMedida.get(r.medidas) ?? [];
			lista.push(`${r.referencia}${r.fecha ? ` (${r.fecha.slice(0, 4)})` : ''}`);
			porMedida.set(r.medidas, lista);
		}
		const medidas = [...porMedida].slice(0, 25).map(([medida, refs]) => {
			const listado =
				refs.slice(0, 6).join(', ') + (refs.length > 6 ? ` y ${refs.length - 6} más` : '');
			return `• ${medida} — ${listado}`;
		});
		p.notas = unir(
			[
				`Creado desde el histórico de producción (${p.usos} ${p.usos === 1 ? 'registro' : 'registros'}).`,
				p.competencia && !p.categoriaCompetencia && `Categoría original: ${p.categoria}`,
				distintos.length > 0 && `Valores que variaron: ${distintos.join(' · ')}`,
				medidas.length > 0 && 'Medidas y observaciones registradas:',
				...medidas,
				porMedida.size > 25 && `… y ${porMedida.size - 25} variantes más`
			],
			'\n'
		);
	}

	return { productos, lineas, unidadesOF, unidadesSueltas };
}

export async function vincularProductos(consulta, construido) {
	const resumen = {
		productos: 0,
		marcasNuevas: 0,
		modelosNuevos: 0,
		categoriasNuevas: 0,
		lineasVinculadas: 0,
		unidadesVinculadas: 0
	};
	const [escapes] = await consulta("SELECT id FROM categorias_productos WHERE slug = 'escapes'");
	const tiposVehiculo = Object.fromEntries(
		(await consulta('SELECT id, slug FROM tipos_vehiculo')).map((t) => [t.slug, t.id])
	);
	const tiposUso = Object.fromEntries(
		(await consulta('SELECT id, slug FROM tipos_uso')).map((t) => [t.slug, t.id])
	);

	const nombres = new Map();
	const marcas = new Map(
		(await consulta('SELECT id, nombre FROM marcas')).map((m) => {
			nombres.set(`marca:${m.id}`, m.nombre);
			return [compacto(m.nombre), m.id];
		})
	);
	const modelos = new Map(
		(await consulta('SELECT id, marca_id, nombre FROM modelos')).map((m) => {
			nombres.set(`modelo:${m.id}`, m.nombre);
			return [`${m.marca_id}|${compacto(m.nombre)}`, m.id];
		})
	);
	const categorias = new Map(
		(await consulta('SELECT id, nombre FROM categorias_competencia')).map((c) => [
			compacto(c.nombre),
			c.id
		])
	);

	async function idMarca(nombre) {
		if (!nombre || nombre === 'AVION') return null;
		const clave = compacto(nombre);
		if (!marcas.has(clave)) {
			const [{ id }] = await consulta('INSERT INTO marcas (nombre) VALUES ($1) RETURNING id', [
				titulo(nombre)
			]);
			nombres.set(`marca:${id}`, titulo(nombre));
			marcas.set(clave, id);
			resumen.marcasNuevas++;
		}
		return marcas.get(clave);
	}

	async function idModelo(marcaId, nombre, tipo) {
		if (!marcaId || !nombre) return null;
		const clave = `${marcaId}|${compacto(nombre)}`;
		if (!modelos.has(clave)) {
			const [{ id }] = await consulta(
				'INSERT INTO modelos (marca_id, tipo_vehiculo_id, nombre) VALUES ($1, $2, $3) RETURNING id',
				[marcaId, tiposVehiculo[tipo ?? 'auto'], titulo(nombre)]
			);
			nombres.set(`modelo:${id}`, titulo(nombre));
			modelos.set(clave, id);
			resumen.modelosNuevos++;
		}
		return modelos.get(clave);
	}

	async function idCategoria(nombre, tipo) {
		if (!nombre) return null;
		const clave = compacto(nombre);
		if (!categorias.has(clave)) {
			const [{ id }] = await consulta(
				'INSERT INTO categorias_competencia (nombre, tipo_vehiculo_id) VALUES ($1, $2) RETURNING id',
				[nombre, tiposVehiculo[tipo ?? 'auto']]
			);
			categorias.set(clave, id);
			resumen.categoriasNuevas++;
		}
		return categorias.get(clave);
	}

	const ids = new Map();
	let secuencia = 0;
	for (const p of construido.productos.values()) {
		const marcaId = await idMarca(p.marca);
		const modeloId = await idModelo(marcaId, p.modelo, p.tipoVehiculo);
		const categoriaId = await idCategoria(p.categoriaCompetencia, p.tipoVehiculo);
		secuencia++;
		p.nombre = [
			p.base,
			marcaId ? nombres.get(`marca:${marcaId}`) : p.marca !== 'AVION' && p.marca && titulo(p.marca),
			modeloId ? nombres.get(`modelo:${modeloId}`) : p.modelo && titulo(p.modelo),
			p.motor,
			p.sufijo
		]
			.filter(Boolean)
			.join(' ')
			.slice(0, 200);
		const codigo = `H${String(secuencia).padStart(4, '0')}-${compacto(p.nombre).slice(0, 18)}`;
		const [{ id }] = await consulta(
			`INSERT INTO productos (codigo, nombre, categoria_id, tipo_pieza, atributos, notas_fabricacion,
				tipo_vehiculo_id, marca_id, modelo_id, tipo_uso_id, categoria_competencia_id, historico)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true) RETURNING id`,
			[
				codigo,
				p.nombre,
				escapes?.id ?? null,
				p.tipo,
				JSON.stringify(p.valores),
				p.notas,
				p.tipoVehiculo ? tiposVehiculo[p.tipoVehiculo] : null,
				marcaId,
				modeloId,
				p.uso ? (tiposUso[p.uso] ?? null) : null,
				categoriaId
			]
		);
		ids.set(p.clave, id);
		resumen.productos++;
	}

	for (let desde = 0; desde < construido.lineas.length; desde += 500) {
		const lote = construido.lineas.slice(desde, desde + 500);
		const filas = await consulta(
			`UPDATE lineas_pedido l SET producto_id = v.producto_id, es_personalizado = false
			FROM (SELECT unnest($1::text[]) AS numero, unnest($2::int[]) AS orden, unnest($3::int[]) AS producto_id) v,
				pedidos p
			WHERE p.id = l.pedido_id AND p.historico AND p.numero_pedido = 'H-' || v.numero AND l.orden_linea = v.orden
			RETURNING l.id`,
			[lote.map((l) => l.of), lote.map((l) => l.orden), lote.map((l) => ids.get(l.clave))]
		);
		resumen.lineasVinculadas += filas.length;
	}

	for (let desde = 0; desde < construido.unidadesOF.length; desde += 1000) {
		const lote = construido.unidadesOF.slice(desde, desde + 1000);
		const filas = await consulta(
			`UPDATE unidades_fabricacion u SET producto_id = v.producto_id
			FROM (SELECT unnest($1::int[]) AS orden_id, unnest($2::text[]) AS serie, unnest($3::int[]) AS producto_id) v
			WHERE u.orden_fabricacion_id = v.orden_id AND u.numero_serie = v.serie
			RETURNING u.id`,
			[lote.map((u) => Number(u.of)), lote.map((u) => u.serie), lote.map((u) => ids.get(u.clave))]
		);
		resumen.unidadesVinculadas += filas.length;
	}

	for (let desde = 0; desde < construido.unidadesSueltas.length; desde += 1000) {
		const lote = construido.unidadesSueltas.slice(desde, desde + 1000);
		const filas = await consulta(
			`UPDATE unidades_fabricacion u SET producto_id = v.producto_id
			FROM (SELECT unnest($1::text[]) AS serie, unnest($2::date[]) AS fecha, unnest($3::int[]) AS producto_id) v
			WHERE u.orden_fabricacion_id IS NULL AND u.numero_serie = v.serie
				AND u.fecha_fabricacion::date IS NOT DISTINCT FROM v.fecha
			RETURNING u.id`,
			[lote.map((u) => u.serie), lote.map((u) => u.fecha), lote.map((u) => ids.get(u.clave))]
		);
		resumen.unidadesVinculadas += filas.length;
	}

	return resumen;
}

export async function desvincularProductos(consulta) {
	await consulta(`UPDATE lineas_pedido l SET producto_id = NULL, es_personalizado = true
		FROM pedidos p WHERE p.id = l.pedido_id AND p.historico AND l.producto_id IN (SELECT id FROM productos WHERE historico)`);
	await consulta(
		'UPDATE unidades_fabricacion SET producto_id = NULL WHERE producto_id IN (SELECT id FROM productos WHERE historico)'
	);
	const filas = await consulta(`DELETE FROM productos pr WHERE pr.historico
		AND NOT EXISTS (SELECT 1 FROM lineas_pedido l WHERE l.producto_id = pr.id)
		AND NOT EXISTS (SELECT 1 FROM lineas_cotizacion l WHERE l.producto_id = pr.id)
		AND NOT EXISTS (SELECT 1 FROM ordenes_fabricacion o WHERE o.producto_id = pr.id)
		AND NOT EXISTS (SELECT 1 FROM producto_componentes c WHERE c.componente_id = pr.id)
		AND NOT EXISTS (SELECT 1 FROM movimientos_stock m WHERE m.producto_id = pr.id)
		RETURNING pr.id`);
	return filas.length;
}
