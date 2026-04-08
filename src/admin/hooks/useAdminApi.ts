import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || '';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function useAdminApi() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);

    const request = useCallback(async (path: string, options: RequestInit = {}, silent = false) => {
        setLoading(true);
        let lastError: any;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const token = session?.access_token || '';
                const headers = new Headers(options.headers);
                headers.set('Authorization', `Bearer ${token}`);
                if (!headers.has('Content-Type')) {
                    headers.set('Content-Type', 'application/json');
                }

                const res = await fetch(`${WORKER_URL}${path}`, {
                    ...options,
                    headers
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: res.statusText }));
                    const msg = err.error || 'Request failed';

                    // Retry on D1 overload (503) with backoff
                    if ((msg.includes('D1_ERROR') || msg.includes('overloaded') || res.status === 503) && attempt < 2) {
                        await sleep(Math.pow(2, attempt) * 1000);
                        continue;
                    }

                    throw new Error(msg);
                }

                return await res.json().then(data => {
                    setLoading(false);
                    return data;
                });
            } catch (e: any) {
                lastError = e;

                // Retry transient network errors
                if ((e.name === 'TypeError' || e.message?.includes('overloaded')) && attempt < 2) {
                    await sleep(Math.pow(2, attempt) * 1000);
                    continue;
                }
                break;
            }
        }

        setLoading(false);
        if (!silent && lastError) {
            toast.error(lastError.message || 'Request failed');
        }
        throw lastError;
    }, [session]);

    return { request, loading };
}
