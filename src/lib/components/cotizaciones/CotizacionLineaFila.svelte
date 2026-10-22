<script lang="ts">
	import { SearchSelect } from '$lib/components/ui';
	import type { InsumoOpcion, LineaEdicion, ProductoOpcion } from '$lib/types/cotizacion-editor';
	import { formatearDosDecimales, parsearNumeroDecimal, redondearPrecio } from '$lib/utils/precios';
	import { describeMaterialReceta, esMaterialSubproducto } from '$lib/utils/receta-producto';

	type Props = {
		linea: LineaEdicion;
		bloqueada: boolean;
		cantidadLineas: number;
		productos: ProductoOpcion[];
		insumos: InsumoOpcion[];
		onEliminar: (lineaId: number) => void;
		onSeleccionarProducto: (lineaId: number, productoId: string) => void;
		onSeleccionarInsumo: (lineaId: number, insumoId: string) => void;
		onActualizarCantidad: (lineaId: number, cantidad: number) => void;
		onActualizarDescripcion: (lineaId: number, descripcion: string) => void;
		onActualizarPrecio: (lineaId: number, precio: string) => void;
		onCambiarVisibilidad: (lineaId: number, visible: boolean) => void;
		onActualizarCostoInterno: (lineaId: number, costo: number) => void;
		onAgregarInsumoAsociado: (lineaId: number, insumoId: number, cantidad: number) => void;
		onQuitarInsumoAsociado: (lineaId: number, indice: number) => void;
	};

	let {
		linea,
		bloqueada,
		cantidadLineas,
		productos,
		insumos,
		onEliminar,
		onSeleccionarProducto,
		onSeleccionarInsumo,
		onActualizarCantidad,
		onActualizarDescripcion,
		onActualizarPrecio,
		onCambiarVisibilidad,
		onActualizarCostoInterno,
		onAgregarInsumoAsociado,
		onQuitarInsumoAsociado
	}: Props = $props();
	let costoBorrador = $state<string | null>(null);
	let precioBorrador = $state<string | null>(null);
	let insumoSeleccionado = $state('');
	let cantidadInsumo = $state(1);

	function agregarMaterialAsociado() {
		const insumoId = Number(insumoSeleccionado);
		if (!insumoId || !Number.isFinite(cantidadInsumo) || cantidadInsumo <= 0) return;
		onAgregarInsumoAsociado(linea.idx, insumoId, cantidadInsumo);
		insumoSeleccionado = '';
		cantidadInsumo = 1;
	}
</script>

<tr
	class={[
		'relative z-0 border-x-2 border-y-2 focus-within:z-50 focus-within:opacity-100',
		{ 'border-success': linea.visible_cliente, 'border-warning': !linea.visible_cliente }
	]}
