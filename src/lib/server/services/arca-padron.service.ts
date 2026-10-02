import { env } from '$env/dynamic/private';
import { Arca } from '@arcasdk/core';
import { provincias } from '$lib/data/direcciones';
import { esCuitValido } from '$lib/utils/cuit';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type DatosContactoARCA = {
	razon_social?: string;
	nombre?: string;
	apellido?: string;
	pais?: string;
	provincia?: string;
	ciudad?: string;
	codigo_postal?: string;
	calle?: string;
	numero?: string;
	piso?: string;
	departamento?: string;
};

function normalizarTexto(valor: string): string {
	return valor
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function obtenerProvincia(nombre?: string): string | undefined {
	if (!nombre) return undefined;

	const normalizado = normalizarTexto(nombre);
	if (['capitalfederal', 'ciudadautonomadebuenosaires'].includes(normalizado)) return 'CABA';

	return provincias.find((provincia) => normalizarTexto(provincia) === normalizado);
}

function obtenerDomicilioFiscal(domicilios: unknown): Record<string, unknown> | undefined {
	const lista = Array.isArray(domicilios) ? domicilios : domicilios ? [domicilios] : [];
	const direcciones = lista.filter(
		(domicilio): domicilio is Record<string, unknown> =>
			typeof domicilio === 'object' && domicilio !== null
	);

	return (
		direcciones.find((domicilio) =>
			String(domicilio.tipoDomicilio ?? '')
				.toLowerCase()
				.includes('fiscal')
		) ?? direcciones[0]
	);
}

function textoOpcional(valor: unknown): string | undefined {
	if (typeof valor === 'string') return valor.trim() || undefined;
	if (typeof valor === 'number') return String(valor);
	return undefined;
}

export async function consultarCuitARCA(cuit: string): Promise<DatosContactoARCA | null> {
	const cuitRepresentada = env.ARCA_CUIT?.trim();
	const cert = env.ARCA_CERT?.replace(/\\n/g, '\n').trim();
	const key = env.ARCA_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

	if (!cuitRepresentada || !esCuitValido(cuitRepresentada) || !cert || !key) {
		throw new Error('La conexión de producción con ARCA no está configurada.');
	}
	if (!esCuitValido(cuit)) throw new Error('El CUIT ingresado no es válido.');

	const ticketPath = join(tmpdir(), 'conforma-system-arca-tickets');
	await mkdir(ticketPath, { recursive: true, mode: 0o700 });

	const arca = new Arca({
		cuit: Number(cuitRepresentada),
		cert,
		key,
		production: true,
		ticketPath
	});
	const resultado = await arca.registerScopeThirteenService.getTaxpayerDetails(Number(cuit));
	const persona = resultado?.datosGenerales as Record<string, unknown> | undefined;
	if (!persona) return null;

	const domicilio = obtenerDomicilioFiscal(persona.domicilio);
	const nombre = textoOpcional(persona.nombre);
	const apellido = textoOpcional(persona.apellido);
	const razonSocial =
		textoOpcional(persona.razonSocial) || [nombre, apellido].filter(Boolean).join(' ');

	return {
		razon_social: razonSocial || undefined,
		nombre,
		apellido,
		pais: domicilio ? 'Argentina' : undefined,
		provincia: obtenerProvincia(textoOpcional(domicilio?.descripcionProvincia)),
		ciudad: textoOpcional(domicilio?.localidad),
		codigo_postal: textoOpcional(domicilio?.codigoPostal),
		calle: textoOpcional(domicilio?.calle) || textoOpcional(domicilio?.direccion),
		numero: textoOpcional(domicilio?.numero),
		piso: textoOpcional(domicilio?.piso),
		departamento:
			textoOpcional(domicilio?.oficinaDptoLocal) || textoOpcional(domicilio?.datoAdicional)
	};
}
