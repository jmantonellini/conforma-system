<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { FormFieldWrapper, PageLayout } from '$lib/components/ui';
	import {
		actualizarConfiguracionEmpresa,
		getConfiguracionEmpresa
	} from '$lib/remote/configuracion.remote';
	import { toast } from '$lib/stores/toast.svelte';

	let config = $derived(await getConfiguracionEmpresa());
	let logoInput: HTMLInputElement;

	async function subirLogo() {
		const file = logoInput?.files?.[0];
		if (!file) return;
		const body = new FormData();
		body.set('logo', file);
		const response = await fetch('/configuracion/empresa', { method: 'POST', body });
		if (!response.ok) return toast.error('No se pudo subir el logo');
		toast.success('Logo actualizado');
		await invalidateAll();
	}
</script>

<PageLayout>
	<div class="max-w-3xl">
		<h1 class="text-2xl font-bold">Datos de la empresa</h1>
		<p class="mt-1 text-sm text-base-content/60">Información utilizada en PDFs y documentos.</p>

		<form
			{...actualizarConfiguracionEmpresa.enhance(async (instance) => {
				if (await instance.submit()) toast.success('Datos actualizados');
			})}
			class="card mt-6 bg-base-100 shadow"
		>
			<div class="card-body">
				<div class="grid gap-4 md:grid-cols-2">
					<FormFieldWrapper id="razon_social" label="Razón social" required>
						<input
							class="input"
							{...actualizarConfiguracionEmpresa.fields.razon_social.as(
								'text',
								config.razon_social
							)}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="cuit" label="CUIT">
						<input
							class="input"
							{...actualizarConfiguracionEmpresa.fields.cuit.as('text', config.cuit || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="telefono" label="Teléfono">
						<input
							class="input"
							{...actualizarConfiguracionEmpresa.fields.telefono.as('text', config.telefono || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="email" label="Email">
						<input
							class="input"
							{...actualizarConfiguracionEmpresa.fields.email.as('email', config.email || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="direccion" label="Dirección" class="md:col-span-2">
						<input
							class="input"
							{...actualizarConfiguracionEmpresa.fields.direccion.as(
								'text',
								config.direccion || ''
							)}
						/>
					</FormFieldWrapper>
				</div>
				<div class="flex justify-end">
					<button class="btn btn-primary" disabled={!!actualizarConfiguracionEmpresa.pending}
						>Guardar datos</button
					>
				</div>
			</div>
		</form>

		<div class="card mt-4 bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Logo</h2>
				{#if config.logo_url}<img
						src={config.logo_url}
						alt="Logo de la empresa"
						class="max-h-24 max-w-xs object-contain"
					/>{/if}
				<input
					bind:this={logoInput}
					type="file"
					accept="image/png,image/jpeg,image/webp"
					class="file-input"
					onchange={subirLogo}
				/>
			</div>
		</div>
	</div>
</PageLayout>
