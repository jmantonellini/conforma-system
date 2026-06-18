import * as v from 'valibot';

export const ClienteSchemaBase = v.object({
	nombre: v.pipe(v.string(), v.minLength(3, 'El nombre debe tener al menos 3 caracteres.')),
	razon_social: v.optional(v.string()),
	cuit: v.optional(v.string()),
	email: v.optional(v.string()),
	telefono: v.optional(v.string()),
	pais: v.optional(v.string(), 'Argentina'),
	provincia: v.optional(v.string()),
	ciudad: v.optional(v.string()),
	codigo_postal: v.optional(v.string()),
	calle: v.optional(v.string()),
	numero: v.optional(v.string()),
	piso: v.optional(v.string()),
	departamento: v.optional(v.string())
});