>
	<td class="relative min-w-72 focus-within:z-50">
		{#if linea.tipo === 'producto'}
			<SearchSelect
				label=""
				id={`producto-${linea.idx}`}
				placeholder="Buscar producto..."
				disabled={bloqueada}
				field={{
					value: () => linea.producto_id
				}}
				options={productos.map((producto) => ({
					value: String(producto.id),
					label: producto.nombre
				}))}
				onChange={(value: string) => onSeleccionarProducto(linea.idx, value)}
			/>
		{:else if linea.nuevo_insumo}
			<div class="flex min-h-8 flex-col justify-center">
				<span class="font-medium">{linea.nuevo_insumo.nombre}</span>
				<span class="text-xs text-base-content/60">Nuevo insumo · {linea.nuevo_insumo.unidad}</span>
			</div>
		{:else if linea.tipo === 'insumo'}
			<SearchSelect
				label=""
				id={`insumo-${linea.idx}`}
				placeholder="Buscar insumo interno..."
				disabled={bloqueada}
				field={{
					value: () => String(linea.insumo_id ?? '')
				}}
				options={insumos.map((insumo) => ({
					value: String(insumo.id),
					label: `${insumo.codigo} - ${insumo.nombre}`
				}))}
				onChange={(value: string) => onSeleccionarInsumo(linea.idx, value)}
			/>
		{:else}
			<input
				class="input w-full input-sm"
				required
				disabled={bloqueada}
				value={linea.descripcion}
				placeholder={linea.visible_cliente
					? 'Trabajo o concepto para el cliente'
					: 'Concepto interno'}
				oninput={(event) => onActualizarDescripcion(linea.idx, event.currentTarget.value)}
			/>
		{/if}
	</td>
	<td>
		<div class="flex items-center gap-1">
			<input
				class="remove-arrow input w-20 text-right input-sm"
				type="number"
				min="1"
				disabled={bloqueada}
				value={linea.cantidad}
				aria-label="Cantidad"
				oninput={(event) => onActualizarCantidad(linea.idx, Number(event.currentTarget.value) || 1)}
			/>
			{#if linea.unidad}<span class="text-xs text-base-content/60">{linea.unidad}</span>{/if}
		</div>
	</td>
	<td class="text-right">
		{#if !linea.visible_cliente}
			<input
				class="remove-arrow input w-32 text-right input-sm"
				type="text"
				inputmode="decimal"
				disabled={bloqueada}
				value={costoBorrador ?? formatearDosDecimales(linea.costo_materiales)}
				aria-label="Costo unitario interno"
				oninput={(event) => {
					costoBorrador = event.currentTarget.value;
					const costo = parsearNumeroDecimal(costoBorrador);
					if (costo !== null)
						onActualizarCostoInterno(linea.idx, Math.max(redondearPrecio(costo), 0));
				}}
				onblur={() => (costoBorrador = null)}
			/>
		{:else}
			<input
				class="remove-arrow input w-32 text-right input-sm"
				type="text"
				inputmode="decimal"
				disabled={bloqueada}
				value={precioBorrador ?? formatearDosDecimales(linea.precio_lista_unitario)}
				aria-label="Precio unitario"
				oninput={(event) => {
					precioBorrador = event.currentTarget.value;
					onActualizarPrecio(linea.idx, precioBorrador);
				}}
				onblur={() => (precioBorrador = null)}
			/>
		{/if}
	</td>
	<td class="text-right font-semibold">
		${formatearDosDecimales(
			(linea.visible_cliente ? linea.precio_unitario : linea.costo_materiales) * linea.cantidad
		)}
	</td>
	<td>
		<input
			class="toggle toggle-success toggle-xs"
			type="checkbox"
			checked={linea.visible_cliente}
			disabled={bloqueada}
			aria-label={linea.visible_cliente ? 'Visible para el cliente' : 'Solo interno'}
			onchange={(event) => onCambiarVisibilidad(linea.idx, event.currentTarget.checked)}
		/>
	</td>
	<td>
		<button
			type="button"
			class="btn btn-square btn-ghost btn-xs"
			disabled={bloqueada || cantidadLineas === 1}
			title="Quitar línea"
			onclick={() => onEliminar(linea.idx)}>✕</button
		>
	</td>
</tr>

{#if linea.tipo === 'concepto'}
	<tr class="relative z-0 border-x-2 border-b-2 border-base-300/80 focus-within:z-50">
		<td colspan="6" class="p-0">
			<details class="collapse-arrow collapse w-full rounded-none bg-base-200/40">
				<summary class="collapse-title w-full px-3 py-2 text-xs font-medium text-base-content/80">
					{linea.insumos_snapshot.length
						? `Composición interna (${linea.insumos_snapshot.length})`
						: 'Agregar composición interna (opcional)'}
				</summary>
				<div class="collapse-content flex flex-col gap-3 px-3 pb-3">
					<div class="flex flex-wrap items-end gap-2">
						<div class="min-w-56 flex-1">
							<SearchSelect
								label=""
								id={`composicion-${linea.idx}`}
								placeholder="Buscar insumo..."
								disabled={bloqueada}
								field={{
									value: () => insumoSeleccionado,
									set: (value: string) => (insumoSeleccionado = value)
								}}
								options={insumos
									.map((insumo) => ({
										value: String(insumo.id),
										label: `${insumo.codigo} - ${insumo.nombre}`
									}))
									.filter(
										(option) =>
											!linea.insumos_snapshot.some(
												(material) => String(material.insumo_id) === option.value
											)
									)}
								onChange={(value: string) => (insumoSeleccionado = value)}
							/>
						</div>
						<label class="flex items-center gap-2 text-xs">
							Cantidad
							<input
								class="remove-arrow input w-24 input-sm"
								type="number"
								min="0.000001"
								step="any"
								disabled={bloqueada}
								bind:value={cantidadInsumo}
							/>
						</label>
						<button
							type="button"
							class="btn btn-outline btn-sm"
							disabled={bloqueada || !insumoSeleccionado}
							onclick={agregarMaterialAsociado}
						>
							Agregar
						</button>
					</div>
					{#if linea.insumos_snapshot.length}
						<ul class="divide-y divide-base-300 text-sm">
							{#each linea.insumos_snapshot as material, index (`${material.insumo_id ?? material.producto_id ?? 'material'}-${index}`)}
								<li class="flex items-center justify-between gap-3 py-2">
									<span>
										{material.cantidad}
										{material.unidad ?? ''} · {material.nombre}
										<span class="text-base-content/60">
											${formatearDosDecimales(material.subtotal)}
										</span>
									</span>
									<button
										type="button"
										class="btn btn-square btn-ghost btn-xs"
										disabled={bloqueada}
										aria-label={`Quitar ${material.nombre} de la composición`}
										title="Quitar insumo"
										onclick={() => onQuitarInsumoAsociado(linea.idx, index)}
									>
										✕
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</details>
		</td>
	</tr>
{/if}

{#if linea.tipo === 'producto' && Array.isArray(linea.insumos_snapshot) && linea.insumos_snapshot.length > 1}
	<tr class="border-x-2 border-b-2 border-base-300/80">
		<td colspan="6" class="p-0">
			<details class="collapse-arrow collapse w-full rounded-none bg-base-200/40">
				<summary class="collapse-title w-full px-3 py-2 text-xs font-medium text-base-content/80">
					Receta del producto
				</summary>
				<ul class="collapse-content flex w-full flex-col gap-1 px-3 pb-3 text-xs">
					{#each linea.insumos_snapshot as material, index (`${material.insumo_id ?? material.producto_id ?? 'subproducto'}-${index}`)}
						<li class="flex w-full items-center justify-between gap-3">
							<span>{describeMaterialReceta(material)}</span>
							{#if esMaterialSubproducto(material)}
								<span class="text-base-content/60">subproducto</span>
							{:else}
								<span>${formatearDosDecimales(material.subtotal)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		</td>
	</tr>
{/if}
