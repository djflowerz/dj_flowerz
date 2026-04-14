
/**
 * Generates a JIT signature for a file download.
 * signature = HMAC-SHA256(secret, userId + versionId + expiry)
 */
export async function signDownload(secret, userId, versionId, ttlSeconds = 3600) {
    const encoder = new TextEncoder();
    const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
    const message = `${userId}:${versionId}:${expiry}`;
    
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const sigHex = Array.from(new Uint8Array(sigBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
        
    return { sig: sigHex, exp: expiry };
}

/**
 * Verifies a JIT signature.
 */
export async function verifyDownload(secret, userId, versionId, sig, exp) {
    const encoder = new TextEncoder();
    const now = Math.floor(Date.now() / 1000);
    
    if (now > parseInt(exp)) return false;
    
    const message = `${userId}:${versionId}:${exp}`;
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );
    
    const sigBuffer = new Uint8Array(sig.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    return await crypto.subtle.verify('HMAC', key, sigBuffer, encoder.encode(message));
}
