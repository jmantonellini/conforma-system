import {
	OF_ANEXAS,
	REASIGNACION_OF,
	corregirFechasEscapes,
	diasEntre,
	fechaISO,
	limpiarFactura,
	numero,
	numerosEscape,
	texto,
	unir
} from './datos.mjs';
import { claveCliente } from './clientes.mjs';

const FICHA = [
	['Incluye', 'INCLUYE / COMPONENTES'],
	['Marca', 'MARCA'],
	['Modelo', 'MODELO'],
	['Motor', 'MOTOR / VERSIÓN'],
	['Categoría', 'CATEGORÍA'],
	['Material', 'MATERIAL'],
	['Material del cliente', 'MATERIAL DEL CLIENTE'],
	['Diámetros', 'DIÁMETROS'],
	['Espesor', 'ESPESOR'],
	['Largo', 'LARGO'],
	['Radio / ángulo', 'RADIO / ÁNGULO'],
	['Salida', 'SALIDA'],
	['Terminación', 'TERMINACIÓN'],
	['Referencia', 'REFERENCIA'],
	['Medidas', 'MEDIDAS (ficha OF)'],
	['Vehículo', 'VEHÍCULO (ficha OF)'],
	['Tareas', 'TAREAS (ficha OF)'],
	['Modelo en lista de escapes', 'MODELO (lista escapes)'],
	['Medidas en lista de escapes', 'MEDIDAS (lista escapes)'],
	['N° de escape mencionado', 'N° ESCAPE (lista)'],
	['Vínculo con lista de escapes', 'CONFIANZA VÍNCULO ESCAPE']
];

function claveOF(valor) {
	const t = texto(valor);
	if (!t) return null;
	if (OF_ANEXAS[t]) return { numero: OF_ANEXAS[t], anexa: t };
	const reasignada = REASIGNACION_OF[t];
	if (reasignada) return { numero: reasignada.numero, ...reasignada, original: t };
	return /^\d+$/.test(t) ? { numero: t } : null;
}

const metodoPago = (...valores) => {
	const t = valores.map((v) => texto(v) ?? '').join(' ');
	if (/transf|credicoop|credicopp|\bcc\b|dep[oó]sit/i.test(t)) return 'transferencia';
	if (/cheque|echeq/i.test(t)) return 'cheque';
	if (/efectivo|billete|contado/i.test(t)) return 'efectivo';
	return null;
};

function construirItem(fila, indice) {
	const descripcion =
		texto(fila['DESCRIPCIÓN ORIGINAL']) ??
		unir([fila.PRODUCTO, fila.MARCA, fila.MODELO], ' ') ??
		'Ítem sin descripción';
	const cantidad = Math.max(
		1,
		Math.round(numero(fila['CANT. SOLICITADA']) ?? numero(fila['CANT. ENVIADA']) ?? 1)
	);
	const unitario = numero(fila['PRECIO UNIT. S/IVA']);
	const total = numero(fila['TOTAL S/IVA']);
	const enviada = numero(fila['CANT. ENVIADA']);
	const ficha = FICHA.map(([etiqueta, columna]) => {
		const valor = texto(fila[columna]);
		return valor ? `${etiqueta}: ${valor}` : null;
	});
	if (enviada !== null && enviada !== cantidad) ficha.push(`Cantidad enviada: ${enviada}`);
	return {
		indice,
		descripcion,
		nombre:
			unir([fila.PRODUCTO, fila.MARCA, fila.MODELO, fila['MOTOR / VERSIÓN']], ' ') ?? descripcion,
		cantidad,
		precio: unitario ?? (total !== null ? total / cantidad : 0),
		reparacion: /REPARACI/i.test(texto(fila.TRABAJO) ?? ''),
		ficha: unir(ficha),
		escapesMencionados: numerosEscape(fila['N° ESCAPE (lista)']),
		repiteDiseno: /REPETICI/i.test(texto(fila['CONFIANZA VÍNCULO ESCAPE']) ?? ''),
		fila
	};
}

