
import { supabase } from './supabase';

interface DownloadOptions {
    fileName?: string;
    trackId?: string;
    artist?: string;
    title?: string;
    type?: 'track' | 'mixtape_audio' | 'mixtape_video' | 'digital_product';
    orderId?: string;
}

/**
 * Securely triggers a file download via the server proxy.
 * This prevents exposure of direct asset URLs and enforces limits.
 */
export async function downloadFileSecurely(url: string, options: DownloadOptions = {}) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token && !options.orderId) {
            throw new Error("Authentication required for downloads.");
        }

        // Construct proxy URL
        const proxyUrl = new URL('/api/pool/download', window.location.origin);
        proxyUrl.searchParams.set('url', url);
        if (options.fileName) proxyUrl.searchParams.set('name', options.fileName);
        if (options.trackId) proxyUrl.searchParams.set('trackId', options.trackId);
        if (options.artist) proxyUrl.searchParams.set('artist', options.artist);
        if (options.title) proxyUrl.searchParams.set('title', options.title);
        if (options.type) proxyUrl.searchParams.set('type', options.type);
        if (options.orderId) proxyUrl.searchParams.set('orderId', options.orderId);

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                fileName: options.fileName,
                trackId: options.trackId,
                artist: options.artist,
                title: options.title,
                type: options.type,
                orderId: options.orderId
            })
        };

        if (token) {
            (fetchOptions.headers as any)['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/pool/download', fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Download failed with status ${response.status}`);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;

        // Use filename from Content-Disposition if possible, otherwise fallback
        const contentDisposition = response.headers.get('Content-Disposition');
        let finalFileName = options.fileName;
        if (contentDisposition && contentDisposition.includes('filename=')) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match) finalFileName = decodeURIComponent(match[1]);
        }

        link.download = finalFileName || url.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        return { success: true };
    } catch (error: any) {
        console.error('Secure download failed:', error);
        alert(error.message || "Download failed. Please try again.");
        return { success: false, error: error.message };
    }
}

/**
 * Legacy download helper (fallback)
 */
export async function downloadFile(url: string, fileName?: string) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName || url.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Download failed:', error);
        window.open(url, '_blank');
    }
}
