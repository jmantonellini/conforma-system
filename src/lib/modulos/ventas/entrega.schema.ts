import * as v from 'valibot';
import { MODALIDADES_ENTREGA } from './trabajo';

const texto = (maximo = 300) => v.optional(v.pipe(v.string(), v.trim(), v.maxLength(maximo)), '');

export const CamposEntregaSchema = {
	transportista: texto(),
	modalidad: v.optional(v.union([v.literal(''), v.picklist(MODALIDADES_ENTREGA)]), ''),
	direccion: texto(),
	localidad: texto(),
	provincia: texto(),
	codigo_postal: texto(20),
	recibe: texto(),
	telefono: texto(),
	indicaciones: texto(1000),
	consumidor_final: v.optional(v.boolean(), false)
};
