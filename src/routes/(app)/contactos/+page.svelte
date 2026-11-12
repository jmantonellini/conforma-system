<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Can,
		ColumnaOrden,
		ExcelMenu,
		Highlight,
		Icono,
		Listado,
		filtrar,
		parametro
	} from '$lib/ui';
	import { eliminarContacto } from '$lib/modulos/contactos/contactos.remote';
	import { confirmarYEjecutar } from '$lib/ui/confirmar.svelte';
	import { can } from '$lib/utils/permissions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const busqueda = $derived(parametro('search'));
	const rol = $derived(parametro('rol'));

	const ROLES = [
		['es_cliente', 'Cliente', 'badge-info'],
		['es_distribuidor', 'Distribuidor', 'badge-primary'],
		['es_proveedor', 'Proveedor', 'badge-success']
	] as const;
</script>

<Listado
	titulo="Contactos"
	datos={data.contactos}
	total={data.total}
	pagina={data.currentPage}
	paginas={data.totalPages}
	buscar="Razón social, CUIT, nombre, email..."
	vacio="No hay contactos para estos filtros"
>
	{#snippet acciones()}
		<a
			class="btn btn-primary btn-sm"
			href={resolve(rol === 'cliente' ? '/contactos/crear?rol=cliente' : '/contactos/crear')}
		>
			<Icono nombre="mas_simple" />
			{rol === 'cliente' ? 'Nuevo cliente' : 'Nuevo contacto'}
		</a>
	{/snippet}
	{#snippet filtros()}
		<select
			class="select w-44 select-sm"
			aria-label="Filtrar por rol"
			value={rol}
			onchange={(e) => filtrar({ rol: e.currentTarget.value })}
		>
			<option value="">Todos los roles</option>
			<option value="cliente">Clientes</option>
			<option value="distribuidor">Distribuidores</option>
			<option value="proveedor">Proveedores</option>
		</select>
	{/snippet}
	{#snippet herramientas()}
		<ExcelMenu
			importHref={resolve('/contactos/importar')}
			exportHref={resolve('/contactos/exportar')}
			canImport={can(data.user, data.permisos, 'contactos', 'create')}
			canExport={can(data.user, data.permisos, 'contactos', 'view')}
		/>
	{/snippet}
	{#snippet header()}
		<ColumnaOrden clave="razon_social" porDefecto="razon_social">Razón social</ColumnaOrden>
		<ColumnaOrden clave="cuit" porDefecto="razon_social">CUIT</ColumnaOrden>
		<th>Roles</th>
		<ColumnaOrden clave="email" porDefecto="razon_social">Contacto</ColumnaOrden>
		<th></th>
	{/snippet}
	{#snippet row(contacto: (typeof data.contactos)[number])}
		<td class="max-w-72">
			<a class="enlace-fila block truncate" href={resolve(`/contactos/${contacto.id}`)}>
				<Highlight text={contacto.razon_social} query={busqueda} />
			</a>
			{#if contacto.apellido || contacto.nombre}
				<p class="secundario truncate">
					<Highlight
						text={[contacto.apellido, contacto.nombre].filter(Boolean).join(' ')}
						query={busqueda}
					/>
				</p>
			{/if}
		</td>
		<td class="font-mono text-sm text-base-content/70">
			<Highlight text={contacto.cuit || '-'} query={busqueda} />
		</td>
		<td>
			<div class="flex flex-wrap gap-1">
				{#each ROLES as [campo, etiqueta, clase] (campo)}
					{#if contacto[campo]}<span class={['badge badge-soft badge-sm', clase]}>{etiqueta}</span
						>{/if}
				{/each}
			</div>
		</td>
		<td>
			<p><Highlight text={contacto.email || contacto.telefono || '-'} query={busqueda} /></p>
			{#if contacto.email && contacto.telefono}<p class="secundario">{contacto.telefono}</p>{/if}
		</td>
		<td class="w-0">
			<Can modulo="contactos" accion="delete">
				<button
					class="btn btn-square btn-ghost text-base-content/50 btn-sm hover:text-error"
					title="Eliminar"
					onclick={() =>
						confirmarYEjecutar({
							mensaje: `¿Eliminar el contacto "${contacto.razon_social}"?`,
							ejecutar: () => eliminarContacto(contacto.id),
							exito: 'Contacto eliminado'
						})}
				>
					<Icono nombre="papelera" />
				</button>
			</Can>
		</td>
	{/snippet}
</Listado>
