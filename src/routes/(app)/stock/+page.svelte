<script lang="ts">
	import { mensajeError } from '$lib/utils/errores';
	import { resolve } from '$app/paths';
	import { Can, FormFieldWrapper, Modal, PageLayout } from '$lib/ui';
	import { Stock } from '$lib/ui/icons';
	import { toast } from '$lib/ui/toast.svelte';
	import {
		getStockDisponibilidad,
		registrarMovimientoStock
	} from '$lib/modulos/stock/stock.remote';
	import {
		ETIQUETAS_MOVIMIENTO_STOCK,
		TIPOS_MOVIMIENTO_STOCK,
		type TipoMovimientoStock,
		type TipoUbicacionStock,
		UBICACIONES_STOCK
	} from '$lib/modulos/stock/tipos';
	import { formatearFecha } from '$lib/utils/fechas';

	let filtroUbicacion = $state<'todas' | TipoUbicacionStock>('todas');
	let busqueda = $state('');
	let dialogoAbierto = $state(false);
	let guardando = $state(false);
	let tipoMovimiento = $state<TipoMovimientoStock>('ingreso');
	let productoId = $state('');
	let distribuidorId = $state('');
	let cantidad = $state(1);
	let observaciones = $state('');
	const stock = $derived(await getStockDisponibilidad());
	const movimientoTipo = $derived(
		TIPOS_MOVIMIENTO_STOCK.find((item) => item.value === tipoMovimiento) ??
			TIPOS_MOVIMIENTO_STOCK[0]
	);

	const grupos = $derived.by(() => {
		const termino = busqueda.trim().toLocaleLowerCase();
		return stock.ubicaciones
			.filter((ubicacion) => filtroUbicacion === 'todas' || ubicacion.tipo === filtroUbicacion)
			.map((ubicacion) => ({
				...ubicacion,
				balances: stock.balances.filter((balance) => {
					if (balance.ubicacion_id !== ubicacion.id || balance.existencia <= 0) return false;
					return (
						!termino ||
						balance.producto_nombre.toLocaleLowerCase().includes(termino) ||
						balance.producto_codigo.toLocaleLowerCase().includes(termino)
					);
				})
			}))
			.filter((grupo) => grupo.balances.length > 0 || !termino);
	});
	const unidadesTotales = $derived(
		stock.balances.reduce((total, balance) => total + balance.existencia, 0)
	);
	const distribuidoresConStock = $derived(
		new Set(
			stock.balances
				.filter(
					(balance) =>
						balance.existencia > 0 &&
						stock.ubicaciones.some(
							(ubicacion) =>
								ubicacion.id === balance.ubicacion_id &&
								ubicacion.tipo === UBICACIONES_STOCK.DISTRIBUIDOR
						)
				)
				.map((balance) => balance.ubicacion_id)
		).size
	);

	function abrirMovimiento(tipo: TipoMovimientoStock, producto?: number, distribuidor?: number) {
		tipoMovimiento = tipo;
		productoId = producto ? String(producto) : '';
		distribuidorId = distribuidor ? String(distribuidor) : '';
		cantidad = 1;
		observaciones = '';
		dialogoAbierto = true;
	}

	function cerrarDialogo() {
		dialogoAbierto = false;
	}

	async function guardarMovimiento() {
		if (!productoId || !Number.isSafeInteger(cantidad) || cantidad < 1) return;
		guardando = true;
		try {
			await registrarMovimientoStock({
				tipo: tipoMovimiento,
				producto_id: Number(productoId),
				cantidad,
				distribuidor_id: movimientoTipo.requiereDistribuidor ? Number(distribuidorId) : undefined,
				observaciones: observaciones.trim() || undefined
			});
			await getStockDisponibilidad().refresh();
			toast.success('Movimiento registrado');
			cerrarDialogo();
		} catch (error) {
			toast.error(mensajeError(error, 'No se pudo registrar el movimiento'));
		} finally {
			guardando = false;
		}
	}
