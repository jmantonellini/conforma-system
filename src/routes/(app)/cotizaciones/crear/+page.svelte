<script lang="ts">
	import { crearCotizacion } from '$lib/remote/cotizaciones.remote';
	import { getClientes } from '$lib/remote/clientes.remote';
	import SearchSelect from '$lib/components/ui/SearchSelect.svelte';
	import FormFieldWrapper from '$lib/components/ui/FormFieldWrapper.svelte';
	import { FormActions, PageLayout } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast.svelte';
	import { Paths } from '$lib/types';

	let form = crearCotizacion;
	let clientes = await getClientes({ limit: 100 });

	const CANALES = [
		{ value: 'whatsapp', label: 'WhatsApp' },
		{ value: 'llamada', label: 'Llamada' },
		{ value: 'email', label: 'Email' },
		{ value: 'presencial', label: 'Presencial' },
		{ value: 'otro', label: 'Otro' }
	];

	const clientesOptions = clientes.data.map((c) => ({
		value: c.id.toString(),
		label:
			c.nombre +
			(c.apellido ? ` ${c.apellido}` : '') +
			(c.razon_social ? ` (${c.razon_social})` : '')
	}));
</script>

<PageLayout>
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
					id="cliente_id"
					label="Cliente (opcional)"
					options={clientesOptions}
					placeholder="Buscar cliente cargado..."
					field={form.fields.cliente_id}
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
				💡 Los audios, fotos y videos de WhatsApp se adjuntan desde la pantalla de detalle, una vez
				creada la cotización.
			</p>
		</fieldset>

		<!-- Errores -->
		{#if form?.fields?.allIssues?.()?.length}
			<div role="alert" class="alert gap-4 alert-error">
				<svg class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					{#each form?.fields?.allIssues() as issue (issue)}
						<p class="text-sm">{issue.message}</p>
					{/each}
				</div>
			</div>
		{/if}

		<FormActions
			cancelHref={Paths.COTIZACIONES}
			pending={!!form.pending}
			pendingText="Creando cotización..."
			submitText="Crear Cotización"
		/>
	</form>
</PageLayout>
