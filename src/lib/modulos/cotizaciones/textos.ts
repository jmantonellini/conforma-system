export const es = {
	cotizaciones: {
		notificaciones: {
			estadoActualizado: {
				titulo: 'Cotización actualizada',
				mensaje: (numero: string, estado: string) =>
					`La cotización ${numero} cambió al estado "${estado}".`
			},
			listaParaEnviar: {
				titulo: 'Cotización lista para enviar',
				mensaje: (numero: string, cliente: string) =>
					`La cotización ${numero} (${cliente}) está lista para enviar al cliente.`
			},
			asignada: {
				titulo: 'Nueva cotización asignada',
				mensaje: (numero: string) => `La cotización ${numero} fue asignada para revisar.`
			},
			aprobada: {
				titulo: 'Cotización aprobada',
				mensaje: (numero: string) =>
					`El cliente aprobó la cotización ${numero}. Ya podés generar el pedido.`
			},
			nuevaNota: {
				titulo: 'Nueva actualización en cotización',
				mensaje: (autor: string, contenido: string) => `${autor} agregó una nota: ${contenido}`
			},
			comentarioEstado: (comentario: string) => `Comentario: ${comentario}`
		},
		historial: {
			asignada: 'Cotización asignada'
		}
	}
} as const;
