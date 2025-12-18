import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class EncryptionService {

    constructor() { }

    /**
     * Generates a random hex key of the specified length (number of bytes).
     * @param lengthBytes Number of bytes for the key
     */
    generateKey(lengthBytes: number): string {
        const array = new Uint8Array(lengthBytes);
        crypto.getRandomValues(array);
        return this.toHex(array);
    }

    /**
     * Encrypts the plaintext using the provided key (XOR).
     * The key must be at least as long as the plaintext (in bytes).
     */
    encrypt(plaintext: string, keyHex: string): string {
        const textBytes = new TextEncoder().encode(plaintext);
        const keyBytes = this.fromHex(keyHex);

        if (keyBytes.length < textBytes.length) {
            throw new Error('Key length must be at least as long as the message.');
        }

        const cipherBytes = new Uint8Array(textBytes.length);
        for (let i = 0; i < textBytes.length; i++) {
            cipherBytes[i] = textBytes[i] ^ keyBytes[i];
        }

        return this.toHex(cipherBytes);
    }

    /**
     * Decrypts the ciphertext using the provided key (XOR).
     */
    decrypt(cipherHex: string, keyHex: string): string {
        const cipherBytes = this.fromHex(cipherHex);
        const keyBytes = this.fromHex(keyHex);

        // In OTP, we just XOR back. Length of output is length of cipher.
        // We only need enough key bytes to cover the cipher.
        if (keyBytes.length < cipherBytes.length) {
            throw new Error('Key incorrect.');
        }

        const plainBytes = new Uint8Array(cipherBytes.length);
        for (let i = 0; i < cipherBytes.length; i++) {
            plainBytes[i] = cipherBytes[i] ^ keyBytes[i];
        }

        return new TextDecoder().decode(plainBytes);
    }

    private toHex(bytes: Uint8Array): string {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private fromHex(hex: string): Uint8Array {
        if (!hex) return new Uint8Array(0);
        // Remove spaces
        let cleanHex = hex.replace(/\s+/g, '');
        // Remove 0x prefix if present (case insensitive)
        if (cleanHex.toLowerCase().startsWith('0x')) {
            cleanHex = cleanHex.slice(2);
        }

        if (cleanHex.length % 2 !== 0) {
            throw new Error('Invalid hex string');
        }
        const bytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
        }
        return bytes;
    }
}