function construirEscape(fila) {
	const modelo =
		texto(fila['MODELO ORIGINAL']) ?? unir([fila.MARCA, fila.MODELO, fila['MOTOR / VERSIÓN']], ' ');
	return {
		numero: numero(fila['N° ESCAPE']),
		fecha: fechaISO(fila.FECHA),
		cliente: texto(fila.CLIENTE),
		descripcion: unir([fila.PRODUCTO, modelo, fila.CATEGORÍA]) ?? 'Escape',
		detalle: unir([
			fila['OBSERVACIONES ORIGINALES'],
			texto(fila.DIÁMETROS) && `Diámetros: ${texto(fila.DIÁMETROS)}`,
			texto(fila.ESPESOR) && `Espesor: ${texto(fila.ESPESOR)}`,
			texto(fila.LARGO) && `Largo: ${texto(fila.LARGO)}`
		]),
		of: claveOF(fila['OF VINCULADA'])?.numero ?? null,
		confianza: texto(fila.CONFIANZA),
		notas: [],
		fila
	};
}

function enRango(fecha, hoy, orden, tipo = '') {
	if (!fecha || (fecha >= '2000-01-01' && fecha <= hoy)) return fecha;
	const nota = `Fecha ${tipo ? `${tipo} ` : ''}descartada: la planilla decía ${fecha}`.replace(
		'  ',
		' '
	);
	if (!orden.notas.includes(nota)) orden.notas.push(nota);
	return null;
}

