<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getEmpleadosOpciones } from '$lib/modulos/configuracion/empleados.remote';
	import {
		getInsumos,
		getMovimientosInsumos,
		registrarMovimientoInsumo
	} from '$lib/modulos/insumos/insumos.remote';
	import { getOrdenesFabricacion } from '$lib/modulos/fabricacion/fabricacion-consultas.remote';
	import { FormFieldWrapper, PageLayout, SearchSelect } from '$lib/ui';
	import ConsumoLote from '$lib/modulos/insumos/componentes/ConsumoLote.svelte';
	import InsumosMovimientosTabla from '$lib/modulos/insumos/componentes/InsumosMovimientosTabla.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { can } from '$lib/utils/permissions';

	const insumos = $derived(await getInsumos({ limit: 100 }));
	const empleados = $derived(await getEmpleadosOpciones());
	const puedeVincularOrden = can(page.data.user, page.data.permisos, 'fabricacion', 'view');
	const ordenes = $derived(
		puedeVincularOrden ? await getOrdenesFabricacion({ limit: 100 }) : { ordenes: [] }
	);
	const puedeVerMovimientos = can(page.data.user, page.data.permisos, 'insumos', 'view');
	const puedeEditarInsumos = can(page.data.user, page.data.permisos, 'insumos', 'edit');
	const movimientos = $derived(
		puedeVerMovimientos ? await getMovimientosInsumos({ limit: 100 }) : []
	);

	let vista = $state<'consumo' | 'ingreso'>('consumo');
	let insumoId = $state('');
	let cantidad = $state('');
	let empleadoId = $state('');
	let motivo = $state('');
	let guardando = $state(false);

	async function refrescar() {
		await Promise.all([
			getInsumos({ limit: 100 }).refresh(),
			getMovimientosInsumos({ limit: 100 }).refresh()
		]);
	}

	async function registrarIngreso(event: SubmitEvent) {
		event.preventDefault();
		if (guardando) return;
		guardando = true;
		try {
			await registrarMovimientoInsumo({
				insumo_id: Number(insumoId),
				tipo: 'ingreso',
				cantidad: Number(cantidad.replace(',', '.')),
				empleado_id: Number(empleadoId),
				motivo: motivo.trim()
			});
			insumoId = '';
			cantidad = '';
			motivo = '';
			toast.success('Ingreso registrado');
			await refrescar();
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo registrar el ingreso'));
		} finally {
			guardando = false;
		}
	}
</script>

<PageLayout>
	<div class="mb-5 flex items-center justify-between gap-3">
		<h1 class="text-xl font-semibold">Movimientos de insumos</h1>
		<a class="btn btn-ghost btn-sm" href={resolve('/insumos')}>Volver</a>
	</div>

	<section class="border-b border-base-300 pb-6">
		{#if puedeEditarInsumos}
			<div role="tablist" class="tabs-box mb-4 tabs w-fit">
				<button
					role="tab"
					class={['tab', vista === 'consumo' && 'tab-active']}
					onclick={() => (vista = 'consumo')}>Consumo</button
				>
				<button
					role="tab"
					class={['tab', vista === 'ingreso' && 'tab-active']}
					onclick={() => (vista = 'ingreso')}>Ingreso al stock</button
				>
			</div>

			{#if vista === 'consumo'}
				<ConsumoLote
					insumos={insumos.data}
					{empleados}
					ordenes={ordenes.ordenes}
					ordenId={Number(page.url.searchParams.get('orden')) || null}
					onRegistrado={refrescar}
				/>
			{:else}
				<form class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onsubmit={registrarIngreso}>
					<SearchSelect
						label="Insumo"
						id="ingreso-insumo"
						placeholder="Buscar insumo..."
						field={{ value: () => insumoId, set: (valor: string) => (insumoId = valor) }}
						options={insumos.data
							.filter((insumo) => insumo.controla_stock)
							.map((insumo) => ({
								value: String(insumo.id),
								label: `${insumo.codigo} - ${insumo.nombre}`
							}))}
						onChange={(valor: string) => (insumoId = valor)}
					/>
					<FormFieldWrapper label="Cantidad" id="ingreso-cantidad" required>
						<input
							id="ingreso-cantidad"
							class="input w-full"
							inputmode="decimal"
							bind:value={cantidad}
							required
						/>
					</FormFieldWrapper>
					<FormFieldWrapper label="Recibido por" id="ingreso-empleado" required>
						<select id="ingreso-empleado" class="select w-full" bind:value={empleadoId} required>
							<option value="">Seleccionar...</option>
							{#each empleados as empleado (empleado.id)}
								<option value={String(empleado.id)}>{empleado.nombre} {empleado.apellido}</option>
							{/each}
						</select>
					</FormFieldWrapper>
					<FormFieldWrapper label="Origen / remito" id="ingreso-motivo" required>
						<input
							id="ingreso-motivo"
							class="input w-full"
							bind:value={motivo}
							maxlength="500"
							placeholder="Ej.: compra a proveedor, remito 0001-123"
							required
						/>
					</FormFieldWrapper>
					<div class="flex justify-end md:col-span-2 xl:col-span-4">
						<button
							class="btn btn-primary"
							type="submit"
							disabled={guardando ||
								!insumoId ||
								!empleadoId ||
								!Number(cantidad.replace(',', '.'))}
						>
							{guardando ? 'Guardando...' : 'Registrar ingreso'}
						</button>
					</div>
				</form>
			{/if}
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
