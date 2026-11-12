import * as v from 'valibot';

export const EmpleadoSchema = v.object({
	nombre: v.pipe(v.string(), v.nonEmpty('Nombre requerido')),
	apellido: v.pipe(v.string(), v.nonEmpty('Apellido requerido')),
	email: v.optional(v.union([v.literal(''), v.pipe(v.string(), v.email('Email inválido'))])),
	telefono: v.optional(v.string()),
	dni: v.optional(v.string()),
	direccion: v.optional(v.string()),
	fecha_ingreso: v.optional(v.string())
});
