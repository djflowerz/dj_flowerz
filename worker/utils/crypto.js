// worker/utils/crypto.js
// DJ Flowerz — Secure Crypto Utilities
// Implements SHA-256 salting for community marketplace auth

/**
 * Hashes a password with a salt and a global secret
 */
export async function hashPassword(password, salt, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a random salt string
 */
export function generateSalt(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple email validator
 */
export function isValidEmail(email) {
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
}
