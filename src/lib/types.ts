export interface Wallet {
	encryptedPrivateKey: string;
	address: string;
}
/**
 * @warning Use Wallet instead.
 */
export interface OldWallet {
	private_key?: string;
	address: string;
}
