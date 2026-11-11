<script lang="ts">
	import { onMount, type Component, type Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { page } from '$app/state';
	import { SideBarToggle } from '$lib/components/ui/icons';

	type Tab = {
		href: string;
		label: string;
		icon?: Component;
		subtabs?: { href: string; label: string }[];
	};

	let { tabs, children }: { tabs: Tab[]; children: Snippet } = $props();

	// En escritorio el menú arranca expandido; en mobile es un overlay que arranca cerrado.
	let abierto = $state(true);
	const esMobile = () => !matchMedia('(min-width: 1024px)').matches;
	onMount(() => {
		if (esMobile()) abierto = false;
	});
	const navegar = (tab: Tab) => {
		if (esMobile()) abierto = false;
		else if (tab.subtabs?.length) abierto = true;
	};

	const activo = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	const tabActivo = (tab: Tab) => activo(tab.href) || !!tab.subtabs?.some((s) => activo(s.href));
</script>

<div class="drawer grow lg:drawer-open">
	<input id="menu-lateral" type="checkbox" class="drawer-toggle" bind:checked={abierto} />

	<div class="drawer-content min-w-0">
		<label
			for="menu-lateral"
			aria-label="Abrir menú"
			class="btn m-2 btn-square btn-ghost lg:hidden"
		>
			<SideBarToggle />
		</label>
		{@render children()}
	</div>

	<div class="drawer-side z-30 is-drawer-close:overflow-visible">
		<label for="menu-lateral" aria-label="Cerrar menú" class="drawer-overlay"></label>
		<aside
			class="flex min-h-full flex-col border-r border-base-300 bg-base-100 is-drawer-close:w-16 is-drawer-open:w-60"
		>
			<label
				for="menu-lateral"
				aria-label="Contraer menú"
				class={['btn m-2 btn-square self-end btn-ghost btn-sm', abierto && 'rotate-180']}
			>
				<SideBarToggle />
			</label>
			<ul class="menu w-full grow gap-1">
				{#each tabs as tab (tab.href)}
					<li>
						<a
							href={resolve(tab.href as Pathname as '/')}
							class={[
								tabActivo(tab) && 'menu-active',
								'is-drawer-close:tooltip is-drawer-close:tooltip-right'
							]}
							data-tip={tab.label}
							onclick={() => navegar(tab)}
						>
							{#if tab.icon}<tab.icon />{/if}
							<span class="is-drawer-close:hidden">{tab.label}</span>
						</a>
						{#if tab.subtabs && tabActivo(tab) && abierto}
							<ul>
								{#each tab.subtabs as subtab (subtab.href)}
									<li>
										<a
											href={resolve(subtab.href as Pathname as '/')}
											class={[activo(subtab.href) && 'menu-active']}
											onclick={() => navegar(subtab)}
										>
											{subtab.label}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</aside>
	</div>
</div>
