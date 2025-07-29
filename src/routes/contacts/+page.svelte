<script lang="ts">
	import { getKristAddressRegexV2 } from 'krist';

	import Fa from 'svelte-fa';
	import { faPlus, faTrash, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

	let contacts: { address: string; description: string }[] = $state(
		JSON.parse(localStorage.getItem('contacts') || '[]')
	);

	let newContact = $state({
		address: '',
		description: '',
		error: '',
		success: ''
	});

	const addressRegex = getKristAddressRegexV2('k');

	function removeContact(address: string) {
		contacts = contacts.filter((c) => c.address !== address);
		localStorage.setItem('contacts', JSON.stringify(contacts));
	}

	function addContact() {
		newContact.error = '';
		newContact.success = '';
		if (!newContact.address || !newContact.description) {
			newContact.error = 'Please fill in both address and description.';
			return;
		}
		if (!addressRegex.test(newContact.address)) {
			newContact.error = 'Invalid address format.';
			return;
		}
		if (contacts.some((c) => c.address === newContact.address)) {
			newContact.error = 'Contact already exists.';
			return;
		}
		contacts.push({
			address: newContact.address,
			description: newContact.description
		});
		localStorage.setItem('contacts', JSON.stringify(contacts));
		newContact.success = 'Contact added!';
		newContact.address = '';
		newContact.description = '';
	}

	function sendKro(address: string) {
		window.location.href = `/?to=${address}`;
	}
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center rounded-xl bg-base-200 p-8">
	<div>
		<h2 class="mb-6 text-center text-3xl font-bold text-primary">Contacts</h2>
		<hr class="mb-6" />

		<!-- Add Contact Form -->
		<div class="card mb-8 border border-base-300 bg-base-100 shadow">
			<div class="card-body">
				<h3 class="mb-2 text-xl font-bold text-primary">Add Contact</h3>
				<div class="flex flex-col gap-2 md:flex-row md:items-center">
					<input
						type="text"
						class="input-bordered input w-full input-primary md:max-w-xs"
						placeholder="Address"
						bind:value={newContact.address}
						disabled={Boolean(newContact.success)}
					/>
					<input
						type="text"
						class="input-bordered input w-full input-accent md:max-w-xs"
						placeholder="Description"
						bind:value={newContact.description}
						disabled={Boolean(newContact.success)}
					/>
					<button
						class="btn btn-success"
						onclick={addContact}
						disabled={Boolean(newContact.success)}
					>
						<Fa icon={faPlus} class="mr-2" />
						Add
					</button>
				</div>
				{#if newContact.error}
					<div class="mt-2 alert alert-error">{newContact.error}</div>
				{/if}
				{#if newContact.success}
					<div class="mt-2 alert alert-success">{newContact.success}</div>
				{/if}
			</div>
		</div>

		<!-- Contacts List -->
		{#if contacts.length === 0}
			<div class="mb-8 alert alert-info shadow-lg">
				<div>
					<span class="text-lg font-semibold">No contacts found!</span>
					<p class="mt-2 text-base-content">You haven't added any contacts yet.</p>
				</div>
			</div>
		{:else}
			<ul class="mb-8 grid gap-4">
				{#each contacts as contact (contact.address)}
					<li>
						<div
							class="card flex items-center border border-base-300 bg-base-100 px-6 py-4 shadow transition-all duration-200 hover:border-primary hover:shadow-lg"
						>
							<div class="flex-1">
								<div class="text-lg font-semibold text-primary">{contact.description}</div>
								<div class="font-mono text-sm text-base-content opacity-70">{contact.address}</div>
							</div>
							<div class="ml-4 flex flex-row gap-2">
								<button
									aria-label="Remove contact"
									class="btn btn-outline btn-sm btn-error"
									onclick={() => removeContact(contact.address)}
									title="Remove contact"
								>
									<Fa icon={faTrash} />
								</button>
								<button
									aria-label="Send KRO"
									class="btn btn-outline btn-sm btn-primary"
									onclick={() => sendKro(contact.address)}
									title="Send KRO"
								>
									<Fa icon={faPaperPlane} />
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
