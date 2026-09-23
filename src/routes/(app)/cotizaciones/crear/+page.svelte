<script lang="ts">
	import { crearCotizacion } from '$lib/remote/cotizaciones.remote';
	import { obtenerContactosCliente } from '$lib/remote/contactos.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { Can, FormActions, FormErrors, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';

	let form = crearCotizacion;
	let clientes = await obtenerContactosCliente({ limit: 100 });

	const CANALES = [
		{ value: 'whatsapp', label: 'WhatsApp' },
		{ value: 'llamada', label: 'Llamada' },
		{ value: 'email', label: 'Email' },
		{ value: 'presencial', label: 'Presencial' },
		{ value: 'otro', label: 'Otro' }
	];

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
						form.element.reset();
						toast.success('Cotización creada!');
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

				<p class="text-sm text-base-content/60">
					💡 Los audios, fotos y videos de WhatsApp se adjuntan desde la pantalla de detalle, una
					vez creada la cotización.
				</p>
			</fieldset>

			<FormErrors {form} />

			<FormActions
				cancelHref={Paths.COTIZACIONES}
				pending={!!form.pending}
				pendingText="Creando cotización..."
				submitText="Crear Cotización"
			/>
		</form>
	</Can>
</PageLayout>
