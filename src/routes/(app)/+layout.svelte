<script lang="ts">
	import type { LayoutProps } from './$types';
	import Header from '$lib/components/ui/Header.svelte';
	import { SideBar } from '$lib/components/ui';
	import {
		Fabricacion,
		Price,
		Producto,
		Puzzle,
		Rocket,
		Settings,
		Stock,
		Truck,
		Users
	} from '$lib/components/ui/icons';
	import Pedido from '$lib/components/ui/icons/Pedido.svelte';
	import { Modulos, Paths } from '$lib/types';
	import { can } from '$lib/utils/permissions';

	let { children, data }: LayoutProps = $props();

	// === Tabs calculados desde data (única fuente de verdad) ===
	const tabs = $derived([
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
		...(can(data.user, data.permisos, Modulos.CLIENTES)
			? [{ href: Paths.CLIENTES, label: 'Clientes', icon: Users }]
			: []),
		...(can(data.user, data.permisos, Modulos.PRODUCTOS)
			? [{ href: Paths.PRODUCTOS, label: 'Productos', icon: Producto }]
			: []),
		...(can(data.user, data.permisos, Modulos.INSUMOS)
			? [{ href: Paths.INSUMOS, label: 'Insumos', icon: Puzzle }]
			: []),
		...(can(data.user, data.permisos, Modulos.INVENTARIO)
			? [{ href: Paths.INVENTARIO, label: 'Inventario', icon: Stock }]
			: []),
		...(can(data.user, data.permisos, Modulos.ENVIOS)
			? [{ href: Paths.ENVIOS, label: 'Envíos', icon: Truck }]
			: []),
		...(can(data.user, data.permisos, Modulos.CONFIGURACION)
			? [
					{
						href: Paths.CONFIGURACION,
						label: 'Configuración',
						icon: Settings,
						subtabs: [
							{ href: Paths.CONFIGURACION_USUARIOS, label: 'Usuarios' },
							{ href: Paths.CONFIGURACION_EMPLEADOS, label: 'Empleados' },
							{ href: Paths.CONFIGURACION_ROLES, label: 'Roles' },
							{ href: Paths.CONFIGURACION, label: 'Catálogos y estados' }
							// { href: Paths.CONFIGURACION_TIPOS_MATERIA_PRIMA, label: 'Tipos de Materiales' }
						]
					}
				]
			: [])
	]);
</script>

<div class="flex min-h-screen flex-col">
	<Header session={data.session} />
	<SideBar {tabs}>
		{@render children()}
	</SideBar>
</div>
