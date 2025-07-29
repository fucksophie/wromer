export async function AESGCMEncrypt(plaintext: string, password: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const alg = { name: 'AES-GCM', iv: iv };
	const key = await crypto.subtle.importKey(
		'raw',
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)),
		alg,
		false,
		['encrypt']
	);

	return btoa(
		Array.from(iv)
			.map((b) => String.fromCharCode(b))
			.join('') +
			Array.from(
				new Uint8Array(await crypto.subtle.encrypt(alg, key, new TextEncoder().encode(plaintext)))
			)
				.map((byte) => String.fromCharCode(byte))
				.join('')
	);
}

export async function AESGCMDecrypt(
	ciphertext: string,
	password: string
): Promise<string | undefined> {
	const alg = {
		name: 'AES-GCM',
		iv: new Uint8Array(Array.from(atob(ciphertext).slice(0, 12)).map((ch) => ch.charCodeAt(0)))
	};

	const key = await crypto.subtle.importKey(
		'raw',
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)),
		alg,
		false,
		['decrypt']
	);

	try {
		const plainBuffer = await crypto.subtle.decrypt(
			alg,
			key,
			new Uint8Array(Array.from(atob(ciphertext).slice(12)).map((ch) => ch.charCodeAt(0)))
		);
		return new TextDecoder().decode(plainBuffer);
	} catch {
		return undefined;
	}
}
