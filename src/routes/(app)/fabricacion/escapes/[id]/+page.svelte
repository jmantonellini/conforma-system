<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { EncabezadoDetalle, PageLayout, Seccion } from '$lib/ui';
	import ArchivosAdjuntos from '$lib/modulos/adjuntos/componentes/ArchivosAdjuntos.svelte';
	import { getUnidadFabricada } from '$lib/modulos/fabricacion/fabricacion-consultas.remote';
	import { formatearFecha } from '$lib/utils/fechas';

	const unidad = $derived(await getUnidadFabricada(Number(page.params.id)));
</script>

<PageLayout>
	<EncabezadoDetalle
		titulo={unidad.numero ? `Escape N° ${unidad.numero}` : unidad.numero_serie}
		subtitulo={unidad.descripcion}
		volver={{ href: '/fabricacion/escapes', etiqueta: 'Escapes fabricados' }}
		estado={unidad.estado ? { id: 0, ...unidad.estado } : null}
	/>

	<div class="flex min-w-0 flex-col gap-4 sm:gap-6">
		<Seccion>
			<dl class="datos">
				<div>
					<dt>Fecha</dt>
					<dd>{formatearFecha(unidad.fecha)}</dd>
				</div>
				<div>
					<dt>Cliente</dt>
					<dd>{unidad.cliente ?? '-'}</dd>
				</div>
				<div>
					<dt>Producto</dt>
					<dd>
						{#if unidad.producto && unidad.producto_id}
							<a class="link link-hover" href={resolve(`/productos/${unidad.producto_id}`)}>
								{unidad.producto}
							</a>
						{:else}
							-
						{/if}
					</dd>
				</div>
				<div>
					<dt>Trabajo</dt>
					<dd>
						{#if unidad.orden_id}
							<a
								class="link font-mono link-hover"
								href={resolve(`/fabricacion/${unidad.orden_id}`)}
							>
								OF-{unidad.orden_id}
							</a>
						{:else if unidad.pedido_id}
							<a class="link font-mono link-hover" href={resolve(`/pedidos/${unidad.pedido_id}`)}>
								{unidad.pedido_numero}
							</a>
						{:else}
							Sin OF
						{/if}
					</dd>
				</div>
				{#if unidad.observaciones}
					<div class="sm:col-span-full">
						<dt>Observaciones</dt>
						<dd class="whitespace-pre-line">{unidad.observaciones}</dd>
					</div>
				{/if}
			</dl>
		</Seccion>

		<ArchivosAdjuntos
			tipo="unidad"
			entidadId={unidad.id}
			adjuntos={unidad.adjuntos}
			titulo="Fotos y planos"
			vacio="Este escape no tiene fotos ni planos."
		/>
	</div>
</PageLayout>
