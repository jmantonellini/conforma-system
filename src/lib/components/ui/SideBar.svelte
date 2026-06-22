<script lang="ts">
	import { page } from '$app/state';
	import { SideBarToggle } from '$lib/components/ui/icons';

	let { tabs, children } = $props();

	let drawerOpen = $state(true);
</script>

<div class="drawer lg:drawer-open">
	<input id="my-drawer-4" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />
	<div class="drawer-content">
		<nav class="navbar w-full bg-base-300">
			<label
				for="my-drawer-4"
				aria-label="open sidebar"
				class="btn btn-square btn-ghost"
				class:transform-none={!drawerOpen}
				class:rotate-180={drawerOpen}
			>
				<SideBarToggle />
			</label>
		</nav>
		{@render children()}
	</div>

	<div class="drawer-side is-drawer-close:overflow-visible">
		<label for="my-drawer-4" aria-label="close sidebar" class="drawer-overlay"></label>
		<aside
			class="flex h-full min-h-screen w-full flex-col overflow-hidden bg-base-200 px-4 is-drawer-close:w-21 is-drawer-open:w-64"
		>
			<nav class="mt-5 flex h-full w-full flex-col gap-2">
				{#each tabs ?? [] as tab (tab.href)}
					<a
						href={tab.href}
						class="flex w-fullitems-center gap-4 rounded px-4 py-2 text-sm whitespace-nowrap hover:bg-gray-200"
						class:bg-gray-300={tab.href && page.url.pathname.startsWith(tab.href)}
						class:text-primary={tab.href && page.url.pathname.startsWith(tab.href)}
					>
						{#if tab.icon && typeof tab.icon !== 'string'}
							{@const Icon = tab.icon}
							<Icon />
						{/if}
						<span class="is-drawer-close:hidden">
							{tab.label}
						</span>
					</a>
					{#if tab.subtabs && tab.href && page.url.pathname.startsWith(tab.href) && drawerOpen}
						<div class="ml-4 flex flex-col gap-2">
							{#each tab.subtabs as subtab (subtab.href)}
								<a
									href={subtab.href}
									class="block rounded px-4 py-2 text-sm whitespace-nowrap hover:bg-gray-200"
									class:bg-gray-300={subtab.href && page.url.pathname.startsWith(subtab.href)}
								>
									{subtab.label}
								</a>
							{/each}
						</div>
					{/if}
				{/each}
			</nav>
		</aside>
	</div>
</div>
