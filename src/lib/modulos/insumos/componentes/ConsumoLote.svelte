<script lang="ts">
	import { untrack } from 'svelte';
	import { FormFieldWrapper, SearchSelect } from '$lib/ui';
	import { toast } from '$lib/ui/toast.svelte';
	import { mensajeError } from '$lib/utils/errores';
	import { registrarLoteConsumo } from '$lib/modulos/insumos/insumos.remote';

	type InsumoOpcion = {
		id: number;
		codigo: string;
		nombre: string;
		unidad: string;
		stock: number;
		controla_stock?: boolean;
	};
	type Fila = { clave: number; insumo_id: string; cantidad: string };

	let {
		insumos,
		empleados,
		ordenes = [],
		ordenId = null,
		filasIniciales = [],
		empleadoInicial = '',
		onRegistrado
	}: {
		insumos: InsumoOpcion[];
		empleados: { id: number; nombre: string; apellido: string | null }[];
		ordenes?: { id: number; nombre_trabajo: string }[];
		ordenId?: number | null;
		filasIniciales?: { insumo_id: number; cantidad: number }[];
		empleadoInicial?: string;
		onRegistrado?: () => void;
	} = $props();

	let siguiente = 0;
	const filaVacia = (): Fila => ({ clave: siguiente++, insumo_id: '', cantidad: '' });
	const desdeIniciales = () =>
		filasIniciales.map((fila) => ({
			clave: siguiente++,
			insumo_id: String(fila.insumo_id),
			cantidad: String(Number(fila.cantidad.toFixed(4)))
		}));

	let filas = $state<Fila[]>(
		untrack(() => (filasIniciales.length ? desdeIniciales() : [filaVacia()]))
	);
	let empleadoId = $state(untrack(() => empleadoInicial));
	const opcionesEmpleados = $derived(
		empleados.map((empleado) => ({
			value: String(empleado.id),
			label: [empleado.nombre, empleado.apellido].filter(Boolean).join(' ')
		}))
	);
	let ordenSeleccionada = $state('');
	let motivo = $state('');
	let guardando = $state(false);

	const insumoPorId = $derived(new Map(insumos.map((insumo) => [String(insumo.id), insumo])));
	const orden = $derived(ordenId ?? (Number(ordenSeleccionada) || null));
	const validas = $derived(
		filas.filter((fila) => fila.insumo_id && Number(fila.cantidad.replace(',', '.')) > 0)
	);
	const faltaMotivo = $derived(!orden && !motivo.trim());

	const formatearCantidad = (valor: number) =>
		new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(valor);

	function opciones(fila: Fila) {
		const usados = new Set(filas.filter((otra) => otra !== fila).map((otra) => otra.insumo_id));
		return insumos
			.filter((insumo) => !usados.has(String(insumo.id)))
			.map((insumo) => ({
				value: String(insumo.id),
				label: `${insumo.codigo} - ${insumo.nombre}`
			}));
	}

	function excede(fila: Fila) {
		const insumo = insumoPorId.get(fila.insumo_id);
		if (!insumo || insumo.controla_stock === false) return false;
		return Number(fila.cantidad.replace(',', '.')) > insumo.stock;
	}

	function quitar(fila: Fila) {
		filas = filas.length > 1 ? filas.filter((otra) => otra !== fila) : [filaVacia()];
	}

	async function registrar(event: SubmitEvent) {
		event.preventDefault();
		if (guardando || !validas.length || !empleadoId || faltaMotivo) return;
		guardando = true;
		try {
			const resultado = await registrarLoteConsumo({
				empleado_id: Number(empleadoId),
				orden_fabricacion_id: orden ?? undefined,
				motivo: motivo.trim() || undefined,
				items: validas.map((fila) => ({
					insumo_id: Number(fila.insumo_id),
					cantidad: Number(fila.cantidad.replace(',', '.'))
				}))
			});
			toast.success(`Consumo registrado: ${resultado.cantidad} insumo(s)`);
			filas = [filaVacia()];
			motivo = '';
			onRegistrado?.();
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo registrar el consumo'));
		} finally {
			guardando = false;
		}
	}
