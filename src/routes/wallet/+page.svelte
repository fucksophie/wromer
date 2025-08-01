<script lang="ts">
	import { api } from '$lib';
	import { AESGCMDecrypt, AESGCMEncrypt } from '$lib/aes';
	import type { Wallet } from '$lib/types';
	import { faFlag, faDice } from '@fortawesome/free-solid-svg-icons';
	import { calculateAddress } from 'krist';
	import Fa from 'svelte-fa';
	let walletAddress: string = $state('???');
	const wallets: Wallet[] = $state(JSON.parse(localStorage.getItem('wallets') || '[]'));
	let inputKey: string = $state('');
	let inputError: string = $state('');
	let encryptionPassword: string = $state('');

	function generateRandomPrivateKey(): string {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return Array.from(array)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}

	async function handleDiceClick() {
		const randomKey = generateRandomPrivateKey();
		inputKey = randomKey;
		try {
			const [address] = await calculateAddress(randomKey, undefined, 'api');
			walletAddress = address;
			inputError = '';
		} catch {
			walletAddress = '???';
			inputError = 'Invalid private key.';
		}
	}
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center rounded-xl p-8">
	<div>
		<h2 class="mb-6 text-center text-3xl font-bold text-primary">Add Wallet</h2>
		<hr class="mb-6" />

		<div class="mb-6 flex flex-col items-center justify-center gap-4">
			<div class="flex w-full max-w-md items-center gap-2">
				<input
					type="text"
					class="input w-full text-center input-primary"
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
				<button
					type="button"
					class="btn btn-square btn-primary"
					title="Generate random private key"
					onclick={handleDiceClick}
				>
					<Fa icon={faDice} />
				</button>
			</div>
			{#if inputError}
				<div class="mt-2 text-center text-lg font-semibold text-error">{inputError}</div>
			{/if}
			<div class="text-lg text-base-content">
				Calculated address is: <b class="text-primary">{walletAddress}</b>.
			</div>
			<div class="flex w-full max-w-md items-center gap-2">
				<input
					type="password"
					class="input w-full text-center input-secondary"
					bind:value={encryptionPassword}
					placeholder="Enter encryption password (optional)"
				/>
			</div>
			<button
				class="btn mt-4 w-full max-w-md btn-success"
				onclick={async () => {
					if (walletAddress !== '???') {
						const privateKey = inputKey;
						if (privateKey) {
							if (wallets.length > 0) {
								let canDecrypt = false;
								for (const w of wallets) {
									try {
										const decrypted = await AESGCMDecrypt(
											w.encryptedPrivateKey,
											encryptionPassword
										);
										if (decrypted) {
											canDecrypt = true;
											break;
										}
									} catch {
										console.log(
											'on creating a new wallet, failed to decrypt existing wallet to verify encryption password'
										);
										// Ignore and continue
									}
								}
								if (!canDecrypt) {
									inputError = 'Encryption password does not match existing wallets.';
									return;
								}
							}

							wallets.push({
								address: walletAddress,
								encryptedPrivateKey: await AESGCMEncrypt(privateKey, encryptionPassword)
							});

							const response = await api.login({ privatekey: privateKey });

							if (response.authed) {
								localStorage.setItem('wallets', JSON.stringify(wallets)); // only actually sets if authed

								location.href = '/';
							}
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
