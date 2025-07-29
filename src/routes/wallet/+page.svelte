<script lang="ts">
	import type { Wallet } from '$lib/types';
	import { faFlag } from '@fortawesome/free-solid-svg-icons';
	import { calculateAddress } from 'krist';
	import Fa from 'svelte-fa';
	let walletAddress: string = $state('???');
	const wallets: Wallet[] = $state(JSON.parse(localStorage.getItem('wallets') || '[]'));
	let inputKey: string = $state('');
	let inputError: string = $state('');
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center rounded-xl bg-base-200 p-8">
	<div>
		<h2 class="mb-6 text-center text-3xl font-bold text-primary">Add Wallet</h2>
		<hr class="mb-6" />

		<div class="mb-6 flex flex-col items-center justify-center gap-4">
			<input
				type="text"
				class="input w-full max-w-md text-center input-primary"
				bind:value={inputKey}
				placeholder="Enter wallet private key"
				oninput={async (event) => {
					const value = (event.target as HTMLInputElement).value;
					if (!value) {
						walletAddress = '???';
						inputError = '';
						return;
					}
					try {
						const [address] = await calculateAddress(value, undefined, 'api');
						walletAddress = address;
						inputError = '';
					} catch {
						walletAddress = '???';
						inputError = 'Invalid private key.';
					}
				}}
			/>
			{#if inputError}
				<div class="mt-2 text-center text-lg font-semibold text-error">{inputError}</div>
			{/if}
			<div class="text-lg text-base-content">
				Calculated address is: <b class="text-primary">{walletAddress}</b>.
			</div>
			<button
				class="btn mt-4 w-full max-w-md btn-success"
				onclick={() => {
					if (walletAddress !== '???') {
						const privateKey = inputKey;
						if (privateKey) {
							wallets.push({ address: walletAddress, private_key: privateKey });
							localStorage.setItem('wallets', JSON.stringify(wallets));
							location.href = '/';
						}
					}
				}}
			>
				<Fa icon={faFlag} class="mr-2" />
				Add Wallet
			</button>
		</div>
	</div>
</div>
