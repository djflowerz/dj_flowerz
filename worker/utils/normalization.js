/**
 * Music Pool Normalization Utility
 * Handles URL fingerprinting, metadata cleaning, and rebranding.
 */

/**
 * Normalizes a URL to create a unique resource fingerprint.
 * Strips query parameters and common re-upload suffixes from the filename.
 * 
 * Example:
 * https://host.com/path/Song (1).mp3?token=abc -> /path/song.mp3
 */
export function normalizeUrlPath(urlStr) {
    if (!urlStr) return "";
    try {
        // Handle full URLs or relative paths
        const url = new URL(urlStr.startsWith('http') ? urlStr : `https://temp.co/${urlStr}`);
        let path = url.pathname;
        
        // 1. Decode URI components
        path = decodeURIComponent(path);
        
        // 2. Strip common re-upload suffixes from the end of the filename (before extension)
        // Matches: " (1)", " (2)", "-1", "-2", "_1", "_2", etc.
        // We do this BEFORE stripping extension to be precise.
        path = path.replace(/[\s\-_]\(\d+\)(\.[a-z0-9]+)$/i, '$1'); // "Song (1).mp3" -> "Song.mp3"
        path = path.replace(/[\s\-_]\d+(\.[a-z0-9]+)$/i, '$1');      // "Song-1.mp3" -> "Song.mp3"
        
        // 3. For fingerprinting, we also strip extension to treat Audio and Video clones as the same version
        // BUT we'll keep that for the consolidation logic pass. 
        // Here we just want a clean canonical path.
        
        return path.toLowerCase().trim();
    } catch (e) {
        return urlStr.toLowerCase().trim();
    }
}

/**
 * Strips noise from titles and artists and applies rebranding.
 */
export function cleanMetadata(text) {
    if (!text) return "";
    
    let cleaned = text;
    
    // 1. Comprehensive Rebranding
    // Replaces all variants of "VickNick" with "Flowerz" or "DJ Flowerz"
    const rebrandRules = [
        { regex: /dj[-_\s]*vick[-_\s]*nick/gi, replacement: 'DJ Flowerz' },
        { regex: /vick[-_\s]*nick/gi, replacement: 'Flowerz' },
        { regex: /Reggae\s+Fussion/gi, replacement: 'Reggae Fusion' },
        { regex: /Reggaetone/gi, replacement: 'Reggaeton' }
    ];

    for (const rule of rebrandRules) {
        cleaned = cleaned.replace(rule.regex, rule.replacement);
    }
    
    // 2. Strip "Copy" suffixes common in Windows/Mac re-uploads
    cleaned = cleaned.replace(/\s\(\d+\)$/g, ''); // "Song (1)" -> "Song"
    cleaned = cleaned.replace(/[\s\-_]\d+$/g, '');  // "Song-1" -> "Song"
    
    return cleaned.trim();
}

/**
 * Extracts version info from a title and returns the cleaned base title and the version name.
 */
export function extractVersionInfo(title) {
    const originalTitle = title || "";
    let baseTitle = cleanMetadata(originalTitle);
    let versionName = "Original";
    
    // Common tags to extract
    const tags = [
        { regex: /\((remix|rmx)\)/i, label: "Remix" },
        { regex: /\((intro|int)\)/i, label: "Intro" },
        { regex: /\((edit|short edit)\)/i, label: "Edit" },
        { regex: /\((clean|tv clean)\)/i, label: "Clean" },
        { regex: /\((dirty|explicit)\)/i, label: "Dirty" },
        { regex: /\((instrumental|inst)\)/i, label: "Instrumental" },
        { regex: /\((acapella|acap)\)/i, label: "Acapella" },
        { regex: /\((extended|extendz)\)/i, label: "Extended" }
    ];
    
    const foundLabels = [];
    
    for (const tag of tags) {
        if (tag.regex.test(baseTitle)) {
            foundLabels.push(tag.label);
            baseTitle = baseTitle.replace(tag.regex, '').trim();
        }
    }
    
    // Handle combined labels like (Remix + Edit + Intro)
    if (foundLabels.length > 0) {
        // Sort for deterministic naming
        versionName = foundLabels.sort().join(' + ');
    } else if (originalTitle.includes('+')) {
        // Fallback for already combined strings
        const plusMatch = originalTitle.match(/\(([^)]*\+[^)]*)\)/);
        if (plusMatch) {
            versionName = plusMatch[1].trim();
            baseTitle = baseTitle.replace(plusMatch[0], '').trim();
        }
    }
    
    // Remove trailing dashes/underscores after extraction
    baseTitle = baseTitle.replace(/[-_]$/, '').trim();
    
    return { baseTitle, versionName };
}

/**
 * Generates a deterministic song fingerprint for grouping variants.
 */
export function getSongFingerprint(artist, title) {
    const { baseTitle } = extractVersionInfo(title);
    const cleanArtist = cleanMetadata(artist);
    
    const str = `${cleanArtist.toLowerCase()}_${baseTitle.toLowerCase()}`.replace(/[^a-z0-9]/g, '_');
    
    // Simple hash for consistency
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return 'song_' + Math.abs(hash);
}
