<!-- src/routes/(app)/cotizaciones/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Table, SearchBar, Pagination, Can, Modal } from '$lib/components/ui';
	import PageLayout from '$lib/components/ui/PageLayout.svelte';
	import { Delete, Eye } from '$lib/components/ui/icons';
	import type { PageProps } from './$types';
	import { debounce } from '$lib/utils/debounce';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { formatearFecha } from '$lib/utils/fechas';
	import { eliminarCotizacion } from '$lib/remote/cotizaciones.remote';
	import { toast } from '$lib/stores/toast.svelte';

	let { data }: PageProps = $props();

	let search = $derived(data.search);
	let estadoFilter = $derived(data.estadoFilter);
	let currentPage = $derived(data.currentPage);
	let showModal = $state(false);
	let deleteCotizacionId = $state(0);

	const CANALES: Record<string, string> = {
		whatsapp: 'WhatsApp',
		llamada: 'Llamada',
		email: 'Email',
		presencial: 'Presencial',
		otro: 'Otro'
	};

	function handleSearchChange() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (estadoFilter) params.set('estado', estadoFilter);
		if (currentPage > 1) params.set('page', currentPage.toString());
		goto(resolve(`/cotizaciones?${params.toString()}`));
	}

	function closeModal() {
		showModal = false;
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-wrap gap-4">
			<div class="w-full sm:w-80">
				<SearchBar autofocus bind:search oninput={() => debounce(handleSearchChange)} />
			</div>
			<select bind:value={estadoFilter} class="select w-48" onchange={handleSearchChange}>
				<option value="">Todos los estados</option>
				{#each data.estados as est (est.id)}
					<option value={String(est.id)}>{est.nombre}</option>
				{/each}
			</select>
		</div>
		<Can modulo="cotizaciones" accion="create">
			<a class="btn btn-primary" href={resolve('/cotizaciones/crear')}>+ Nueva Cotización</a>
		</Can>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			{#snippet header()}
				<th>N° Cotización</th>
				<th>Cliente / Contacto</th>
				<th>Canal</th>
				<th>Fecha</th>
				<th class="text-right">Total</th>
				<th>Estado</th>
				<th>Asignada a</th>
				<th class="text-center">Acciones</th>
			{/snippet}

			{#snippet row(cot)}
				<td class="font-mono text-sm">{cot.numero_cotizacion}</td>
				<td class="font-medium">{cot.cliente_nombre || '-'}</td>
				<td>
					<span class="badge badge-ghost badge-sm">{CANALES[cot.canal] || cot.canal}</span>
				</td>
				<td>{formatearFecha(new Date(cot.created_at))}</td>
				<td class="text-right font-medium">
					{cot.precio_total != null ? '$' + cot.precio_total.toLocaleString('es-AR') : '-'}
				</td>
				<td>
					<span class="badge badge-dash capitalize badge-{cot.estado_color}">
						{cot.estado_nombre}
					</span>
				</td>
				<td class="text-sm">
					{cot.asignado_nombre
						? `${cot.asignado_nombre} ${cot.asignado_apellido ?? ''}`.trim()
						: '-'}
				</td>
				<td class="text-center">
					<div class="flex justify-center gap-1">
						<a class="btn btn-circle btn-ghost btn-sm" href={resolve(`/cotizaciones/${cot.id}`)}>
							<Eye />
						</a>
						<Can modulo="cotizaciones" accion="delete">
							<button
								class="btn btn-circle btn-ghost text-error btn-sm"
								title="Eliminar"
								onclick={() => {
									deleteCotizacionId = cot.id;
									showModal = true;
								}}
							>
								<Delete />
							</button>
						</Can>
					</div>
				</td>
			{/snippet}

			<Table
				data={data.cotizaciones}
				loading={false}
				emptyMessage="No hay cotizaciones registradas"
				{header}
				{row}
			/>

			{#if data.totalPages > 1}
				<div class="mt-6 flex justify-center">
					<Pagination
						currentPage={data.currentPage}
						totalPages={data.totalPages}
						onPageChange={(page) => {
							currentPage = page;
							handleSearchChange();
						}}
					/>
				</div>
			{/if}
		</div>
	</div>
</PageLayout>

<Modal bind:open={showModal} title="Elimnar Cotización" onClose={closeModal}>
	<div class="py-4">
		<p>¿Seguro que quieres eliminar esta cotización?</p>
	</div>
	{#snippet actions()}
		<button class="btn" onclick={closeModal}>Cancelar</button>
		<button
			class="btn btn-error"
			onclick={async () => {
				try {
					await eliminarCotizacion(deleteCotizacionId);
					closeModal();
					toast.success('Orden eliminada');
				} catch (error) {
					console.log(error);
					toast.error('Error al eliminar');
				}
			}}>Eliminar</button
		>
	{/snippet}
</Modal>
