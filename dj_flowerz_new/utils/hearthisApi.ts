
interface HearthisTrack {
    id: string;
    title: string;
    description: string;
    duration: string;
    artwork_url: string;
    stream_url: string;
    preview_url: string;
    download_url: string;
    waveform_data: string;
    waveform_url: string;
}

const getEnv = (key: string, fallback: string): string => {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key] as string;
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        // @ts-ignore
        return import.meta.env[key] as string;
    }
    return fallback;
};

const RAPIDAPI_KEY = getEnv("VITE_RAPIDAPI_KEY", getEnv("REACT_APP_RAPIDAPI_KEY", ''));
const RAPIDAPI_HOST = getEnv("VITE_RAPIDAPI_HOST", getEnv("REACT_APP_RAPIDAPI_HOST", 'hearthis-at.p.rapidapi.com'));

export const fetchHearthisTrack = async (artist: string, track: string): Promise<HearthisTrack | null> => {
    try {
        const response = await fetch(`https://${RAPIDAPI_HOST}/${artist}/${track}/`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Hearthis track: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching Hearthis track:', error);
        return null;
    }
};

export const parseHearthisUrl = (url: string): { artist: string; track: string } | null => {
    // Expected format: https://hearthis.at/artist/track/
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname !== 'hearthis.at') return null;

        const paths = urlObj.pathname.split('/').filter(p => p !== '');
        if (paths.length < 2) return null;

        return {
            artist: paths[0],
            track: paths[1]
        };
    } catch (e) {
        return null;
    }
};
