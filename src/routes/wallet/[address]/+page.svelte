<script lang="ts">
	import { api, verified } from '$lib';
	import type { Wallet } from '$lib/types.js';

	import { parseCommonMeta, type KristAddress, type KristTransaction } from 'krist';

	let { params } = $props();
	const wallets: Wallet[] = $state(JSON.parse(localStorage.getItem('wallets') || '[]'));

	let thisWalletInformation: KristAddress | undefined = $state();

	import { onMount } from 'svelte';

	let transactions: KristTransaction[] = $state([]);
	let page = $state(0);
	const pageSize = 15;
	let loading = $state(false);
	let hasMore = $state(true);

	import Fa from 'svelte-fa';
	import {
		faUserCheck,
		faInfoCircle,
		faChevronLeft,
		faChevronRight
	} from '@fortawesome/free-solid-svg-icons';

	async function loadTransactions() {
		loading = true;
		const newTxs = await api.getAddressTransactions(params.address, {
			limit: pageSize,
			offset: page * pageSize
		});
		transactions = newTxs.transactions;
		hasMore = newTxs.transactions.length === pageSize;
		loading = false;
	}

	function goToPage(newPage: number) {
		if (!loading && newPage >= 0) {
			page = newPage;
			loadTransactions();
		}
	}

	onMount(async () => {
		await loadTransactions();
		thisWalletInformation = await api.getAddress(params.address);
	});
</script>

<div class="container mx-auto py-8">
	{#if verified[params.address as keyof typeof verified]}
		<div class="mb-6 alert alert-success shadow-lg">
			<Fa icon={faUserCheck} class="mr-2 text-xl" />
			<span class="font-semibold"
				>Verified as {verified[params.address as keyof typeof verified]}</span
			>
		</div>
	{/if}
	{#if wallets.some((wallet) => wallet.address === params.address)}
		<div class="mb-6 alert alert-success shadow-lg">
			<Fa icon={faUserCheck} class="mr-2 text-xl" />
			<span class="font-semibold">This address belongs to you.</span>
		</div>
	{/if}

	{#if thisWalletInformation}
		<div class="card mb-6 border border-base-300 bg-base-100 shadow">
			<div class="card-body">
				<div class="mb-2">
					<span class="text-base-content opacity-70">Address:</span>
					<span class="ml-2 font-mono font-semibold text-primary">{params.address}</span>
				</div>
				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="stat">
						<div class="stat-title text-base-content opacity-70">Balance</div>
						<div class="stat-value text-success">{thisWalletInformation.balance} KRO</div>
					</div>
					<div class="stat">
						<div class="stat-title text-base-content opacity-70">Total Received</div>
						<div class="stat-value text-info">{thisWalletInformation.totalin} KRO</div>
					</div>
					<div class="stat">
						<div class="stat-title text-base-content opacity-70">Total Sent</div>
						<div class="stat-value text-error">{thisWalletInformation.totalout} KRO</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<h2 class="mb-4 text-2xl font-bold text-primary">Transactions</h2>
	{#if transactions.length === 0 && !loading}
		<div class="mb-6 alert alert-info shadow">
			<Fa icon={faInfoCircle} class="mr-2 text-xl" />
			<span>No transactions found for this address.</span>
		</div>
	{/if}
	{#if transactions.length > 0}
		<ul class="mb-6 grid gap-4">
			{#each transactions as tx (tx.id)}
				<li>
					<div
						class="card border border-base-300 bg-base-100 px-6 py-4 shadow transition-all duration-200 hover:border-primary hover:shadow-lg"
					>
						<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
							<div>
								<div class="font-semibold text-primary">
									{tx.type == 'mined'
										? 'Welfare'
										: tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
								</div>
								<div class="text-sm text-base-content opacity-70">
									{new Date(tx.time).toLocaleString()}
								</div>
							</div>
							<div class="flex flex-col gap-2 md:flex-row md:items-center">
								<div class="badge badge-outline badge-success">
									{tx.value} KRO
								</div>
								<div class="text-sm">
									<span class="font-medium">From:</span>
									<span class="font-mono"><a href={`/wallet/${tx.from}`}>{tx.from}</a></span>
								</div>
								<div class="text-sm">
									<span class="font-medium">To:</span>
									<span class="font-mono"><a href={`/wallet/${tx.to}`}>{tx.to}</a></span>
								</div>
							</div>
						</div>
						{#if tx.name || tx.metadata || tx.sent_metaname || tx.sent_name}
							<div class="mt-2 text-sm text-base-content opacity-80">
								{#if tx.name}
									<div><span class="font-medium">Name:</span> {tx.name}</div>
								{/if}
								{#if tx.metadata}
									<div>
										<span class="font-medium">Metadata:</span>
										{#if parseCommonMeta(tx.metadata) !== null}
											{#each Object.entries(parseCommonMeta(tx.metadata)!.custom) as [key, value] (key + value)}
												<div class="ml-4">
													<span class="font-semibold">{key}:</span>
													{value}
												</div>
											{/each}
										{:else}
											<span class="ml-2">{tx.metadata}</span>
										{/if}
									</div>
								{/if}
								{#if tx.sent_metaname}
									<div><span class="font-medium">Sent Metaname:</span> {tx.sent_metaname}</div>
								{/if}
								{#if tx.sent_name}
									<div><span class="font-medium">Sent Name:</span> {tx.sent_name}</div>
								{/if}
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="mt-4 flex items-center justify-center gap-4">
		<button
			class="btn btn-outline btn-primary"
			onclick={() => goToPage(page - 1)}
			disabled={loading || page === 0}
		>
			<Fa icon={faChevronLeft} class="mr-2" />
			Previous
		</button>
		<span class="font-semibold text-base-content">Page {page + 1}</span>
		<button
			class="btn btn-outline btn-primary"
			onclick={() => goToPage(page + 1)}
			disabled={loading || !hasMore}
		>
			Next
			<Fa icon={faChevronRight} class="ml-2" />
		</button>
		{#if loading}
			<span class="loading ml-4 loading-md loading-spinner text-primary"></span>
		{/if}
	</div>
</div>
