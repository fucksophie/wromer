<script lang="ts">
	import type { Wallet } from '$lib/types';
	import { calculateAddress, getKristAddressRegexV2, KristApi } from 'krist';
	import { verified } from '$lib';

	import Fa from 'svelte-fa';
	import {
		faPaperPlane,
		faExclamationCircle,
		faCheckCircle
	} from '@fortawesome/free-solid-svg-icons';
	import { SvelteMap } from 'svelte/reactivity';
	import { AESGCMDecrypt } from './aes';

	interface Props {
		wallets?: Wallet[];
		contacts?: { address: string; description: string }[];
		apiUrl?: string;
		// Preset values
		toAddress?: string;
		toType?: 'dropdown' | 'manual';
		amount?: string;
		metadata?: string;
		// Callbacks
		onSuccess?: (txId: number, amount: number, recipient: string) => void;
		onError?: (error: string) => void;
		// Styling
		class?: string;
		title?: string;
		showTitle?: boolean;
		encryptionPassword?: string;
		dencryptionModal?: boolean;
	}

	let {
		wallets = [],
		contacts = [],
		apiUrl = 'https://kromer.reconnected.cc/api/krist/',
		toAddress = '',
		toType = 'dropdown',
		amount = '',
		metadata = '',
		onSuccess,
		onError,
		class: className = '',
		title = 'Send KRO',
		showTitle = true,
		encryptionPassword = '',
		dencryptionModal = $bindable()
	}: Props = $props();

	const api = new KristApi({
		syncNode: apiUrl
	});

	const send = $state({
		from: {
			type: 'wallet' as 'wallet' | 'private',
			walletAddress: '',
			private: {
				key: '',
				valid: false,
				error: '',
				address: ''
			}
		},
		to: {
			type: toType,
			dropdown: toAddress && toType === 'dropdown' ? toAddress : '',
			manual: toAddress && toType === 'manual' ? toAddress : ''
		},
		amount: amount,
		metadata: metadata,
		status: {
			sending: false,
			error: '',
			success: ''
		}
	});

	let selectedWallet: Wallet | undefined = $state();
	let selectedWalletBalance: number | undefined = $state();

	const regex = getKristAddressRegexV2('k');

	const verifiedList = Object.entries(verified).map(([address, label]) => ({
		address,
		label
	}));

	const recipientDropdownList = $derived(() => {
		const combined = [
			...verifiedList.map((v) => ({
				address: v.address,
				label: `✔️ ${v.label} (${v.address})`
			})),
			...contacts.map((c) => ({
				address: c.address,
				label: `📒 ${c.description} (${c.address})`
			})),
			...wallets.map((c) => ({
				address: c.address,
				label: `😊 Your wallet (${c.address})`
			}))
		];
		const map = new SvelteMap<string, { address: string; label: string }>();
		for (const item of combined) {
			map.set(item.address, item);
		}
		return Array.from(map.values());
	});

	$effect(() => {
		if (send.from.type === 'wallet' && send.from.walletAddress) {
			selectedWallet = wallets.find((w) => w.address === send.from.walletAddress);
			if (selectedWallet) {
				api
					.getAddress(selectedWallet.address)
					.then((info) => {
						selectedWalletBalance = info.balance;
					})
					.catch(() => {
						selectedWalletBalance = undefined;
					});
			} else {
				selectedWalletBalance = undefined;
			}
		} else {
			selectedWallet = undefined;
			selectedWalletBalance = undefined;
		}
	});
	async function validatePrivateKey() {
		send.from.private.error = '';
		send.from.private.valid = false;
		if (!send.from.private.key) return;
		try {
			const response = await api.login({
				privatekey: send.from.private.key
			});

			if (response.authed) {
				send.from.private.valid = true;
			} else {
				send.from.private.error = 'Invalid private key.';
				send.from.private.valid = false;
			}
		} catch (err: unknown) {
			// @ts-expect-error: ...
			send.from.private.error = err?.message || 'Invalid private key.';
			send.from.private.valid = false;
		}
	}

	$effect(() => {
		async function doAsync() {
			if (send.from.type === 'private' && send.from.private.valid && send.from.private.key) {
				try {
					const [address] = await calculateAddress(send.from.private.key, undefined, 'api');
					send.from.private.address = address;
				} catch {
					send.from.private.address = '';
				}
			} else {
				send.from.private.address = '';
			}
		}
		doAsync();
	});

	function getRecipientAddress(): string {
		if (send.to.type === 'dropdown') {
			return send.to.dropdown;
		} else {
			return send.to.manual;
		}
	}

	async function sendKRO() {
		send.status.error = '';
		send.status.success = '';
		const amountNum = Number(send.amount);
		const recipient = getRecipientAddress();

		if (
			(send.from.type === 'wallet' && !send.from.walletAddress) ||
			(send.from.type === 'private' && (!send.from.private.key || !send.from.private.valid))
		) {
			const error = 'Please select a valid sender wallet or enter a valid private key.';
			send.status.error = error;
			onError?.(error);
			return;
		}
		if (!recipient) {
			const error = 'Please select or enter a recipient address.';
			send.status.error = error;
			onError?.(error);
			return;
		}
		if (isNaN(amountNum) || amountNum <= 0) {
			const error = 'Amount must be a positive number.';
			send.status.error = error;
			onError?.(error);
			return;
		}
		if (
			send.from.type === 'wallet' &&
			selectedWalletBalance !== undefined &&
			amountNum > selectedWalletBalance
		) {
			const error = 'Insufficient balance.';
			send.status.error = error;
			onError?.(error);
			return;
		}
		if (send.from.type === 'private' && !send.from.private.address) {
			const error = 'Could not determine address for private key.';
			send.status.error = error;
			onError?.(error);
			return;
		}
		send.status.sending = true;

		let privatekey = '';

		if (send.from.type === 'wallet') {
			const wallet = wallets.find((w) => w.address === send.from.walletAddress);
			if (!wallet) {
				const error = 'Wallet not found.';
				send.status.error = error;
				send.status.sending = false;
				onError?.(error);
				return;
			}
			if (!encryptionPassword) {
				send.status.error = 'You have not entered an encryption password. Enter one and try again.';
				send.status.sending = false;
				dencryptionModal = true;
				return;
			}
			privatekey = (await AESGCMDecrypt(wallet.encryptedPrivateKey, encryptionPassword))!; // if encryptionPassword is populated, it works
		} else {
			privatekey = send.from.private.key;
		}

		try {
			const tx = await api.makeTransaction(recipient, amountNum, {
				privatekey: privatekey,
				walletFormat: 'api',
				metadata: send.metadata && send.metadata.trim().length > 0 ? send.metadata : undefined
			});
			const successMsg = `Sent ${amountNum} KRO to ${recipient}. Transaction ID: ${tx.id}`;
			send.status.success = successMsg;
			send.amount = '';
			send.metadata = '';
			send.to.dropdown = '';
			send.to.manual = '';
			onSuccess?.(tx.id, amountNum, recipient);
		} catch (err: unknown) {
			// @ts-expect-error: ...
			const error = err?.message || 'Failed to send transaction.';
			send.status.error = error;
			onError?.(error);
		}
		send.status.sending = false;
	}

	export function setToAddress(address: string, type: 'dropdown' | 'manual' = 'manual') {
		send.to.type = type;
		if (type === 'dropdown') {
			send.to.dropdown = address;
			send.to.manual = '';
		} else {
			send.to.manual = address;
			send.to.dropdown = '';
		}
	}

	export function setAmount(newAmount: string) {
		send.amount = newAmount;
	}

	export function setMetadata(newMetadata: string) {
		send.metadata = newMetadata;
	}

	export function clearForm() {
		send.amount = '';
		send.metadata = '';
		send.to.dropdown = '';
		send.to.manual = '';
		send.status.error = '';
		send.status.success = '';
	}

	export function getFormData() {
		return {
			from: {
				type: send.from.type,
				address: send.from.type === 'wallet' ? send.from.walletAddress : send.from.private.address
			},
			to: getRecipientAddress(),
			amount: send.amount,
			metadata: send.metadata
		};
	}
