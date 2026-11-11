<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { crearCotizacion } from '$lib/remote/cotizaciones.remote';
	import {
		crearContactoRapido,
		obtenerContactosCliente,
		obtenerDatosCuitARCA
	} from '$lib/remote/contactos.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { Can, FormActions, FormErrors, Modal, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';
	import { CANALES_COTIZACION } from '$lib/utils/canales-cotizacion';
	import { esCuitValido, formatearCuit } from '$lib/utils/cuit';

	let form = crearCotizacion;
	const limiteContactosSelect = 50;
	let clientes = await obtenerContactosCliente({ limit: limiteContactosSelect });

	const CANALES = Object.entries(CANALES_COTIZACION).map(([value, label]) => ({ value, label }));
	let archivosSeleccionados = $state<File[]>([]);
	let vistasPrevias = $state<{ archivo: File; url: string }[]>([]);
	let subiendoArchivos = $state(false);
	let modalContactoAbierto = $state(false);
	let nuevoContacto = $state({ razon_social: '', telefono: '', email: '', cuit: '' });
	let cuitFormateado = $state('');
	let cuitConsultado = '';
	let guardandoContacto = $state(false);

	function seleccionarArchivos(event: Event) {
		for (const vista of vistasPrevias) if (vista.url) URL.revokeObjectURL(vista.url);
		const input = event.currentTarget as HTMLInputElement;
		archivosSeleccionados = Array.from(input.files ?? []);
		vistasPrevias = archivosSeleccionados.map((archivo) => ({
			archivo,
			url: archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : ''
		}));
	}

	function quitarArchivo(archivo: File) {
		const vista = vistasPrevias.find((item) => item.archivo === archivo);
		if (vista?.url) URL.revokeObjectURL(vista.url);
		archivosSeleccionados = archivosSeleccionados.filter((item) => item !== archivo);
		vistasPrevias = vistasPrevias.filter((item) => item.archivo !== archivo);
	}

	async function subirArchivos(cotizacionId: number) {
		if (!archivosSeleccionados.length) return;
		const archivos = new FormData();
		for (const archivo of archivosSeleccionados) archivos.append('archivos', archivo);
		const response = await fetch(`/cotizaciones/${cotizacionId}/adjuntos`, {
			method: 'POST',
			body: archivos
		});
		const resultado: { error?: string; resultados?: { error?: string }[] } = await response.json();
		if (!response.ok || resultado.resultados?.some((item: { error?: string }) => item.error)) {
			throw new Error(resultado.error || 'No se pudieron subir todos los archivos');
		}
	}

	onDestroy(() => {
		for (const vista of vistasPrevias) if (vista.url) URL.revokeObjectURL(vista.url);
	});

	function crearOpcionesClientes(contactos: typeof clientes.data) {
		return contactos.map((c) => ({
			value: c.id.toString(),
			label: c.razon_social
		}));
	}

	function crearOpcionesDistribuidores(contactos: typeof clientes.data) {
		return contactos
			.filter((c) => c.es_distribuidor)
			.map((c) => ({
				value: c.id.toString(),
				label: `${c.razon_social} (distribuidor)`
			}));
	}

	let clientesOptions = $state(crearOpcionesClientes(clientes.data));
	let distribuidoresOptions = $state(crearOpcionesDistribuidores(clientes.data));
	let solicitudBusquedaClientes = 0;
	let solicitudBusquedaDistribuidores = 0;

	function abrirAltaRapida(busqueda = '') {
		const limpio = busqueda.trim();
		const digitos = limpio.replace(/\D/g, '');
		nuevoContacto = {
			razon_social: limpio && !limpio.includes('@') && digitos !== limpio ? limpio : '',
			telefono: digitos.length >= 6 && digitos === limpio.replace(/[^0-9]/g, '') ? limpio : '',
			email: limpio.includes('@') ? limpio : '',
			cuit: ''
		};
		cuitFormateado = '';
		cuitConsultado = '';
		modalContactoAbierto = true;
	}

	function actualizarCuit(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const cuit = input.value.replace(/\D/g, '').slice(0, 11);
		const digitosAntes = input.value
			.slice(0, input.selectionStart ?? input.value.length)
			.replace(/\D/g, '').length;
		nuevoContacto.cuit = cuit;
		cuitFormateado = formatearCuit(cuit);
		input.value = cuitFormateado;
		const cursor = digitosAntes + Number(digitosAntes > 2) + Number(digitosAntes > 10);
		input.setSelectionRange(
			Math.min(cursor, cuitFormateado.length),
			Math.min(cursor, cuitFormateado.length)
		);
		if (cuit !== cuitConsultado) cuitConsultado = '';
	}

	async function consultarCuitContacto() {
		const cuit = nuevoContacto.cuit.trim();
		if (!cuit) return;
		if (!esCuitValido(cuit)) {
			toast.error('Ingresá un CUIT válido de 11 dígitos.');
			return;
		}
		if (cuit === cuitConsultado) return;
		cuitConsultado = cuit;
		try {
			const datos = await obtenerDatosCuitARCA(cuit);
			if (nuevoContacto.cuit !== cuit) return;
			if (!datos) {
				toast.warning('ARCA no encontró datos para ese CUIT.');
				return;
			}
			if (!nuevoContacto.razon_social.trim() && datos.razon_social)
				nuevoContacto.razon_social = datos.razon_social;
			if (!nuevoContacto.telefono.trim() && datos.telefono) nuevoContacto.telefono = datos.telefono;
			if (!nuevoContacto.email.trim() && datos.email) nuevoContacto.email = datos.email;
			toast.success('Datos de ARCA cargados en los campos vacíos.');
		} catch {
			if (nuevoContacto.cuit === cuit) cuitConsultado = '';
			toast.error('No se pudo consultar ARCA. Revisá la conexión e intentá de nuevo.');
		}
	}

	async function guardarContactoRapido() {
		if (
			!nuevoContacto.razon_social.trim() &&
			!nuevoContacto.telefono.trim() &&
			!nuevoContacto.email.trim()
		) {
			toast.error('Ingresá al menos un dato de contacto');
			return;
		}
		guardandoContacto = true;
		try {
			const contacto = await crearContactoRapido({
				razon_social:
					nuevoContacto.razon_social.trim() ||
					nuevoContacto.telefono.trim() ||
					nuevoContacto.email.trim(),
				telefono: nuevoContacto.telefono || undefined,
				email: nuevoContacto.email || undefined,
				cuit: nuevoContacto.cuit || undefined
			});
			const option = { value: String(contacto.id), label: contacto.razon_social };
			clientesOptions = [option, ...clientesOptions.filter((item) => item.value !== option.value)];
			form.fields.contacto_id.set(option.value);
			modalContactoAbierto = false;
			nuevoContacto = { razon_social: '', telefono: '', email: '', cuit: '' };
			toast.success(
				contacto.reutilizado ? 'Contacto existente seleccionado' : 'Contacto creado y seleccionado'
			);
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo guardar el contacto'));
		} finally {
			guardandoContacto = false;
		}
	}

	async function buscarContactos(search: string, tipo: 'cliente' | 'distribuidor') {
		const soloDistribuidores = tipo === 'distribuidor';
		const solicitud = soloDistribuidores
			? ++solicitudBusquedaDistribuidores
			: ++solicitudBusquedaClientes;
		const resultado = await obtenerContactosCliente({
			search: search || undefined,
			soloDistribuidores: soloDistribuidores || undefined,
			limit: limiteContactosSelect
		});
		const solicitudActual = soloDistribuidores
			? solicitudBusquedaDistribuidores
			: solicitudBusquedaClientes;
		if (solicitud !== solicitudActual) return;
		if (soloDistribuidores) {
			distribuidoresOptions = crearOpcionesDistribuidores(resultado.data);
		} else {
			clientesOptions = crearOpcionesClientes(resultado.data);
		}
	}
