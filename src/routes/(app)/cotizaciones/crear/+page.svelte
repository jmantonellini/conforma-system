<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { crearCotizacion } from '$lib/remote/cotizaciones.remote';
	import { obtenerContactosCliente } from '$lib/remote/contactos.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { Can, FormActions, FormErrors, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';
	import { CANALES_COTIZACION } from '$lib/utils/canales-cotizacion';

	let form = crearCotizacion;
	let clientes = await obtenerContactosCliente({ limit: 100 });

	const CANALES = Object.entries(CANALES_COTIZACION).map(([value, label]) => ({ value, label }));
	let archivosSeleccionados = $state<File[]>([]);
	let vistasPrevias = $state<{ archivo: File; url: string }[]>([]);
	let subiendoArchivos = $state(false);

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

	const clientesOptions = clientes.data.map((c) => ({
		value: c.id.toString(),
		label: c.razon_social
	}));
	const distribuidoresOptions = clientes.data
		.filter((c) => c.es_distribuidor)
		.map((c) => ({
			value: c.id.toString(),
			label: `${c.razon_social} (distribuidor)`
		}));

	function completarContacto(clienteId: string) {
		const cliente = clientes.data.find((item) => item.id.toString() === clienteId);
		if (!cliente) return;
		const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ');
		form.fields.cliente_nombre.set(nombreCompleto || cliente.razon_social);
		form.fields.cliente_telefono.set(cliente.telefono || '');
		form.fields.cliente_email.set(cliente.email || '');
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
						subiendoArchivos = true;
						try {
							await subirArchivos(cotizacionId);
							toast.success('Cotización creada');
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
			class="space-y-6"
		>
			<!-- Contacto -->
			<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend text-lg">¿Quién consulta?</legend>

				<div class="grid gap-4 md:grid-cols-4">
					<SearchSelect
						id="contacto_id"
						label="Cliente (opcional)"
						options={clientesOptions}
						placeholder="Buscar cliente cargado..."
						field={form.fields.contacto_id}
						onChange={completarContacto}
					/>

					<SearchSelect
						id="contacto_distribuidor_id"
						label="Distribuidor (opcional)"
						options={distribuidoresOptions}
						placeholder="Buscar distribuidor..."
						field={form.fields.contacto_distribuidor_id}
					/>

					<FormFieldWrapper label="Nombre del contacto" id="cliente_nombre" required>
						<input
							id="cliente_nombre"
							class="input"
							placeholder="Nombre y Apellido"
							{...form.fields.cliente_nombre.as('text')}
						/>
					</FormFieldWrapper>

					<FormFieldWrapper label="Teléfono" id="cliente_telefono">
						<input
							class="input"
							placeholder="Opcional"
							{...form.fields.cliente_telefono.as('text')}
						/>
					</FormFieldWrapper>

					<FormFieldWrapper label="Email" id="cliente_email">
						<input class="input" placeholder="Opcional" {...form.fields.cliente_email.as('text')} />
					</FormFieldWrapper>
				</div>
			</fieldset>

			<!-- Consulta -->
			<fieldset class="fieldset gap-2 rounded-box border border-base-300 bg-base-200 p-4">
				<legend class="fieldset-legend text-lg">Consulta recibida</legend>

				<div class="grid gap-4 md:grid-cols-4">
					<FormFieldWrapper label="Canal" id="canal">
						<select class="select" {...form.fields.canal.as('select')}>
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
						class="textarea w-full resize-none"
					></textarea>
				</FormFieldWrapper>

				<FormFieldWrapper label="Observaciones (opcional)" id="observaciones">
					<textarea
						placeholder="Notas internas..."
						rows={2}
						{...form.fields.observaciones.as('text')}
						class="textarea w-full resize-none"
					></textarea>
				</FormFieldWrapper>

				<FormFieldWrapper label="Archivos adjuntos" id="archivos">
					<input
						type="file"
						multiple
						accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,application/pdf"
						class="file-input w-full"
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
				cancelHref={Paths.COTIZACIONES}
				pending={!!form.pending || subiendoArchivos}
				pendingText="Creando cotización..."
				submitText="Crear Cotización"
			/>
		</form>
	</Can>
</PageLayout>
