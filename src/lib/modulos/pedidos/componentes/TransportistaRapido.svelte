<script lang="ts">
	import { FormFieldWrapper, Modal } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { agregarTransportista } from '../transportistas.remote';

	let { onCreado }: { onCreado: (nombre: string) => void } = $props();

	let open = $state(false);
	let nombre = $state('');
	let guardando = $state(false);

	export function abrir(busqueda = '') {
		nombre = busqueda.trim();
		open = true;
	}

	async function guardar(evento: SubmitEvent) {
		evento.preventDefault();
		if (!nombre.trim()) return toast.error('Escribí el nombre del transportista');
		guardando = true;
		try {
			const creado = await agregarTransportista(nombre);
			onCreado(creado);
			open = false;
			toast.success(`${creado} agregado y seleccionado`);
		} catch (causa) {
			toast.error(mensajeError(causa, 'No se pudo agregar el transportista'));
		} finally {
			guardando = false;
		}
	}
</script>

<Modal
	bind:open
	lateral
	titulo="Nuevo transportista"
	descripcion="Queda disponible para todos los contactos y pedidos, y seleccionado en el formulario."
	accion={{ etiqueta: 'Crear y seleccionar', form: 'transportista-rapido', pendiente: guardando }}
>
	<form id="transportista-rapido" onsubmit={guardar}>
		<FormFieldWrapper id="rapido-transportista" label="Nombre" required>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				id="rapido-transportista"
				class="input"
				autofocus
				placeholder="Ej: Vía Cargo"
				bind:value={nombre}
			/>
		</FormFieldWrapper>
		<p class="text-sm text-base-content/60">
			Para renombrar o desactivar transportistas, entrá a Envíos → Transportistas.
		</p>
	</form>
</Modal>
