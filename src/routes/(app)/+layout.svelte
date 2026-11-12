<script lang="ts">
	import type { LayoutProps } from './$types';
	import Header from '$lib/ui/Header.svelte';
	import { SideBar } from '$lib/ui';
	import {
		Fabricacion,
		Document,
		Graph,
		Price,
		Producto,
		Puzzle,
		Rocket,
		Settings,
		Stock,
		Truck,
		Users
	} from '$lib/ui/icons';
	import Pedido from '$lib/ui/icons/Pedido.svelte';
	import { Modulos, Paths } from '$lib/tipos';
	import { can } from '$lib/utils/permissions';

	let { children, data }: LayoutProps = $props();

	const tabs = $derived([
		{ href: Paths.INICIO, label: 'Inicio', icon: Graph },
		{ href: Paths.TAREAS, label: 'Tareas', icon: Rocket },
		...(can(data.user, data.permisos, Modulos.COTIZACIONES)
			? [{ href: Paths.COTIZACIONES, label: 'Cotizaciones', icon: Price }]
			: []),
		...(can(data.user, data.permisos, Modulos.PEDIDOS)
			? [{ href: Paths.PEDIDOS, label: 'Pedidos', icon: Pedido }]
			: []),
		...(can(data.user, data.permisos, Modulos.FABRICACION)
			? [{ href: Paths.FABRICACION, label: 'Fabricación', icon: Fabricacion }]
			: []),
		...(can(data.user, data.permisos, 'contactos')
			? [{ href: Paths.CONTACTOS, label: 'Contactos', icon: Users }]
			: []),
		...(can(data.user, data.permisos, Modulos.PRODUCTOS)
			? [{ href: Paths.PRODUCTOS, label: 'Productos', icon: Producto }]
			: []),
		...(can(data.user, data.permisos, Modulos.INSUMOS)
			? [{ href: Paths.INSUMOS, label: 'Insumos', icon: Puzzle }]
			: []),
		...(can(data.user, data.permisos, Modulos.STOCK)
			? [{ href: Paths.STOCK, label: 'Stock', icon: Stock }]
			: []),
		...(can(data.user, data.permisos, Modulos.ENVIOS)
			? [{ href: Paths.ENVIOS, label: 'Envíos', icon: Truck }]
			: []),
		...(can(data.user, data.permisos, Modulos.REPORTES)
			? [{ href: Paths.REPORTES, label: 'Reportes', icon: Document }]
			: []),
		...(can(data.user, data.permisos, Modulos.CONFIGURACION)
			? [
					{
						href: Paths.CONFIGURACION_ESTADOS,
						label: 'Configuración',
						icon: Settings,
						subtabs: [
							{ href: Paths.CONFIGURACION_EMPRESA, label: 'Datos de la empresa' },
							{ href: Paths.CONFIGURACION_USUARIOS, label: 'Usuarios' },
							{ href: Paths.CONFIGURACION_EMPLEADOS, label: 'Empleados' },
							{ href: Paths.CONFIGURACION_ROLES, label: 'Roles' },
							{ href: Paths.CONFIGURACION_ESTADOS, label: 'Catálogos y estados' }
						]
					}
				]
			: [])
	]);
</script>

<div class="flex min-h-screen flex-col bg-base-200">
	<Header usuario={data.user} permisos={data.permisos} empresa={data.empresa} />
	<SideBar {tabs}>
		{@render children()}
	</SideBar>
</div>
