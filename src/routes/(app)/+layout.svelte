<script lang="ts">
	import type { LayoutProps } from './$types';
	import Header from '$lib/components/ui/Header.svelte';
	import { SideBar } from '$lib/components/ui';
	import { Fabricacion, Producto, Rocket, Settings, Users } from '$lib/components/ui/icons';
	import Pedido from '$lib/components/ui/icons/Pedido.svelte';
	import { browser } from '$app/environment';
	import { authState } from '$lib/stores/auth.svelte';

	const tabs = [
		{ href: '/', label: 'Tareas', icon: Rocket },
		{ href: '/pedidos', label: 'Pedidos', icon: Pedido },
		{ href: '/fabricacion', label: 'Fabricación', icon: Fabricacion },
		{ href: '/clientes', label: 'Clientes', icon: Users },
		{ href: '/productos', label: 'Productos', icon: Producto },
		{
			href: '/configuracion',
			label: 'Configuración',
			icon: Settings,
			subtabs: [
				{ href: '/configuracion/usuarios', label: 'Usuarios' },
				{ href: '/configuracion/empleados', label: 'Empleados' },
				{ href: '/configuracion/roles', label: 'Roles' },
				{ href: '/configuracion/categorias-productos', label: 'Categorías de Productos' },
				{ href: '/configuracion/estados-fabricacion', label: 'Estados de Fabricación' },
				{ href: '/configuracion/estados-pedidos', label: 'Estados de Pedidos' },
				{ href: '/configuracion/tipos-materiales', label: 'Tipos de Materiales' }
			]
		}
	];

	let { children, data }: LayoutProps = $props();

	let user = $derived(data.user);
	let permisos = $derived(data.permisos);

	$effect(() => {
		if (browser && user) {
			authState.user = user;
			authState.permisos = permisos;
			authState.isLoading = false;
			authState.loaded = true;
		}
	});
</script>

<div class="flex min-h-screen flex-col">
	<Header session={data.session} />
	<!-- Sidebar -->
	<SideBar {tabs}>
		{@render children()}
	</SideBar>
</div>
