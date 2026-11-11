import { toast } from '$lib/stores/toast.svelte';
import { mensajeError } from '$lib/utils/errores';

type Pedido = {
	titulo: string;
	mensaje: string;
	/** Texto del botón de confirmación. */
	accion?: string;
	/** Acción destructiva (eliminar, cancelar): botón en rojo. */
	peligro?: boolean;
};

class Confirmacion {
	pedido = $state<Pedido | null>(null);
	#resolver?: (confirmado: boolean) => void;

	pedir(pedido: Pedido) {
		this.#resolver?.(false);
		this.pedido = pedido;
		return new Promise<boolean>((resolver) => (this.#resolver = resolver));
	}

	responder(confirmado: boolean) {
		this.#resolver?.(confirmado);
		this.#resolver = undefined;
		this.pedido = null;
	}
}

export const confirmacion = new Confirmacion();

/** Reemplazo de `window.confirm` con el diálogo de la app: `if (await confirmar({...}))`. */
export const confirmar = (pedido: Pedido) => confirmacion.pedir(pedido);

/**
 * Confirma, ejecuta y avisa: el flujo típico de eliminar/archivar.
 * Devuelve `true` si la acción se confirmó y terminó bien.
 */
export async function confirmarYEjecutar({
	ejecutar,
	exito,
	...pedido
}: Partial<Pedido> & { mensaje: string; ejecutar: () => Promise<unknown>; exito?: string }) {
	const confirmado = await confirmar({
		titulo: 'Eliminar',
		accion: 'Eliminar',
		peligro: true,
		...pedido
	});
	if (!confirmado) return false;
	try {
		await ejecutar();
		if (exito) toast.success(exito);
		return true;
	} catch (error) {
		toast.error(mensajeError(error, 'No se pudo completar la acción'));
		return false;
	}
}
