<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FormActions, FormErrors, FormFieldWrapper, PageLayout } from '$lib/components/ui';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import { crearContacto } from '$lib/remote/contactos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import { page } from '$app/state';

	const form = crearContacto;
	let rol = $state(page.url.searchParams.get('rol') === 'cliente' ? 'cliente' : 'ninguno');
	let esDistribuidor = $state(false);
	let porcentajeCompensacion = $state(0);
</script>

<PageLayout>
	<a href={resolve('/contactos')} class="btn btn-ghost btn-sm">← Volver</a>
	<form
		{...form.enhance(async (instance) => {
			try {
				if (await instance.submit()) {
					form.element?.reset();
					goto(resolve('/contactos'));
					toast.success('Contacto creado');
				} else toast.error('Revisá los datos del contacto');
			} catch {
				toast.error('No se pudo crear el contacto');
			}
		})}
		class="space-y-6"
	>
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Información del contacto</legend>
			<div class="grid gap-4 md:grid-cols-3">
				<FormFieldWrapper id="razon_social" label="Razón social" required>
					<input class="input" {...form.fields.razon_social.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="nombre" label="Nombre">
					<input class="input" {...form.fields.nombre.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="apellido" label="Apellido">
					<input class="input" {...form.fields.apellido.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="cuit" label="CUIT">
					<input class="input" {...form.fields.cuit.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="email" label="Email">
					<input class="input" {...form.fields.email.as('email', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="telefono" label="Teléfono">
					<input class="input" {...form.fields.telefono.as('text', '')} />
				</FormFieldWrapper>
				<FormFieldWrapper id="rol" label="Rol comercial">
					<select
						class="select"
						{...form.fields.rol.as('select', rol)}
						onchange={(event) => (rol = event.currentTarget.value)}
					>
						<option value="ninguno">Sin rol comercial</option>
						<option value="cliente">Cliente</option>
						<option value="proveedor">Proveedor</option>
						<option value="ambos">Cliente y proveedor</option>
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper id="es_distribuidor" label="Distribuidor">
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							class="checkbox checkbox-primary"
							name="es_distribuidor"
							bind:checked={esDistribuidor}
						/>
						<span>Es distribuidor</span>
					</label>
				</FormFieldWrapper>
				{#if esDistribuidor}
					<FormFieldWrapper id="porcentaje_compensacion" label="Comisión (%)">
						<input
							class="remove-arrow input"
							min="0"
							max="100"
							step="0.01"
							{...form.fields.porcentaje_compensacion.as('number', porcentajeCompensacion)}
							bind:value={porcentajeCompensacion}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="saldo_disponible" label="Saldo disponible">
						<input
							class="remove-arrow input"
							min="0"
							step="0.01"
							{...form.fields.saldo_disponible.as('number', 0)}
						/>
					</FormFieldWrapper>
				{/if}
				{#if rol === 'proveedor' || rol === 'ambos'}
					<FormFieldWrapper id="codigo" label="Código de proveedor">
						<input class="input" {...form.fields.codigo.as('text', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_nombre" label="Contacto de compras">
						<input class="input" {...form.fields.contacto_nombre.as('text', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_email" label="Email de compras">
						<input class="input" {...form.fields.contacto_email.as('email', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_telefono" label="Teléfono de compras">
						<input class="input" {...form.fields.contacto_telefono.as('text', '')} />
					</FormFieldWrapper>
					<FormFieldWrapper id="condiciones_pago" label="Condiciones de pago">
						<input class="input" {...form.fields.condiciones_pago.as('text', '')} />
					</FormFieldWrapper>
				{/if}
			</div>
		</fieldset>
		<FormDireccion {form} initialData={undefined} />
		<FormErrors {form} />
		<FormActions cancelHref="/contactos" pending={!!form.pending} submitText="Crear contacto" />
	</form>
</PageLayout>