</script>

<div class="card border border-base-200 bg-neutral shadow {className}">
	<div class="card-body">
		{#if showTitle}
			<h3 class="mb-2 text-xl font-bold text-primary">{title}</h3>
		{/if}
		<!-- From: Wallet or Private Key -->
		<div class="mb-4 flex flex-col gap-2">
			<div class="font-semibold">From:</div>
			<div class="flex gap-2">
				<label class="flex items-center gap-1">
					<input
						type="radio"
						name="fromType-{Math.random().toString()}"
						value="wallet"
						bind:group={send.from.type}
						disabled={send.status.sending}
					/>
					<span>Wallet</span>
				</label>
				<label class="flex items-center gap-1">
					<input
						type="radio"
						name="fromType-{Math.random().toString()}"
						value="private"
						bind:group={send.from.type}
						disabled={send.status.sending}
					/>
					<span>Private Key</span>
				</label>
			</div>
			{#if send.from.type === 'wallet'}
				<select
					class="select w-full select-primary"
					bind:value={send.from.walletAddress}
					disabled={send.status.sending}
				>
					<option value="" disabled selected>Select your wallet</option>
					{#each wallets as wallet (wallet.address)}
						<option value={wallet.address}>{wallet.address}</option>
					{/each}
				</select>
				{#if selectedWallet}
					<div class="text-base-content opacity-80">
						Balance for <span class="font-mono">{selectedWallet.address}</span>:
						{#if selectedWalletBalance !== undefined}
							<span class="font-bold text-success">{selectedWalletBalance} KRO</span>
						{:else}
							<span class="loading loading-xs loading-spinner text-primary"></span>
						{/if}
					</div>
				{/if}
			{:else}
				<input
					type="text"
					class="input w-full input-primary"
					placeholder="Enter private key"
					bind:value={send.from.private.key}
					disabled={send.status.sending}
					onblur={validatePrivateKey}
					onchange={validatePrivateKey}
				/>
				{#if send.from.private.key}
					<button
						class="btn mt-1 btn-outline btn-xs btn-info"
						type="button"
						onclick={validatePrivateKey}
						disabled={send.status.sending}
					>
						Validate Private Key
					</button>
				{/if}
				{#if send.from.private.error}
					<div class="mt-1 text-sm text-error">{send.from.private.error}</div>
				{:else if send.from.private.valid}
					<div class="mt-1 text-sm text-success">
						Private key valid! Address: <span class="font-mono">{send.from.private.address}</span>
					</div>
				{/if}
			{/if}
		</div>
		<div class="mb-4 flex flex-col gap-2">
			<div class="font-semibold">To:</div>
			<div class="flex gap-2">
				<label class="flex items-center gap-1">
					<input
						type="radio"
						name="toType-{Math.random().toString()}"
						value="dropdown"
						bind:group={send.to.type}
						disabled={send.status.sending}
					/>
					<span>Choose from list</span>
				</label>
				<label class="flex items-center gap-1">
					<input
						type="radio"
						name="toType-{Math.random().toString()}"
						value="manual"
						bind:group={send.to.type}
						disabled={send.status.sending}
					/>
					<span>Enter address</span>
				</label>
			</div>
			{#if send.to.type === 'dropdown'}
				<select
					class="select w-full select-accent"
					bind:value={send.to.dropdown}
					disabled={send.status.sending}
				>
					<option value="" disabled selected>Select recipient</option>
					{#each recipientDropdownList() as rec (rec.address)}
						<option value={rec.address}>{rec.label}</option>
					{/each}
				</select>
			{:else}
				<input
					type="text"
					class="input w-full input-accent"
					placeholder="Enter recipient address"
					bind:value={send.to.manual}
					disabled={send.status.sending}
				/>
				{#if send.to.manual && !regex.test(send.to.manual)}
					<div class="mt-1 text-sm text-error">Invalid address format.</div>
				{/if}
			{/if}
		</div>
		<div class="mb-4 flex flex-col gap-2">
			<div class="font-semibold">Amount:</div>
			<input
				type="number"
				class="input w-full input-primary"
				placeholder="Amount"
				bind:value={send.amount}
				min="0"
				step="1"
				disabled={send.status.sending}
			/>
		</div>
		<div class="mb-4 flex flex-col gap-2">
			<div class="font-semibold">Metadata (optional):</div>
			<input
				type="text"
				class="input w-full input-accent"
				placeholder="Optional metadata (CommonMeta or custom)"
				bind:value={send.metadata}
				disabled={send.status.sending}
			/>
			<small class="text-base-content opacity-70"
				>You can attach metadata to your transaction (optional).</small
			>
		</div>
		<button class="btn w-full btn-primary" onclick={sendKRO} disabled={send.status.sending}>
			{#if send.status.sending}
				<span class="loading loading-sm loading-spinner"></span>
				Sending...
			{:else}
				<Fa icon={faPaperPlane} class="mr-2" />
				Send
			{/if}
		</button>
		{#if send.status.error}
			<div class="mt-2 alert alert-error">
				<Fa icon={faExclamationCircle} class="mr-2" />
				{send.status.error}
			</div>
		{/if}
		{#if send.status.success}
			<div class="mt-2 alert alert-success">
				<Fa icon={faCheckCircle} class="mr-2" />
				{send.status.success}
			</div>
		{/if}
	</div>
</div>
