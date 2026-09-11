<script lang="ts">
	import { page } from '$app/state';
	import { SideBarToggle } from '$lib/components/ui/icons';

	let { tabs, children } = $props();

	let drawerOpen = $state(true);

	function isActive(href: string) {
		if (href === '/') return page.url.pathname === '/';
		return href && page.url.pathname.startsWith(href);
	}

	function handleTabClick(tab: { subtabs?: unknown[] }, e: MouseEvent) {
		if (!drawerOpen && tab.subtabs && tab.subtabs.length > 0) {
			drawerOpen = true;
		}
	}
</script>

<div class="drawer lg:drawer-open">
	<input id="my-drawer-4" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

	<div class="drawer-content">
		<div class="p-2 lg:hidden">
			<label for="my-drawer-4" aria-label="open sidebar" class="btn btn-square btn-ghost">
				<SideBarToggle />
			</label>
		</div>
		{@render children()}
	</div>

	<div class="drawer-side is-drawer-close:overflow-visible">
		<label for="my-drawer-4" aria-label="close sidebar" class="drawer-overlay"></label>
		<aside
			class="flex h-full min-h-screen w-full flex-col overflow-hidden bg-base-200 px-4 is-drawer-close:w-21 is-drawer-open:w-64"
		>
			<div class="flex items-center justify-end pt-4 pb-2">
				<label
					for="my-drawer-4"
					aria-label="toggle sidebar"
					class="btn btn-square btn-ghost btn-sm"
					class:rotate-180={drawerOpen}
				>
					<SideBarToggle />
				</label>
			</div>

			<nav class="flex h-full w-full flex-col gap-2">
				{#each tabs ?? [] as tab (tab.href)}
					<a
						href={tab.href}
						onclick={(e) => handleTabClick(tab, e)}
						class="flex w-full items-center gap-4 rounded px-4 py-2 text-sm whitespace-nowrap hover:bg-gray-200"
						class:bg-gray-300={isActive(tab.href)}
						class:text-primary={isActive(tab.href)}
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
						<div class="ml-4 flex flex-col gap-1">
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
