<script lang="ts">
	import type { OldWallet, Wallet } from '$lib/types';
	import { getKristAddressRegexV2 } from 'krist';
	import SendWidget from '$lib/SendWidget.svelte';

	import Fa from 'svelte-fa';
	import {
		faCoins,
		faList,
		faEyeSlash,
		faPaperPlane,
		faPeopleGroup,
		faTrash,
		faUndo
	} from '@fortawesome/free-solid-svg-icons';
	import { AESGCMDecrypt, AESGCMEncrypt } from '$lib/aes';
	import { api } from '$lib';
	import { onMount } from 'svelte';

	const wallets: Wallet[] = $state(JSON.parse(localStorage.getItem('wallets') || '[]'));
	const contacts: { address: string; description: string }[] = $state(
		JSON.parse(localStorage.getItem('contacts') || '[]')
	);

	const ui = $state({
		inputAddress: '',
		addressError: '',
		showSendKRO: false
	});

	let showBackupModal = $state(false);
	let backupString = $state('');
	let encryptPreviousWalletsModal = $state(false);
	let totalBalance: number | undefined = $state(undefined);
	let recentlyDeleted: { wallet: Wallet; deletedAt: number }[] = $state([]);

	function openBackupModal() {
		backupString = `${JSON.stringify(Object.entries(localStorage))}.map(z=>localStorage.setItem(z[0],z[1]));location.reload()`;
		showBackupModal = true;
	}
	function closeBackupModal() {
		showBackupModal = false;
	}

	let sendWidgetToAddress = $state('');
	let sendWidgetToType: 'dropdown' | 'manual' = $state('dropdown');
	let sendWidgetAmount = $state('');
	let sendWidgetMetadata = $state('');
	let encryptionPassword = $state('');

	const regex = getKristAddressRegexV2('k');
	let dencryptionModal = $state(false);

	onMount(async () => {
		async function execute(wallet: Wallet) {
			const data = await api.getAddress(wallet.address);
			console.log('get-total-balance data[fetched] = ' + wallet.address);
			return data.balance;
		}
		const data = await Promise.all(wallets.map((z) => execute(z)));
		totalBalance = data.reduce((acc, w) => acc + w, 0);
	});

	$effect(() => {
		if (wallets.find((z) => (z as unknown as OldWallet).private_key as string)) {
			encryptPreviousWalletsModal = true;
		}
	});

	$effect(() => {
		if (!ui.inputAddress) {
			ui.addressError = '';
		} else if (regex.test(ui.inputAddress)) {
			ui.addressError = '';
		} else {
			ui.addressError = 'Invalid address format.';
		}
	});

	function openAddress() {
		if (ui.inputAddress && regex.test(ui.inputAddress)) {
			location.href = `/wallet/${ui.inputAddress}`;
		}
	}

	const params = new URLSearchParams(new URL(location.href).search);
	if (params.has('to')) {
		const toParam = params.get('to')!;
		if (regex.test(toParam)) {
			ui.showSendKRO = true;
			sendWidgetToAddress = toParam;
			sendWidgetToType = 'manual';
		}
	}
	if (params.has('amount')) {
		const amountParam = params.get('amount')!;
		const amountNum = Number(amountParam);
		if (!isNaN(amountNum) && amountNum > 0) {
			ui.showSendKRO = true;
			sendWidgetAmount = String(amountNum);
		}
	}
	if (params.has('metadata')) {
		ui.showSendKRO = true;
		sendWidgetMetadata = params.get('metadata')!;
	}

	function handleSendSuccess(txId: number) {
		console.log(`Transaction successful: ${txId}`);
	}

	function handleSendError(error: string) {
		console.error('Send error:', error);
	}

	function deleteWallet(address: string) {
		const idx = wallets.findIndex((w) => w.address === address);
		if (idx !== -1) {
			const [removed] = wallets.splice(idx, 1);
			localStorage.setItem('wallets', JSON.stringify(wallets));
			recentlyDeleted.unshift({ wallet: removed, deletedAt: Date.now() });
		}
	}

	function undoDelete(address: string) {
		const idx = recentlyDeleted.findIndex((d) => d.wallet.address === address);
		if (idx !== -1) {
			const [restored] = recentlyDeleted.splice(idx, 1);
			wallets.unshift(restored.wallet);
			localStorage.setItem('wallets', JSON.stringify(wallets));
		}
	}
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center rounded-xl p-8">
	<div>
		<div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<h2 class="text-3xl font-bold text-primary">Your Wallets</h2>
			<div class="flex flex-wrap gap-2">
				<a href="/wallet/rich" class="btn btn-outline btn-primary">
					<Fa icon={faCoins} class="mr-2" />
					Richest Addresses
				</a>
				<a href="/transactions" class="btn btn-outline btn-info">
					<Fa icon={faList} class="mr-2" />
					Latest Transactions
				</a>
				<a href="/contacts" class="btn btn-outline">
					<Fa icon={faPeopleGroup} class="mr-2" />
					Contacts
				</a>
				<!-- Backup Button -->
				<button class="btn btn-outline btn-warning" onclick={openBackupModal}> Backup </button>
			</div>
		</div>

		{#if showBackupModal}
			<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
				<div class="bg-neutral0 relative w-full max-w-lg rounded-lg p-6 shadow-lg">
					<h3 class="mb-2 text-xl font-bold text-warning">Backup Your Wallet Data</h3>
					<p class="mb-4 text-base-content">
						<strong class="text-warning">Warning:</strong> This backup contains strongly encrypted versions
						of your private keys. I would not reccomend sharing it, as it is still possible to crack
						them.
					</p>
					<p class="mb-2 text-base-content">
						To restore your wallet, paste this code into your browser's console on a new device.
					</p>
					<textarea
						class="textarea-bordered textarea mb-4 w-full font-mono text-xs"
						readonly
						rows="4"
						onfocus={(e) => (e.target as HTMLTextAreaElement).select()}>{backupString}</textarea
					>
					<div class="flex justify-end gap-2">
						<button class="btn btn-outline btn-sm" onclick={closeBackupModal}>Close</button>
					</div>
				</div>
			</div>
		{/if}
		{#if encryptPreviousWalletsModal}
			<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
				<div class="relative w-full max-w-lg rounded-lg bg-neutral p-6 shadow-lg">
					<h3 class="mb-2 text-xl font-bold text-error">Encrypt your wallets.</h3>
					<p class="mb-4 text-base-content">
						<strong class="text-error">Warning:</strong> If you forget your encryption password, you
						will lose the privatekeys.
					</p>
					<p class="mb-2 text-base-content">
						It is impossible to restore your wallet without the encryption password. This is a
						measure to improve security.
					</p>
					<input
						type="password"
						class="input-bordered input mb-4 w-full"
						placeholder="Enter encryption password"
						bind:value={encryptionPassword}
					/>
					<button
						class="btn btn-primary"
						onclick={async () => {
							for (const wallet of wallets) {
								if ((wallet as unknown as OldWallet).private_key) {
									wallet.encryptedPrivateKey = await AESGCMEncrypt(
										(wallet as unknown as OldWallet).private_key!,
										encryptionPassword
									);
									delete (wallet as unknown as OldWallet).private_key;
								}
							}
							localStorage.setItem('wallets', JSON.stringify(wallets));
							encryptPreviousWalletsModal = false;
							encryptionPassword = '';
						}}>Encrypt</button
					>
				</div>
			</div>
		{/if}

		{#if dencryptionModal && wallets.length != 0}
			<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
				<div class="relative w-full max-w-lg rounded-lg bg-neutral p-6 shadow-lg">
					<h3 class="mb-2 text-xl font-bold text-info">Decrypt your wallets!</h3>
					<p class="mb-2 text-base-content">
						Decrypt your wallets, if you wish to send transactions. If you do not, then close the
						window.
					</p>
					<input
						type="password"
						class="input-bordered input mb-4 w-full"
						placeholder="Enter dencryption password"
						bind:value={encryptionPassword}
					/>
					<button
						class="btn btn-primary"
						onclick={async () => {
							let isValid = false;
							for (const wallet of wallets) {
								if (await AESGCMDecrypt(wallet.encryptedPrivateKey, encryptionPassword)) {
									isValid = true;
									break;
								}
							}
							if (isValid) {
								dencryptionModal = false;
								// encryptionPassword stays populated. this is used in sendModal to send transactions
							} else {
								encryptionPassword = '';
							}
						}}>Decrypt</button
					>
					<button
						class="btn-danger btn"
						onclick={() => {
							encryptionPassword = '';
							dencryptionModal = false;
						}}>Cancel</button
					>
				</div>
			</div>
		{/if}
		<div class="mb-6 flex flex-col items-center justify-center gap-4">
			<input
				type="text"
				class="input w-full max-w-md bg-neutral text-center input-primary"
				bind:value={ui.inputAddress}
				placeholder="Enter wallet address"
			/>
			<button class="btn w-full max-w-md btn-primary" onclick={openAddress}> View Address </button>
			{#if ui.addressError}
				<div class="mt-2 text-center text-lg font-semibold text-error">{ui.addressError}</div>
			{/if}
		</div>

		<div class="mb-4 flex justify-center">
			<button
				class="btn btn-outline btn-primary"
				onclick={() => {
					if (!encryptionPassword && !ui.showSendKRO) {
						dencryptionModal = true;
					}
					ui.showSendKRO = !ui.showSendKRO;
				}}
				aria-expanded={ui.showSendKRO}
				aria-controls="send-kro-section"
			>
				{#if ui.showSendKRO}
					<Fa icon={faEyeSlash} class="mr-2" />Send KRO
				{:else}
					<Fa icon={faPaperPlane} class="mr-2" />Send KRO
				{/if}
			</button>
		</div>

		{#if ui.showSendKRO}
			<div id="send-kro-section" class="mb-8">
				<SendWidget
					{wallets}
					{contacts}
					toAddress={sendWidgetToAddress}
					toType={sendWidgetToType}
					amount={sendWidgetAmount}
					metadata={sendWidgetMetadata}
					onSuccess={handleSendSuccess}
					onError={handleSendError}
					{encryptionPassword}
					bind:dencryptionModal
				/>
			</div>
		{/if}

		{#if recentlyDeleted.length > 0}
			<div class="mb-6">
				{#each recentlyDeleted as del (del.wallet.address)}
					<div class="mb-2 alert flex items-center gap-4 alert-warning">
						<div>
							<span class="font-semibold">Wallet {del.wallet.address} deleted.</span>
							<span class="ml-2 text-sm text-error">Private key is unrecoverable after reload!</span
							>
						</div>
						<button
							class="btn ml-auto btn-outline btn-sm btn-success"
							onclick={() => undoDelete(del.wallet.address)}
						>
							<Fa icon={faUndo} class="mr-1" /> Undo
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<hr class="mb-6" />
		{#if wallets.length == 0}
			<div class="mb-8 alert alert-info shadow-lg">
				<div>
					<span class="text-lg font-semibold">No wallets found!</span>
					<p class="mt-2">
						You haven't created a wallet yet, so there's no information to display.
					</p>
					<p class="mt-2">
						<span class="font-medium">Create your first wallet by clicking&nbsp;</span>
						<a href="/wallet" class="link font-bold link-primary">here</a>.
					</p>
				</div>
			</div>
		{:else}
			<div class="mb-8 alert alert-info shadow-lg">
				<div>
					<span class="text-lg font-semibold">Create a new wallet?</span>
					<p class="mt-2">
						<span class="font-medium">Create your wallet by clicking</span>
						<a href="/wallet" class="link font-bold link-primary">here</a>.
					</p>
				</div>
			</div>
			{#if totalBalance}
				<div class="mb-4">
					<div class="alert flex items-center gap-4 alert-info">
						<span class="font-semibold">Total Balance:</span>
						<span class="text-lg text-primary">{totalBalance} KRO</span>
					</div>
				</div>
			{/if}
			<ul class="grid gap-4">
				{#each wallets as wallet (wallet.address)}
					<li class="relative">
						<a
							href="/wallet/{wallet.address}"
							class="card flex items-center border border-base-300 bg-neutral px-6 py-4 shadow transition-all duration-200 hover:border-primary hover:shadow-lg"
						>
							<div class="flex items-center gap-4">
								<div>
									<div class="text-lg font-semibold text-primary">
										{wallet.address}
									</div>
									<div class="text-sm text-base-content opacity-70">View wallet details</div>
								</div>
							</div>
							<button
								class="btn absolute top-2 right-2 btn-sm btn-error"
								title="Delete wallet"
								onclick={(e) => {
									e.preventDefault();
									deleteWallet(wallet.address);
								}}
							>
								<Fa icon={faTrash} class="mr-1" /> Delete
							</button>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
