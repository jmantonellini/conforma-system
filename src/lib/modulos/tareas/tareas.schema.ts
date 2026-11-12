import * as v from 'valibot';
import { EstadosTarea, Prioridades } from './tipos';

const idOpcional = v.optional(
	v.pipe(
		v.string(),
		v.transform((valor) => (valor ? Number(valor) : null)),
		v.nullable(v.number())
	)
);

export const TareaSchema = v.object({
	id: idOpcional,
	titulo: v.pipe(v.string(), v.trim(), v.nonEmpty('El título es requerido')),
	descripcion: v.optional(v.pipe(v.string(), v.trim())),
	estado: v.optional(v.enum(EstadosTarea), EstadosTarea.PENDIENTE),
	prioridad: v.optional(v.enum(Prioridades), Prioridades.MEDIA),
	fecha_entrega: v.optional(v.string()),
	asignado_a: idOpcional
});

export const FiltroTareasSchema = v.optional(
	v.object({ archivadas: v.optional(v.boolean(), false) }),
	{}
);
