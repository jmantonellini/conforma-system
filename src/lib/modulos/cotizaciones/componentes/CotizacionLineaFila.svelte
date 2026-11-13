<script lang="ts">
	import { SearchSelect } from '$lib/ui';
	import {
		llevaComposicion,
		type InsumoOpcion,
		type LineaEdicion,
		type ProductoOpcion
	} from '$lib/modulos/cotizaciones/tipos';
	import {
		formatearDosDecimales,
		formatearMoneda,
		parsearNumeroDecimal,
		redondearPrecio
	} from '$lib/utils/precios';
	import { describeMaterialReceta, esMaterialSubproducto } from '$lib/modulos/productos/receta';
	import type { Moneda } from '$lib/utils/moneda';

	type Props = {
		linea: LineaEdicion;
		bloqueada: boolean;
		moneda?: Moneda;
		cantidadLineas: number;
		productos: ProductoOpcion[];
		onBuscarProducto?: (search: string) => Promise<void>;
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
		onCrearProducto?: (lineaId: number, texto: string) => void;
		onCrearInsumo?: (lineaId: number, texto: string) => void;
	};

	let {
		linea,
		bloqueada,
		moneda = 'USD',
		cantidadLineas,
		productos,
		onBuscarProducto,
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
		onQuitarInsumoAsociado,
		onCrearProducto,
		onCrearInsumo
	}: Props = $props();
	let estructuraFija = $derived(bloqueada || Boolean(linea.bloqueo));
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
				compacto
				label=""
				id={`producto-${linea.idx}`}
				placeholder="Buscar producto..."
				disabled={estructuraFija}
				field={{
					value: () => linea.producto_id
				}}
				options={productos.map((producto) => ({
					value: String(producto.id),
					label: producto.nombre
				}))}
				onChange={(value: string) => onSeleccionarProducto(linea.idx, value)}
				onSearch={onBuscarProducto}
				onCreate={onCrearProducto && !estructuraFija
					? (texto: string) => onCrearProducto(linea.idx, texto)
					: undefined}
				createLabel="Crear producto"
			/>
			{#if linea.receta_pendiente}
				<span
					class="mt-1 badge badge-soft badge-xs badge-warning"
					title="Este producto todavía no tiene receta. La composición que cargues abajo se guarda como su receta."
				>
					Receta pendiente
				</span>
			{/if}
		{:else if linea.nuevo_insumo}
			<div class="flex min-h-8 flex-col justify-center">
				<span class="font-medium">{linea.nuevo_insumo.nombre}</span>
				<span class="text-xs text-base-content/60">Nuevo insumo · {linea.nuevo_insumo.unidad}</span>
			</div>
		{:else if linea.tipo === 'insumo'}
			<SearchSelect
				compacto
				label=""
				id={`insumo-${linea.idx}`}
				placeholder="Buscar insumo interno..."
				disabled={estructuraFija}
				field={{
					value: () => String(linea.insumo_id ?? '')
				}}
				options={insumos.map((insumo) => ({
					value: String(insumo.id),
					label: `${insumo.codigo} - ${insumo.nombre}`
				}))}
				onChange={(value: string) => onSeleccionarInsumo(linea.idx, value)}
				onCreate={onCrearInsumo && !estructuraFija
					? (texto: string) => onCrearInsumo(linea.idx, texto)
					: undefined}
				createLabel="Crear insumo"
			/>
		{:else}
			<input
				class="input w-full input-sm"
				required
				disabled={bloqueada}
				value={linea.descripcion}
				placeholder={linea.visible_cliente
					? 'Trabajo, reparación u obra para el cliente'
					: 'Trabajo interno'}
				oninput={(event) => onActualizarDescripcion(linea.idx, event.currentTarget.value)}
			/>
		{/if}
	</td>
	<td>
		<div class="flex items-center gap-1">
			<input
				class="input w-20 text-right input-sm"
				type="number"
				min="1"
				disabled={estructuraFija}
				value={linea.cantidad}
				aria-label="Cantidad"
				oninput={(event) => onActualizarCantidad(linea.idx, Number(event.currentTarget.value) || 1)}
			/>
			{#if linea.unidad}<span class="text-xs text-base-content/60">{linea.unidad}</span>{/if}
		</div>
		{#if linea.bloqueo}
			<span class="mt-1 badge badge-ghost badge-xs" title={linea.bloqueo}>Fija</span>
		{/if}
	</td>
	<td class="text-right">
		{#if !linea.visible_cliente}
			<input
				class="input w-32 text-right input-sm"
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
				class="input w-32 text-right input-sm"
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
	<td class="text-right font-semibold whitespace-nowrap tabular-nums">
		{formatearMoneda(
			(linea.visible_cliente ? linea.precio_unitario : linea.costo_materiales) * linea.cantidad,
			moneda
		)}
	</td>
	<td>
		<input
			class="toggle toggle-success toggle-xs"
			type="checkbox"
			checked={linea.visible_cliente}
			disabled={estructuraFija}
			aria-label={linea.visible_cliente ? 'Visible para el cliente' : 'Solo interno'}
			onchange={(event) => onCambiarVisibilidad(linea.idx, event.currentTarget.checked)}
		/>
	</td>
	<td>
		<button
			type="button"
			class="btn btn-square btn-ghost btn-xs"
			disabled={estructuraFija || cantidadLineas === 1}
			title={linea.bloqueo ?? 'Quitar línea'}
			onclick={() => onEliminar(linea.idx)}>✕</button
		>
	</td>
</tr>

{#if llevaComposicion(linea)}
	<tr class="relative z-0 border-x-2 border-b-2 border-base-300/80 focus-within:z-50">
		<td colspan="6" class="p-0">
			<details class="collapse-arrow collapse w-full rounded-none bg-base-200/40">
				<summary class="collapse-title w-full px-3 py-2 text-xs font-medium text-base-content/80">
					{linea.insumos_snapshot.length
						? `${linea.receta_pendiente ? 'Receta' : 'Composición interna'} (${linea.insumos_snapshot.length})`
						: linea.receta_pendiente
							? 'Cargar receta: materiales y horas (se guarda en el producto)'
							: 'Agregar materiales y horas (opcional)'}
				</summary>
				<div class="collapse-content flex flex-col gap-3 px-3 pb-3">
					<div class="flex flex-wrap items-end gap-2">
						<div class="min-w-56 flex-1">
							<SearchSelect
								compacto
								label=""
								id={`composicion-${linea.idx}`}
								placeholder="Buscar insumo..."
								disabled={estructuraFija}
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
								class="input w-24 input-sm"
								type="number"
								min="0.000001"
								step="any"
								disabled={estructuraFija}
								bind:value={cantidadInsumo}
							/>
						</label>
						<button
							type="button"
							class="btn btn-outline btn-sm"
							disabled={estructuraFija || !insumoSeleccionado}
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
											{formatearMoneda(material.subtotal, moneda)}
										</span>
									</span>
									<button
										type="button"
										class="btn btn-square btn-ghost btn-xs"
										disabled={estructuraFija}
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
								<span>{formatearMoneda(material.subtotal, moneda)}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		</td>
	</tr>
{/if}
