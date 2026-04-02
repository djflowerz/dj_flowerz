import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || '';

export function useAdminApi() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);

    const request = useCallback(async (path: string, options: RequestInit = {}) => {
        setLoading(true);
        try {
            const token = session?.access_token || '';
            const headers = new Headers(options.headers);
            headers.set('Authorization', `Bearer ${token}`);
            headers.set('Content-Type', 'application/json');

            const res = await fetch(`${WORKER_URL}${path}`, {
                ...options,
                headers
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Request failed');
            }

            return await res.json();
        } catch (e: any) {
            toast.error(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    return { request, loading };
}
