import * as v from 'valibot';

const texto = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300)), '');

export const CamposEntregaSchema = {
	transportista: texto,
	direccion: texto,
	localidad: texto,
	recibe: texto,
	telefono: texto
};
