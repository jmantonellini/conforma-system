<script lang="ts">
	import { browser } from '$app/environment';
	import type { LayoutProps } from './$types';
	import Header from '$lib/components/ui/Header.svelte';
	import { SideBar } from '$lib/components/ui';
	import {
		Fabricacion,
		Producto,
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
		{ href: Paths.PEDIDOS, label: 'Pedidos', icon: Pedido },
		{ href: Paths.FABRICACION, label: 'Fabricación', icon: Fabricacion },
		{ href: Paths.CLIENTES, label: 'Clientes', icon: Users },
		{ href: Paths.PRODUCTOS, label: 'Productos', icon: Producto },
		{ href: Paths.INVENTARIO, label: 'Inventario', icon: Stock },
		{ href: Paths.ENVIOS, label: 'Envíos', icon: Truck },
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
							{ href: Paths.CONFIGURACION_CATEGORIAS_PRODUCTOS, label: 'Categorías de Productos' },
							{ href: Paths.CONFIGURACION_ESTADOS_FABRICACION, label: 'Estados de Fabricación' },
							{ href: Paths.CONFIGURACION_ESTADOS_PEDIDOS, label: 'Estados de Pedidos' },
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
