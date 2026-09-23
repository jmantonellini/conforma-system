<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Can, FormActions, FormErrors, FormFieldWrapper, PageLayout } from '$lib/components/ui';
	import FormDireccion from '$lib/components/ui/FormDireccion.svelte';
	import { actualizarContacto, eliminarContacto } from '$lib/remote/contactos.remote';
	import { toast } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const form = actualizarContacto;
	const contacto = $derived(data.contacto);
	let distribuidorEditado = $state<boolean | undefined>();
	let rolEditado = $state<string | undefined>();
	const esDistribuidor = $derived(distribuidorEditado ?? contacto.es_distribuidor ?? false);
	const rolBase = $derived(
		contacto.proveedor
			? contacto.es_cliente
				? 'ambos'
				: 'proveedor'
			: contacto.es_cliente
				? 'cliente'
				: 'ninguno'
	);
	const rol = $derived(rolEditado ?? rolBase);
	let editando = $state(false);

	async function eliminar() {
		if (!confirm(`¿Eliminar el contacto "${contacto.razon_social}"?`)) return;
		try {
			await eliminarContacto(contacto.id);
			toast.success('Contacto eliminado');
			goto(resolve('/contactos'));
		} catch {
			toast.error('No se pudo eliminar el contacto');
		}
	}
</script>

<PageLayout>
	<form
		{...form.enhance(async (instance) => {
			try {
				if (await instance.submit()) {
					toast.success('Contacto actualizado');
					editando = false;
				}
			} catch {
				toast.error('No se pudo actualizar el contacto');
			}
		})}
		class="space-y-6"
	>
		<div class="flex items-center justify-between">
			<a href={resolve('/contactos')} class="btn btn-ghost btn-sm">← Volver</a>
			<div class="flex gap-2">
				<Can modulo="contactos" accion="edit">
					{#if editando}
						<FormActions
							cancelHref="/contactos"
							pending={!!form.pending}
							submitText="Guardar cambios"
						/>
					{:else}
						<button type="button" class="btn btn-primary btn-sm" onclick={() => (editando = true)}
							>Editar contacto</button
						>
					{/if}
				</Can>
				<Can modulo="contactos" accion="delete">
					<button type="button" class="btn btn-outline btn-error btn-sm" onclick={eliminar}
						>Eliminar contacto</button
					>
				</Can>
			</div>
		</div>
		<fieldset class="fieldset rounded-box border border-base-300 bg-base-200 p-4">
			<legend class="fieldset-legend">Datos del contacto</legend>
			<div class="grid gap-4 md:grid-cols-3">
				<input type="hidden" name="id" value={contacto.id} />
				<FormFieldWrapper id="razon_social" label="Razón social" required>
					<input
						class="input"
						disabled={!editando}
						{...form.fields.razon_social.as('text', contacto.razon_social)}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="nombre" label="Nombre">
					<input
						class="input"
						disabled={!editando}
						{...form.fields.nombre.as('text', contacto.nombre || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="apellido" label="Apellido">
					<input
						class="input"
						disabled={!editando}
						{...form.fields.apellido.as('text', contacto.apellido || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="cuit" label="CUIT">
					<input
						class="input"
						disabled={!editando}
						{...form.fields.cuit.as('text', contacto.cuit || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="email" label="Email">
					<input
						class="input"
						disabled={!editando}
						{...form.fields.email.as('email', contacto.email || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="telefono" label="Teléfono">
					<input
						class="input"
						disabled={!editando}
						{...form.fields.telefono.as('text', contacto.telefono || '')}
					/>
				</FormFieldWrapper>
				<FormFieldWrapper id="rol" label="Rol comercial">
					<select
						class="select"
						disabled={!editando}
						{...form.fields.rol.as('select', rol)}
						onchange={(event) => (rolEditado = event.currentTarget.value)}
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
							disabled={!editando}
							checked={esDistribuidor}
							onchange={(event) => (distribuidorEditado = event.currentTarget.checked)}
						/>
						<span>Es distribuidor</span>
					</label>
				</FormFieldWrapper>
				{#if esDistribuidor}
					<FormFieldWrapper id="porcentaje_compensacion" label="Comisión (%)">
						<input
							class="remove-arrow input"
							disabled={!editando}
							min="0"
							max="100"
							step="0.01"
							{...form.fields.porcentaje_compensacion.as(
								'number',
								contacto.porcentaje_compensacion || 0
							)}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="saldo_disponible" label="Saldo disponible">
						<input
							class="remove-arrow input"
							disabled={!editando}
							min="0"
							step="0.01"
							{...form.fields.saldo_disponible.as('number', contacto.saldo_disponible || 0)}
						/>
					</FormFieldWrapper>
				{/if}
				{#if rol === 'proveedor' || rol === 'ambos'}
					<FormFieldWrapper id="codigo" label="Código de proveedor">
						<input
							class="input"
							disabled={!editando}
							{...form.fields.codigo.as('text', contacto.proveedor?.codigo || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_nombre" label="Contacto de compras">
						<input
							class="input"
							disabled={!editando}
							{...form.fields.contacto_nombre.as('text', contacto.proveedor?.contacto_nombre || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_email" label="Email de compras">
						<input
							class="input"
							disabled={!editando}
							{...form.fields.contacto_email.as('email', contacto.proveedor?.contacto_email || '')}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="contacto_telefono" label="Teléfono de compras">
						<input
							class="input"
							disabled={!editando}
							{...form.fields.contacto_telefono.as(
								'text',
								contacto.proveedor?.contacto_telefono || ''
							)}
						/>
					</FormFieldWrapper>
					<FormFieldWrapper id="condiciones_pago" label="Condiciones de pago">
						<input
							class="input"
							disabled={!editando}
							{...form.fields.condiciones_pago.as(
								'text',
								contacto.proveedor?.condiciones_pago || ''
							)}
						/>
					</FormFieldWrapper>
				{/if}
			</div>
		</fieldset>

		<FormDireccion {form} initialData={contacto} disabled={!editando} />
		<FormErrors {form} />
	</form>

	<section class="card mt-6 bg-base-100 shadow">
		<div class="card-body">
			<h2 class="card-title">Historial de pedidos</h2>
			{#if data.pedidos.length}
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead
							><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th class="text-right">Total</th></tr
							></thead
						>
						<tbody>
							{#each data.pedidos as pedido (pedido.id)}
								<tr>
									<td
										><a class="link link-primary" href={resolve(`/pedidos/${pedido.id}`)}
											>{pedido.numero_pedido}</a
										></td
									>
									<td>{pedido.fecha_pedido?.toLocaleDateString('es-AR') || '-'}</td>
									<td><span class="badge badge-sm">{pedido.estado || 'Sin estado'}</span></td>
									<td class="text-right"
										>${Number(pedido.precio_total ?? 0).toLocaleString('es-AR', {
											minimumFractionDigits: 2
										})}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-sm text-base-content/70">Todavía no hay pedidos para este contacto.</p>
			{/if}
		</div>
	</section>
</PageLayout>
