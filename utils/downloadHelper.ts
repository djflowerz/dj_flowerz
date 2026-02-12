
/**
 * Helper to force a file download for cross-origin URLs.
 * This is the most reliable way to force a download for a link you don't own.
 * It downloads the data in the background and then triggers a "Save As" event.
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
        // Fallback: Open in new tab if fetch is blocked by CORS
        window.open(url, '_blank');
    }
}
