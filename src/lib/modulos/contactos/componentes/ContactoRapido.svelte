<script lang="ts">
	import { resolve } from '$app/paths';
	import { FormFieldWrapper, Modal } from '$lib/ui';
	import {
		crearContactoRapido,
		obtenerDatosCuitARCA
	} from '$lib/modulos/contactos/contactos.remote';
	import { toast } from '$lib/ui/toast.svelte';
	import { esCuitValido, formatearCuit } from '$lib/utils/cuit';
	import { mensajeError } from '$lib/utils/errores';

	type Creado = Awaited<ReturnType<typeof crearContactoRapido>>;

	let { onCreado }: { onCreado: (contacto: Creado) => void } = $props();

	const vacio = () => ({ razon_social: '', telefono: '', email: '', cuit: '' });
	let open = $state(false);
	let datos = $state(vacio());
	let guardando = $state(false);
	let consultado = '';

	export function abrir(busqueda = '') {
		const texto = busqueda.trim();
		const digitos = texto.replace(/\D/g, '');
		datos = vacio();
		if (texto.includes('@')) datos.email = texto;
		else if (digitos.length === 11 && esCuitValido(digitos)) datos.cuit = digitos;
		else if (digitos.length >= 6 && digitos.length >= texto.replace(/[\s()+-]/g, '').length)
			datos.telefono = texto;
		else datos.razon_social = texto;
		consultado = '';
		open = true;
	}

	async function consultarArca() {
		const cuit = datos.cuit;
		if (!cuit || cuit === consultado) return;
		if (!esCuitValido(cuit)) return toast.error('Ingresá un CUIT válido de 11 dígitos.');
		consultado = cuit;
		try {
			const arca = await obtenerDatosCuitARCA(cuit);
			if (datos.cuit !== cuit) return;
			if (!arca) return toast.warning('ARCA no encontró datos para ese CUIT.');
			datos.razon_social ||= arca.razon_social ?? '';
			datos.telefono ||= arca.telefono ?? '';
			datos.email ||= arca.email ?? '';
			toast.success('Completamos los datos desde ARCA');
		} catch {
			consultado = '';
			toast.error('No se pudo consultar ARCA');
		}
	}

	async function guardar(evento: SubmitEvent) {
		evento.preventDefault();
		const nombre = datos.razon_social.trim() || datos.telefono.trim() || datos.email.trim();
		if (!nombre) return toast.error('Ingresá al menos un nombre, teléfono o email');
		guardando = true;
		try {
			const contacto = await crearContactoRapido({
				razon_social: nombre,
				telefono: datos.telefono || undefined,
				email: datos.email || undefined,
				cuit: datos.cuit || undefined
			});
			onCreado(contacto);
			open = false;
			toast.success(
				contacto.reutilizado ? 'Ya existía: lo seleccionamos' : 'Contacto creado y seleccionado'
			);
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo crear el contacto'));
		} finally {
			guardando = false;
		}
	}
</script>

<Modal
	bind:open
	lateral
	titulo="Nuevo contacto"
	descripcion="Se crea como cliente y queda seleccionado en el formulario."
	accion={{ etiqueta: 'Crear y seleccionar', form: 'contacto-rapido', pendiente: guardando }}
>
	<form id="contacto-rapido" onsubmit={guardar}>
		<FormFieldWrapper
			id="rapido-cuit"
			label="CUIT"
			ayuda="Con el CUIT completamos el resto desde ARCA."
		>
			<input
				id="rapido-cuit"
				class="input font-mono"
				inputmode="numeric"
				autocomplete="off"
				placeholder="20-12345678-9"
				value={formatearCuit(datos.cuit)}
				oninput={(e) => (datos.cuit = e.currentTarget.value.replace(/\D/g, '').slice(0, 11))}
				onblur={consultarArca}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper id="rapido-nombre" label="Nombre o razón social" required>
			<!-- svelte-ignore a11y_autofocus -->
			<input id="rapido-nombre" class="input" autofocus bind:value={datos.razon_social} />
		</FormFieldWrapper>
		<FormFieldWrapper id="rapido-telefono" label="Teléfono">
			<input id="rapido-telefono" class="input" type="tel" bind:value={datos.telefono} />
		</FormFieldWrapper>
		<FormFieldWrapper id="rapido-email" label="Email">
			<input id="rapido-email" class="input" type="email" bind:value={datos.email} />
		</FormFieldWrapper>
		<p class="text-sm text-base-content/60">
			¿Necesitás dirección o datos fiscales completos? Podés completarlos después desde
			<a class="link" href={resolve('/contactos')} target="_blank">Contactos</a>.
		</p>
	</form>
</Modal>