export function construirModelo(hojas, { hoy, hasta }) {
	const ordenes = new Map();
	const informe = {
		reasignadas: [],
		fechasOF: [],
		excluidas: [],
		pendientes: [],
		cobrosSinOF: [],
		escapesSueltos: []
	};
	const orden = (numeroOF) => {
		if (!ordenes.has(numeroOF)) {
			ordenes.set(numeroOF, {
				numero: numeroOF,
				fecha: null,
				cliente: null,
				resumen: null,
				items: [],
				anexos: [],
				escapes: [],
				pagos: [],
				cobrosInfo: [],
				facturas: [],
				notas: []
			});
		}
		return ordenes.get(numeroOF);
	};

	for (const fila of hojas['RESUMEN POR OF']) {
		const clave = claveOF(fila.OF);
		if (!clave || clave.anexa || clave.duplicada) continue;
		const o = orden(clave.numero);
		o.resumen = fila;
		o.fecha = enRango(fechaISO(fila.FECHA), hoy, o);
		o.cliente = texto(fila.CLIENTE);
		if (clave.nota) {
			o.notas.push(clave.nota);
			informe.reasignadas.push({
				original: clave.original,
				numero: clave.numero,
				motivo: clave.nota
			});
		}
	}

	for (const fila of hojas['OF DETALLE']) {
		const clave = claveOF(fila.OF);
		if (!clave || clave.duplicada) {
			if (clave?.duplicada) {
				const destino = orden(clave.numero);
				if (!destino.notas.includes(clave.nota)) destino.notas.push(clave.nota);
			}
			continue;
		}
		const o = orden(clave.numero);
		o.fecha ??= enRango(fechaISO(fila['FECHA OF']), hoy, o);
		o.cliente ??= texto(fila.CLIENTE);
		const item = construirItem(fila, o.items.length + o.anexos.length);
		if (clave.anexa) {
			item.descripcion = `${clave.anexa}: ${item.descripcion}`;
			o.anexos.push(item);
			o.notas.push(`Incluye la ${clave.anexa} (${fechaISO(fila['FECHA OF']) ?? 'sin fecha'})`);
		} else {
			o.items.push(item);
		}
	}

	const numeros = [...ordenes.keys()].sort((a, b) => Number(a) - Number(b));
	let anterior = null;
	for (const n of numeros) {
		const o = ordenes.get(n);
		if (!o.items.length) o.items.push(construirItem({ 'DESCRIPCIÓN ORIGINAL': 'Sin detalle' }, 0));
		if (!o.fecha && anterior) {
			o.fecha = anterior;
			o.notas.push('Fecha estimada: la planilla no tenía fecha, se tomó la de la OF anterior');
			informe.fechasOF.push({ of: n, fecha: o.fecha });
		}
		anterior = o.fecha ?? anterior;
		const filas = [...o.items, ...o.anexos].map((item) => item.fila);
		const valores = (columna) => filas.map((fila) => fila[columna]);
		o.facturas.push(...valores('FACTURA').map(limpiarFactura));
		const entregas = valores('ENTREGA / ESTADO').map(texto).filter(Boolean);
		o.fechaEntrega = enRango(entregas.map(fechaISO).find(Boolean) ?? null, hoy, o, 'de entrega');
		o.transporte = valores('TRANSPORTE').map(texto).find(Boolean) ?? null;
		o.pendiente = entregas.some((e) => /PENDIENTE/i.test(e));
		o.detalle = {
			observaciones: unir([...valores('OBSERVACIONES'), o.resumen?.OBSERVACIONES]),
			contacto: unir(valores('CONTACTO')),
			pago: unir(valores('PAGO').filter((v) => !/\.pdf$/i.test(texto(v) ?? ''))),
			entrega: unir(entregas.filter((e) => !fechaISO(e))),
			remito: unir(valores('REMITO')),
			fuentes: unir([...valores('FUENTES'), o.resumen?.FUENTES])
		};
		o.reparacion = o.items.filter((i) => i.reparacion).length * 2 > o.items.length;
		o.totalResumen = numero(o.resumen?.['TOTAL S/IVA']);
		if (hasta && o.fecha && o.fecha > hasta) {
			informe.excluidas.push({ of: n, fecha: o.fecha, cliente: o.cliente });
			ordenes.delete(n);
		} else if (o.pendiente) {
			informe.pendientes.push({ of: n, fecha: o.fecha, cliente: o.cliente });
		}
	}

	const posibles = new Map();
	for (const fila of hojas['PARA REVISAR']) {
		const detalle = texto(fila.DETALLE) ?? '';
		const posible = detalle.match(/→\s*OF\s*(\d+)/);
		if (posible && /posible OF/i.test(texto(fila['QUÉ REVISAR']) ?? '')) {
			posibles.set(numero(fila['OF / N°']), posible[1]);
		}
	}

	const escapes = hojas['ESCAPES FABRICADOS'].map(construirEscape).filter((e) => e.numero !== null);
	corregirFechasEscapes(escapes, hoy);
	informe.fechasEscapes = escapes
		.filter((e) => e.notas.some((nota) => nota.startsWith('Fecha')))
		.map((e) => ({ numero: e.numero, fecha: e.fecha, cliente: e.cliente, nota: unir(e.notas) }));
	const sueltos = [];
	for (const escape of escapes) {
		const destino = escape.of && ordenes.get(escape.of);
		if (destino) {
			if (escape.confianza) escape.notas.push(`Vinculado a la OF por: ${escape.confianza}`);
			destino.escapes.push(escape);
			continue;
		}
		const posible = posibles.get(escape.numero);
		if (posible) escape.notas.push(`Posible OF ${posible} (sin confirmar)`);
		if (escape.of) escape.notas.push(`La planilla lo vinculaba a la OF ${escape.of}`);
		sueltos.push(escape);
		informe.escapesSueltos.push({
			numero: escape.numero,
			fecha: escape.fecha,
			cliente: escape.cliente,
			descripcion: escape.descripcion,
			nota: unir(escape.notas)
		});
	}

	for (const o of ordenes.values()) {
		const libres = [...o.escapes].sort((a, b) => a.numero - b.numero);
		for (const item of o.items) {
			item.escapes = libres.filter((e) => item.escapesMencionados.includes(e.numero));
			for (const e of item.escapes) libres.splice(libres.indexOf(e), 1);
		}
		const principal = o.items.reduce((a, b) => (b.cantidad > a.cantidad ? b : a), o.items[0]);
		principal.escapes.push(...libres);
		o.repeticiones = o.items
			.filter((i) => i.repiteDiseno)
			.flatMap((i) => i.escapesMencionados.filter((n) => !o.escapes.some((e) => e.numero === n)));
	}

	const ventas = [];
	const conPalabras = [...ordenes.values()].map((o) => ({
		orden: o,
		clave: claveCliente(o.cliente),
		palabras: claveCliente(o.cliente).split(' ').filter(Boolean)
	}));
	const ordenesDelCliente = (nombre) => {
		const clave = claveCliente(nombre);
		const propias = new Set(clave.split(' ').filter(Boolean));
		return conPalabras
			.filter(
				(c) =>
					c.clave === clave ||
					(c.palabras.length &&
						(c.palabras.length > 1 || c.palabras[0].length >= 5) &&
						c.palabras.every((p) => propias.has(p)))
			)
			.map((c) => c.orden);
	};

	for (const fila of hojas.COBROS) {
		const fecha = fechaISO(fila.FECHA);
		const clave = claveOF(fila.OF);
		const cliente = texto(fila.CLIENTE);
		if (!fecha && !clave) continue;
		const importe = numero(fila.IMPORTE);
		const usd = numero(fila.USD);
		const factura = limpiarFactura(fila.FACTURA, true);
		const medio = factura ? null : texto(fila.FACTURA);
		const recibo = texto(fila.RECIBO);
		const cobro = {
			fecha,
			cliente,
			factura,
			recibo,
			importe,
			usd,
			estado: texto(fila.ESTADO),
			observaciones: unir([medio, fila['OBSERVACIONES ORIGINALES']]),
			hoja: texto(fila.HOJA)
		};
		let destino = clave && ordenes.get(clave.numero);
		if (!destino && !clave && cliente) {
			const delCliente = ordenesDelCliente(cliente).filter(
				(o) => o.fecha && fecha && diasEntre(o.fecha, fecha) >= -10
			);
			const cercanas = delCliente.filter((o) => diasEntre(o.fecha, fecha) <= 120);
			const anteriores = delCliente
				.filter((o) => diasEntre(o.fecha, fecha) <= 365)
				.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
			if (cercanas.length === 1) {
				destino = cercanas[0];
				cobro.observaciones = unir([cobro.observaciones, 'Asignado a la OF por cliente y fecha']);
			} else if (anteriores.length) {
				destino = anteriores[0];
				cobro.observaciones = unir([
					cobro.observaciones,
					'Sin OF en la planilla: asignado al pedido más reciente del cliente, verificar'
				]);
			}
		}
		if (!destino && !clave && (cliente || factura || cobro.observaciones)) {
			const venta = {
				numero: `V${String(ventas.length + 1).padStart(4, '0')}`,
				fecha,
				cliente,
				items: [
					{
						descripcion: cobro.observaciones ?? 'Venta sin OF',
						cantidad: 1,
						precio: Math.max(0, numero(fila['IMPORTE S/IVA']) ?? importe ?? 0)
					}
				],
				anexos: [],
				pagos: [],
				cobrosInfo: [],
				facturas: [],
				notas: [`Cobro registrado sin OF en la planilla ${cobro.hoja ?? ''}`.trim()],
				detalle: {}
			};
			ventas.push(venta);
			destino = venta;
		}
		if (!destino) {
			informe.cobrosSinOF.push({ ...cobro, of: texto(fila.OF) });
			continue;
		}
		if (clave?.anexa) cobro.observaciones = unir([`${clave.anexa}`, cobro.observaciones]);
		if (clave?.duplicada) cobro.observaciones = unir([clave.nota, cobro.observaciones]);
		destino.facturas.push(factura);
		const monto = importe ?? usd;
		if (monto !== null && monto < 0) {
			destino.notas.push(
				`Nota de crédito ${factura ?? ''} por ${monto}${usd !== null ? ' U$S' : ''}`.replace(
					/\s+/g,
					' '
				)
			);
			continue;
		}
		if (!monto) {
			destino.cobrosInfo.push(cobro);
			continue;
		}
		const enDolares = usd !== null && (importe === null || importe === usd);
		destino.pagos.push({
			fecha: fecha ?? destino.fecha,
			moneda: enDolares ? 'USD' : 'ARS',
			monto,
			recibo: recibo && /\d/.test(recibo) ? recibo : null,
			metodo: metodoPago(fila.FACTURA, recibo, cobro.observaciones),
			observaciones: unir([
				factura && `Factura ${factura}`,
				!enDolares && usd !== null && `U$S ${usd}`,
				recibo && !/\d/.test(recibo) && recibo,
				cobro.observaciones,
				cobro.estado,
				cobro.hoja && `Planilla ${cobro.hoja}`
			])
		});
	}

	return { ordenes: [...ordenes.values()], ventas, sueltos, informe };
}
