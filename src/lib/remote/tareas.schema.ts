import * as v from 'valibot';
import { EstadosTarea, Prioridades } from '$lib/types';

export const TareaSchema = v.object({
	titulo: v.optional(v.pipe(v.string(), v.nonEmpty('El título es requerido'))),
	descripcion: v.optional(v.string()),
	estado: v.optional(v.enum(EstadosTarea), EstadosTarea.PENDIENTE),
	prioridad: v.optional(v.enum(Prioridades), Prioridades.MEDIA),
	fecha_entrega: v.optional(v.string()),
	asignado_a: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
	archivada: v.optional(v.boolean())
});
