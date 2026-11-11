<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getEmpleados } from '$lib/remote/empleados.remote';
	import {
		getInsumos,
		getMovimientosInsumos,
		registrarMovimientoInsumo
	} from '$lib/remote/insumos.remote';
	import { getOrdenesFabricacion } from '$lib/remote/fabricacion-consultas.remote';
	import { FormFieldWrapper, PageLayout } from '$lib/components/ui';
	import InsumosMovimientosTabla from '$lib/components/insumos/InsumosMovimientosTabla.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { can } from '$lib/utils/permissions';

	const insumos = $derived(await getInsumos({ limit: 100 }));
	const empleados = $derived(await getEmpleados());
	const puedeVincularOrden = can(page.data.user, page.data.permisos, 'fabricacion', 'view');
	const ordenes = $derived(
		puedeVincularOrden ? await getOrdenesFabricacion({ limit: 100 }) : { ordenes: [] }
	);
	const puedeVerMovimientos = can(page.data.user, page.data.permisos, 'insumos', 'view');
	const puedeEditarInsumos = can(page.data.user, page.data.permisos, 'insumos', 'edit');
	const movimientos = $derived(
		puedeVerMovimientos ? await getMovimientosInsumos({ limit: 100 }) : []
	);
	let tipo = $state<'ingreso' | 'consumo'>('consumo');
	let insumoId = $state('');
	let cantidad = $state('');
	let empleadoId = $state('');
	let ordenId = $state(page.url.searchParams.get('orden') ?? '');
	let motivo = $state('');
	let guardando = $state(false);

	const formatearCantidad = (valor: number) =>
		new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(valor);

	async function guardarMovimiento(event: SubmitEvent) {
		event.preventDefault();
		if (guardando) return;
		guardando = true;
		try {
			await registrarMovimientoInsumo({
				insumo_id: Number(insumoId),
				tipo,
				cantidad: Number(cantidad),
				empleado_id: Number(empleadoId),
				orden_fabricacion_id: tipo === 'consumo' && ordenId ? Number(ordenId) : undefined,
				motivo: motivo.trim()
			});
			insumoId = '';
			cantidad = '';
			motivo = '';
			toast.success(tipo === 'ingreso' ? 'Ingreso registrado' : 'Consumo registrado');
			await Promise.all([
				getInsumos({ limit: 100 }).refresh(),
				getMovimientosInsumos({ limit: 100 }).refresh()
			]);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'No se pudo registrar el movimiento');
		} finally {
			guardando = false;
		}
	}
</script>

<PageLayout>
	<div class="mb-5 flex items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold">Movimientos de insumos</h1>
		</div>
		<a class="btn btn-ghost btn-sm" href={resolve('/insumos')}>Volver</a>
	</div>

	<section class="border-b border-base-300 pb-6">
		<h2 class="mb-4 font-semibold">Registrar movimiento</h2>
		{#if puedeEditarInsumos}
			<form class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onsubmit={guardarMovimiento}>
				<FormFieldWrapper label="Tipo de movimiento" id="tipo_movimiento" required>
					<select class="select" bind:value={tipo}>
						<option value="consumo">Consumo</option>
						<option value="ingreso">Ingreso al stock</option>
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper label="Insumo" id="insumo_id" required>
					<select class="select" bind:value={insumoId} required>
						<option value="">Seleccionar...</option>
						{#each insumos.data as insumo (insumo.id)}
							<option value={String(insumo.id)}>
								{insumo.codigo} · {insumo.nombre} · {formatearCantidad(insumo.stock)}
								{insumo.unidad}
							</option>
						{/each}
					</select>
				</FormFieldWrapper>
				<FormFieldWrapper label="Cantidad" id="cantidad" required>
					<input
						class="input"
						type="number"
						min="0.000001"
						step="any"
						bind:value={cantidad}
						required
					/>
				</FormFieldWrapper>
				<FormFieldWrapper label="Empleado responsable" id="empleado_id" required>
					<select class="select" bind:value={empleadoId} required>
						<option value="">Seleccionar...</option>
						{#each empleados as empleado (empleado.id)}
							<option value={String(empleado.id)}>{empleado.nombre} {empleado.apellido}</option>
						{/each}
					</select>
				</FormFieldWrapper>
				{#if tipo === 'consumo' && puedeVincularOrden}
					<FormFieldWrapper label="Orden de fabricación" id="orden_id">
						<select class="select" bind:value={ordenId}>
							<option value="">Sin orden asociada</option>
							{#each ordenes.ordenes as orden (orden.id)}
								<option value={String(orden.id)}>OF-{orden.id} · {orden.nombre_trabajo}</option>
							{/each}
						</select>
					</FormFieldWrapper>
				{/if}
				<FormFieldWrapper label="Para qué / motivo" id="motivo" required>
					<input
						class="input"
						bind:value={motivo}
						maxlength="500"
						placeholder="Ej.: reparación de bomba, OF-123..."
						required
					/>
				</FormFieldWrapper>
				<div class="flex items-end">
					<button
						class="btn btn-primary"
						type="submit"
						disabled={guardando || !insumoId || !empleadoId}
					>
						{guardando
							? 'Guardando...'
							: tipo === 'ingreso'
								? 'Registrar ingreso'
								: 'Registrar consumo'}
					</button>
				</div>
			</form>
		{:else}
			<p class="text-sm text-base-content/60">
				No tenés permiso para registrar movimientos de insumos.
			</p>
		{/if}
	</section>

	{#if puedeVerMovimientos}
		<section class="pt-6">
			<h2 class="mb-4 font-semibold">Últimos movimientos</h2>
			<InsumosMovimientosTabla {movimientos} emptyMessage="Todavía no hay movimientos." />
		</section>
	{/if}
</PageLayout>
