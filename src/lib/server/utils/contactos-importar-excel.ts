export const normalizar = (valor: unknown) =>
	String(valor ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '');

export const normalizarCabecera = (valor: unknown) => {
	const aliases: Record<string, string> = {
		razon_social: 'razon_social',
		nombre_empresa: 'razon_social',
		nombre: 'nombre',
		apellido: 'apellido',
		cuit: 'cuit',
		email: 'email',
		correo: 'email',
		telefono: 'telefono',
		telefono_celular: 'telefono',
		celular: 'telefono',
		calle: 'calle',
		direccion: 'calle',
		domicilio: 'calle',
		numero: 'numero',
		nro: 'numero',
		numero_calle: 'numero',
		codigo_postal: 'codigo_postal',
		cp: 'codigo_postal',
		postal: 'codigo_postal',
		rol: 'rol',
		tipo: 'rol',
		distribuidor: 'es_distribuidor',
		es_distribuidor: 'es_distribuidor',
		comision: 'porcentaje_compensacion',
		porcentaje_comision: 'porcentaje_compensacion',
		saldo: 'saldo_disponible',
		saldo_disponible: 'saldo_disponible',
		codigo_proveedor: 'codigo_proveedor',
		contacto_proveedor: 'contacto_proveedor',
		condiciones_pago: 'condiciones_pago'
	};
	return aliases[normalizar(valor)];
};

export const mapearFilaContactoExcel = (fila: Record<string, unknown>) => {
	const filaMapeada = Object.fromEntries(
		Object.entries(fila).map(([clave, valor]) => [normalizarCabecera(clave), valor])
	);

	return {
		razon_social: String(filaMapeada.razon_social ?? '').trim() || undefined,
		nombre: String(filaMapeada.nombre ?? '').trim() || undefined,
		apellido: String(filaMapeada.apellido ?? '').trim() || undefined,
		cuit: String(filaMapeada.cuit ?? '').trim() || undefined,
		email: String(filaMapeada.email ?? '').trim() || undefined,
		telefono: String(filaMapeada.telefono ?? '').trim() || undefined,
		calle: String(filaMapeada.calle ?? '').trim() || undefined,
		numero: String(filaMapeada.numero ?? '').trim() || undefined,
		codigo_postal: String(filaMapeada.codigo_postal ?? '').trim() || undefined,
		pais: String(filaMapeada.pais ?? '').trim() || undefined,
		provincia: String(filaMapeada.provincia ?? '').trim() || undefined,
		ciudad: String(filaMapeada.ciudad ?? '').trim() || undefined,
		piso: String(filaMapeada.piso ?? '').trim() || undefined,
		departamento: String(filaMapeada.departamento ?? '').trim() || undefined,
		rol: (filaMapeada.rol ? String(filaMapeada.rol).trim().toLowerCase() : 'ninguno') as
			| 'ninguno'
			| 'cliente'
			| 'proveedor'
			| 'ambos',
		es_distribuidor: booleano(filaMapeada.es_distribuidor),
		porcentaje_compensacion: numero(filaMapeada.porcentaje_compensacion ?? 0),
		saldo_disponible: numero(filaMapeada.saldo_disponible ?? 0),
		codigo_proveedor: String(filaMapeada.codigo_proveedor ?? '').trim() || undefined,
		contacto_proveedor: String(filaMapeada.contacto_proveedor ?? '').trim() || undefined,
		condiciones_pago: String(filaMapeada.condiciones_pago ?? '').trim() || undefined
	};
};

export const numero = (valor: unknown) => {
	const texto = String(valor ?? '')
		.trim()
		.replace(/%$/, '');
	const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
	return Number(normalizado);
};

export const booleano = (valor: unknown) =>
	['true', 'si', 'sí', '1', 'x', 'yes'].includes(normalizar(valor));