</script>

<form class="flex flex-col gap-4" onsubmit={registrar}>
	<div class="grid gap-4 md:grid-cols-3">
		<SearchSelect
			label="Empleado responsable"
			id="lote-empleado"
			placeholder="Buscar empleado..."
			required
			disabled={guardando}
			field={{ value: () => empleadoId, set: (valor: string) => (empleadoId = valor) }}
			options={opcionesEmpleados}
			onChange={(valor: string) => (empleadoId = valor)}
		/>
		{#if ordenId === null && ordenes.length}
			<FormFieldWrapper label="Orden de fabricación" id="lote-orden">
				<select id="lote-orden" class="select w-full" bind:value={ordenSeleccionada}>
					<option value="">Sin orden asociada</option>
					{#each ordenes as opcion (opcion.id)}
						<option value={String(opcion.id)}>OF-{opcion.id} · {opcion.nombre_trabajo}</option>
					{/each}
				</select>
			</FormFieldWrapper>
		{/if}
		<FormFieldWrapper label="Para qué / motivo" id="lote-motivo" required={!orden}>
			<input
				id="lote-motivo"
				class="input w-full"
				maxlength="500"
				placeholder={orden ? `Preparación de OF-${orden}` : 'Ej.: reparación de bomba'}
				bind:value={motivo}
			/>
		</FormFieldWrapper>
	</div>

	<div class="rounded-box border border-base-300">
		<table class="table table-sm">
			<thead>
				<tr>
					<th>Insumo</th>
					<th class="text-right">Disponible</th>
					<th class="w-40 text-right">Cantidad</th>
					<th class="w-10"></th>
				</tr>
			</thead>
			<tbody>
				{#each filas as fila (fila.clave)}
					{@const insumo = insumoPorId.get(fila.insumo_id)}
					<tr class="relative focus-within:z-50">
						<td class="min-w-48 sm:min-w-72">
							<SearchSelect
								compacto
								label=""
								id={`lote-insumo-${fila.clave}`}
								placeholder="Buscar insumo..."
								disabled={guardando}
								field={{
									value: () => fila.insumo_id,
									set: (valor: string) => (fila.insumo_id = valor)
								}}
								options={opciones(fila)}
								onChange={(valor: string) => (fila.insumo_id = valor)}
							/>
						</td>
						<td class="text-right whitespace-nowrap text-base-content/70 tabular-nums">
							{#if !insumo}
								-
							{:else if insumo.controla_stock === false}
								<span class="text-xs">Sin stock (horas)</span>
							{:else}
								{formatearCantidad(insumo.stock)} {insumo.unidad}
							{/if}
						</td>
						<td>
							<div class="flex items-center justify-end gap-1">
								<input
									class={['input w-24 text-right input-sm', excede(fila) && 'input-error']}
									inputmode="decimal"
									aria-label="Cantidad"
									disabled={guardando}
									bind:value={fila.cantidad}
								/>
								{#if insumo}<span class="text-xs text-base-content/60">{insumo.unidad}</span>{/if}
							</div>
						</td>
						<td>
							<button
								type="button"
								class="btn btn-square btn-ghost btn-xs"
								aria-label="Quitar insumo"
								disabled={guardando}
								onclick={() => quitar(fila)}>✕</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-2">
		<button
			type="button"
			class="btn btn-outline btn-sm"
			disabled={guardando}
			onclick={() => (filas = [...filas, filaVacia()])}
		>
			+ Agregar insumo
		</button>
		<button
			class="btn btn-primary"
			type="submit"
			disabled={guardando || !validas.length || !empleadoId || faltaMotivo}
		>
			{guardando
				? 'Registrando...'
				: `Registrar consumo${validas.length ? ` · ${validas.length} insumo(s)` : ''}`}
		</button>
	</div>
</form>
