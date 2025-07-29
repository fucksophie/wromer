<script lang="ts">
	import { api } from '$lib';
	import { type KristAddress } from 'krist';

	import { onMount } from 'svelte';
	let richestAddresses: KristAddress[] = $state([]);
	let loading = $state(false);

	async function loadRichestAddresses() {
		loading = true;
		richestAddresses = (await api.getRichAddresses()).addresses;
		loading = false;
	}

	onMount(async () => {
		await loadRichestAddresses();
	});
</script>

<div class="container mx-auto py-8">
	<h2 class="mb-6 text-3xl font-bold text-primary">Richest Addresses</h2>
	<hr class="mb-6" />
	{#if richestAddresses.length === 0 && !loading}
		<div class="mb-8 alert alert-info shadow-lg">
			<div>
				<span class="text-lg font-semibold">No rich addresses found!</span>
				<p class="mt-2 text-base-content">
					There are currently no addresses with significant balances to display.
				</p>
			</div>
		</div>
	{/if}
	{#if richestAddresses.length > 0}
		<ul class="grid gap-4">
			{#each richestAddresses.slice(0, 20) as addr, i (addr.address)}
				<li>
					<a
						href={`/wallet/${addr.address}`}
						class={`card flex items-center border px-6 py-4 shadow transition-all duration-200 hover:border-primary hover:shadow-lg ${
							i === 0
								? 'border-green-400 bg-green-100'
								: i === 1
									? 'border-red-400 bg-red-100'
									: i === 2
										? 'border-yellow-400 bg-yellow-100'
										: 'border-base-300 bg-base-100'
						}`}
					>
						<div class="flex w-full items-center gap-4">
							<div class="flex flex-1 flex-col">
								<div class="mb-2 flex items-center gap-2">
									<span class="badge badge-lg font-bold badge-secondary">#{i + 1}</span>
									<span class="font-mono font-semibold break-all text-primary">{addr.address}</span>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-4">
									<div class="stat">
										<div class="stat-title text-base-content opacity-70">Balance</div>
										<div class="stat-value text-success">{addr.balance} KRO</div>
									</div>
									<div class="stat">
										<div class="stat-title text-base-content opacity-70">Total In</div>
										<div class="stat-value text-info">{addr.totalin} KRO</div>
									</div>
									<div class="stat">
										<div class="stat-title text-base-content opacity-70">Total Out</div>
										<div class="stat-value text-error">{addr.totalout} KRO</div>
									</div>
								</div>
								{#if addr.names !== undefined}
									<div class="mt-2 text-sm text-base-content opacity-80">
										<span class="font-medium">Names Owned:</span>
										{addr.names}
									</div>
								{/if}
							</div>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
	{#if loading}
		<div class="mt-4 flex items-center justify-center">
			<span class="loading loading-md loading-spinner text-primary"></span>
			<span class="ml-2 animate-pulse text-gray-600">Loading...</span>
		</div>
	{/if}
</div>