</script>

<PageLayout>
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold">Stock</h1>
			<p class="mt-1 text-sm text-base-content/60">Existencias por depósito y distribuidor</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Can modulo="stock" accion="edit">
				<button class="btn btn-outline btn-sm" onclick={() => abrirMovimiento('ingreso')}>
					+ Registrar movimiento
				</button>
			</Can>
			<Can modulo="stock" accion="edit">
				<a class="btn btn-primary btn-sm" href={resolve('/fabricacion/crear?origen=stock')}>
					<Stock /> Fabricar para stock
				</a>
			</Can>
		</div>
	</div>

	<div
		class="stats mb-6 w-full stats-vertical border border-base-300 bg-base-100 shadow-sm sm:stats-horizontal"
	>
		<div class="stat">
			<div class="stat-title">Unidades en stock</div>
			<div class="stat-value text-2xl">{unidadesTotales}</div>
		</div>
		<div class="stat">
			<div class="stat-title">Distribuidores con stock</div>
			<div class="stat-value text-2xl">{distribuidoresConStock}</div>
		</div>
	</div>

	<div class="mb-4 flex flex-col gap-3 sm:flex-row">
		<input
			class="input w-full sm:max-w-sm"
			placeholder="Buscar producto o código..."
			bind:value={busqueda}
		/>
		<select
			class="select w-full sm:w-56"
			bind:value={filtroUbicacion}
			aria-label="Filtrar ubicación"
		>
			<option value="todas">Todas las ubicaciones</option>
			<option value="deposito">Depósito central</option>
			<option value="distribuidor">Distribuidores</option>
		</select>
	</div>

	<div class="flex flex-col gap-4">
		{#each grupos as grupo (grupo.id)}
			<section class="overflow-hidden rounded-box border border-base-300 bg-base-100">
				<div
					class="flex items-center justify-between border-b border-base-300 bg-base-200 px-4 py-3"
				>
					<div>
						<h2 class="font-semibold">{grupo.nombre}</h2>
						<p class="text-xs text-base-content/60">
							{grupo.tipo === UBICACIONES_STOCK.DEPOSITO
								? 'Depósito central'
								: 'Stock asignado al distribuidor'}
						</p>
					</div>
					{#if grupo.tipo === UBICACIONES_STOCK.DEPOSITO}
						<Can modulo="stock" accion="edit">
							<button
								class="btn btn-outline btn-xs"
								onclick={() => abrirMovimiento('transferencia')}>Enviar a distribuidor</button
							>
						</Can>
					{/if}
				</div>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th>Código</th>
								<th>Producto</th>
								<th class="text-right">En existencia</th>
								<th class="text-right">Reservado</th>
								<th class="text-right">Disponible</th>
								<th class="text-right">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each grupo.balances as balance (`${balance.producto_id}-${balance.ubicacion_id}`)}
								<tr>
									<td class="font-mono text-sm">{balance.producto_codigo}</td>
									<td class="font-medium">{balance.producto_nombre}</td>
									<td class="text-right">{balance.existencia}</td>
									<td class="text-right">{balance.reservada}</td>
									<td class="text-right font-semibold">{balance.disponible}</td>
									<td>
										<div class="flex justify-end gap-1">
											<Can modulo="stock" accion="edit">
												{#if grupo.tipo === UBICACIONES_STOCK.DEPOSITO}
													<button
														class="btn btn-ghost btn-xs"
														title="Transferir a distribuidor"
														aria-label={`Transferir ${balance.producto_nombre}`}
														onclick={() => abrirMovimiento('transferencia', balance.producto_id)}
														>Enviar</button
													>
												{/if}
												{#if grupo.tipo === UBICACIONES_STOCK.DISTRIBUIDOR}
													<Can modulo="pedidos" accion="create">
														<a
															class="btn btn-ghost btn-xs"
															title="Crear un Pedido para este distribuidor desde su stock"
															href={resolve(
																`/pedidos/crear?contacto=${grupo.contacto_distribuidor_id}&producto=${balance.producto_id}&stockUbicacion=${grupo.id}`
															)}>Crear pedido</a
														>
													</Can>
													<button
														class="btn btn-ghost btn-xs"
														title="Registrar devolución al depósito"
														aria-label={`Devolver ${balance.producto_nombre}`}
														onclick={() =>
															abrirMovimiento(
																'devolucion',
																balance.producto_id,
																grupo.contacto_distribuidor_id ?? undefined
															)}>Devolver</button
													>
												{/if}
											</Can>
										</div>
									</td>
								</tr>
							{:else}
								<tr
									><td colspan="6" class="py-8 text-center text-sm text-base-content/60"
										>Sin stock en esta ubicación.</td
									></tr
								>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{:else}
			<div
				class="rounded-box border border-base-300 bg-base-100 p-8 text-center text-sm text-base-content/60"
			>
				No hay stock para mostrar.
			</div>
		{/each}
	</div>

	<section class="mt-8 overflow-hidden rounded-box border border-base-300 bg-base-100">
		<div class="border-b border-base-300 px-4 py-3">
			<h2 class="font-semibold">Movimientos recientes</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Movimiento</th>
						<th>Producto</th>
						<th>Origen</th>
						<th>Destino</th>
						<th class="text-right">Unidades</th>
					</tr>
				</thead>
				<tbody>
					{#each stock.historial as movimiento (movimiento.id)}
						<tr>
							<td>{movimiento.fecha ? formatearFecha(new Date(movimiento.fecha)) : '-'}</td>
							<td>{ETIQUETAS_MOVIMIENTO_STOCK[movimiento.tipo]}</td>
							<td>{movimiento.producto_codigo} · {movimiento.producto_nombre}</td>
							<td>{movimiento.origen || '—'}</td>
							<td>{movimiento.destino || '—'}</td>
							<td class="text-right">{movimiento.cantidad}</td>
						</tr>
					{:else}
						<tr
							><td colspan="6" class="py-6 text-center text-sm text-base-content/60"
								>Sin movimientos registrados.</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</PageLayout>

<Modal
	bind:open={dialogoAbierto}
	titulo="Registrar movimiento"
	alCerrar={cerrarDialogo}
	accion={{ etiqueta: 'Registrar', pendiente: guardando, onclick: guardarMovimiento }}
>
	<div class="grid gap-4">
		<FormFieldWrapper id="tipo_movimiento" label="Movimiento" required>
			<select class="select" bind:value={tipoMovimiento}>
				{#each TIPOS_MOVIMIENTO_STOCK as tipo (tipo.value)}
					<option value={tipo.value}>{tipo.label}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		<FormFieldWrapper id="producto_stock" label="Producto" required>
			<select class="select" bind:value={productoId} required>
				<option value="">Seleccionar...</option>
				{#each stock.productos as producto (producto.id)}
					<option value={String(producto.id)}>{producto.codigo} — {producto.nombre}</option>
				{/each}
			</select>
		</FormFieldWrapper>
		{#if movimientoTipo.requiereDistribuidor}
			<FormFieldWrapper id="distribuidor_stock" label="Distribuidor" required>
				<select class="select" bind:value={distribuidorId} required>
					<option value="">Seleccionar...</option>
					{#each stock.distribuidores as distribuidor (distribuidor.id)}
						<option value={String(distribuidor.id)}>{distribuidor.nombre}</option>
					{/each}
				</select>
			</FormFieldWrapper>
		{/if}
		<FormFieldWrapper id="cantidad_stock" label="Cantidad" required>
			<input class="input" type="number" min="1" step="1" bind:value={cantidad} />
		</FormFieldWrapper>
		<FormFieldWrapper id="observaciones_stock" label="Observaciones">
			<textarea class="textarea" rows="2" bind:value={observaciones}></textarea>
		</FormFieldWrapper>
	</div>
</Modal>