</script>

<PageLayout>
	<Can modulo="cotizaciones" accion="create">
		<form
			{...form.enhance(async (form) => {
				try {
					if (await form.submit()) {
						const cotizacionId = form.result?.cotizacionId;
						if (!cotizacionId) throw new Error('No se recibió el número de cotización');
						toast.success('Cotización creada');
						subiendoArchivos = true;
						try {
							await subirArchivos(cotizacionId);
						} catch {
							toast.warning(
								'La cotización se creó, pero no se pudieron subir todos los archivos. Podés reintentarlo desde el detalle.'
							);
						} finally {
							subiendoArchivos = false;
						}
						goto(resolve(`/cotizaciones/${cotizacionId}`));
					} else {
						toast.error('Error de validación');
					}
				} catch (error) {
					console.log(error);
					toast.error('Error del servidor');
				}
			})}
			class="space-y-4"
		>
			<!-- Contacto -->
			<fieldset class="fieldset seccion">
				<legend class="fieldset-legend text-lg">¿Quién consulta?</legend>

				<div class="grid gap-4 md:grid-cols-4">
					<SearchSelect
						id="contacto_id"
						label="Razón Social"
						options={clientesOptions}
						placeholder="Buscar por nombre, teléfono, email o CUIT..."
						field={form.fields.contacto_id}
						onSearch={(search) => buscarContactos(search, 'cliente')}
						onCreate={abrirAltaRapida}
						createLabel="Crear nuevo contacto"
					/>

					<SearchSelect
						id="contacto_distribuidor_id"
						label="Distribuidor (opcional)"
						options={distribuidoresOptions}
						placeholder="Buscar distribuidor..."
						field={form.fields.contacto_distribuidor_id}
						onSearch={(search) => buscarContactos(search, 'distribuidor')}
					/>
				</div>
			</fieldset>

			<!-- Consulta -->
			<fieldset class="fieldset gap-2 rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend text-lg">Consulta recibida</legend>

				<div class="grid gap-4 md:grid-cols-4">
					<FormFieldWrapper label="Canal" id="canal">
						<select class="select select-sm" {...form.fields.canal.as('select')}>
							{#each CANALES as c (c.value)}
								<option value={c.value}>{c.label}</option>
							{/each}
						</select>
					</FormFieldWrapper>
				</div>

				<FormFieldWrapper label="¿Qué piden?" id="descripcion" required>
					<textarea
						id="descripcion"
						placeholder="Transcripción del audio o resumen del pedido del cliente. Ej: 'Necesita un caño de escape completo para un Gol 2015, pregunta si hacemos ese modelo y cuánto sale.'"
						rows={4}
						{...form.fields.descripcion.as('text')}
						class="textarea w-full resize-none textarea-sm"
					></textarea>
				</FormFieldWrapper>

				<FormFieldWrapper label="Observaciones (opcional)" id="observaciones">
					<textarea
						placeholder="Notas internas..."
						rows={2}
						{...form.fields.observaciones.as('text')}
						class="textarea w-full resize-none textarea-sm"
					></textarea>
				</FormFieldWrapper>

				<FormFieldWrapper label="Archivos adjuntos" id="archivos">
					<input
						type="file"
						multiple
						accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,application/pdf"
						class="file-input w-full file-input-sm"
						disabled={subiendoArchivos}
						onchange={seleccionarArchivos}
					/>
				</FormFieldWrapper>
				{#if vistasPrevias.length}
					<div class="flex flex-wrap gap-3">
						{#each vistasPrevias as vista (vista.archivo)}
							<div class="flex items-center gap-2 rounded border border-base-300 p-2">
								{#if vista.url}
									<img src={vista.url} alt={vista.archivo.name} class="h-16 w-16 object-cover" />
								{/if}
								<span class="max-w-48 truncate text-sm">{vista.archivo.name}</span>
								<button
									type="button"
									class="btn btn-ghost btn-xs"
									aria-label={`Quitar ${vista.archivo.name}`}
									disabled={subiendoArchivos}
									onclick={() => quitarArchivo(vista.archivo)}>✕</button
								>
							</div>
						{/each}
					</div>
				{/if}
			</fieldset>

			<FormErrors {form} />

			<FormActions
				cancelHref={resolve(Paths.COTIZACIONES)}
				pending={!!form.pending || subiendoArchivos}
				pendingText="Creando cotización..."
				submitText="Crear Cotización"
			/>
		</form>
	</Can>
</PageLayout>

<Modal
	bind:open={modalContactoAbierto}
	titulo="Nuevo contacto"
	descripcion="Con el CUIT completamos los datos desde ARCA."
	alCerrar={() => {
		nuevoContacto = { razon_social: '', telefono: '', email: '', cuit: '' };
		cuitFormateado = '';
		cuitConsultado = '';
	}}
	accion={{
		etiqueta: 'Crear y seleccionar',
		pendiente: guardandoContacto,
		onclick: guardarContactoRapido
	}}
>
	<div class="grid gap-4">
		<FormFieldWrapper id="nuevo-cuit" label="CUIT (opcional)">
			<input
				class="input"
				inputmode="numeric"
				maxlength="13"
				autocomplete="off"
				value={cuitFormateado}
				oninput={actualizarCuit}
				onblur={consultarCuitContacto}
			/>
		</FormFieldWrapper>
		<FormFieldWrapper id="nuevo-razon-social" label="Nombre o razón social" required>
			<input class="input" bind:value={nuevoContacto.razon_social} />
		</FormFieldWrapper>
		<FormFieldWrapper id="nuevo-telefono" label="Teléfono">
			<input class="input" type="tel" bind:value={nuevoContacto.telefono} />
		</FormFieldWrapper>
		<FormFieldWrapper id="nuevo-email" label="Email">
			<input class="input" type="email" bind:value={nuevoContacto.email} />
		</FormFieldWrapper>
	</div>
</Modal>
