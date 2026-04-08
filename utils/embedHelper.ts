
/**
 * Utility to convert various audio/video URLs to embeddable iframe URLs
 */
export const getEmbedUrl = (url: string = ''): string | null => {
    if (!url) return null;

    // Hearthis.at (Normalize mobile URLs)
    let processedUrl = url.replace('m.hearthis.at', 'hearthis.at');

    if (processedUrl.includes('hearthis.at')) {
        // Format: https://hearthis.at/user/title/
        // Embed: https://hearthis.at/user/title/embed/?h=000000&color=7b1fa2&style=2&block_size=2&block_color=6200ea&background=1&transparent=0&autostart=0&hide_tracklist=0
        let cleanUrl = processedUrl.split('?')[0];
        if (!cleanUrl.endsWith('/')) cleanUrl += '/';
        return `${cleanUrl}embed/?h=000000&color=7b1fa2&style=2&block_size=2&block_color=6200ea&background=1&transparent=0&autostart=0&hide_tracklist=0`;
    }

    // YouTube
    if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    // SoundCloud
    if (url.includes('soundcloud.com')) {
        // SoundCloud embed requires encoded URL
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
    }

    // Mixcloud
    if (url.includes('mixcloud.com')) {
        const path = url.split('mixcloud.com/')[1];
        return `https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=%2F${encodeURIComponent(path)}%2F`;
    }

    return null;
};

export const isMediafire = (url: string = ''): boolean => {
    return url.toLowerCase().includes('mediafire.com');
};

export const isDirectLink = (url: string = ''): boolean => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp3') || 
           cleanUrl.endsWith('.wav') || 
           cleanUrl.endsWith('.m4a') || 
           cleanUrl.endsWith('.mp4') || 
           cleanUrl.includes('r2.cloudflarestorage.com') ||
           cleanUrl.includes('pub-') && cleanUrl.includes('.r2.dev');
};

export const isStreamable = (url: string = ''): boolean => {
    if (!url) return false;
    return url.includes('hearthis.at') ||
        url.includes('youtube.com') ||
        url.includes('youtu.be') ||
        url.includes('soundcloud.com') ||
        url.includes('mixcloud.com') ||
        isDirectLink(url);
};
