<script lang="ts">
	import type { LayoutProps } from './$types';
	import Header from '$lib/components/ui/Header.svelte';
	import { SideBar } from '$lib/components/ui';
	import { Fabricacion, Settings, Users } from '$lib/components/ui/icons';
	import Pedido from '$lib/components/ui/icons/Pedido.svelte';

	const tabs = [
		{ href: '/pedidos', label: 'Pedidos', icon: Pedido },
		{ href: '/fabricacion', label: 'Fabricación', icon: Fabricacion },
		{ href: '/clientes', label: 'Clientes', icon: Users },
		{
			href: '/configuracion',
			label: 'Configuración',
			icon: Settings,
			subtabs: [
				{ href: '/configuracion/categorias-productos', label: 'Categorías de Productos' },
				{ href: '/configuracion/usuarios', label: 'Usuarios' },
				{ href: '/configuracion/roles', label: 'Roles' },
				{ href: '/configuracion/estados-fabricacion', label: 'Estados de Fabricación' },
				{ href: '/configuracion/estados-pedidos', label: 'Estados de Pedidos' },
				{ href: '/configuracion/tipos-materiales', label: 'Tipos de Materiales' }
			]
		}
	];

	let { children, data }: LayoutProps = $props();
</script>

<div class="flex min-h-screen flex-col">
	<Header session={data.session} />
	<div class="flex h-full w-full">
		<!-- Sidebar -->
		<SideBar {tabs}>
			{@render children()}
		</SideBar>
	</div>
</div>
