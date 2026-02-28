
import { useState, useEffect } from 'react';
import { fetchFromR2 } from '../utils/r2';

export const useR2Collection = <T extends { id: string }>(
    collectionName: string,
    initialData: T[],
    enabled: boolean = true,
    transform?: (data: any) => T,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc'
) => {
    const [data, setData] = useState<T[]>(initialData);
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!enabled) return;

        setIsLoading(true);
        try {
            const results = await fetchFromR2<any>(collectionName);

            let transformed = results.map(item => transform ? transform(item) : (item as unknown as T));

            // Sort data since R2 logic is static
            if (orderByField) {
                transformed.sort((a: any, b: any) => {
                    const valA = a[orderByField];
                    const valB = b[orderByField];
                    if (valA < valB) return orderDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return orderDirection === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            // Fallback to initialData if empty
            if (transformed.length === 0 && initialData.length > 0) {
                setData(initialData);
            } else {
                setData(transformed);
            }
            setError(null);
        } catch (err: any) {
            console.error(`R2 fetch error (${collectionName}):`, err.message);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) {
            setData(initialData);
            setIsLoading(false);
            return;
        }

        fetchData();

        // Auto-polling for "realtime" feel as requested by user
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [collectionName, enabled, orderByField, orderDirection]);

    return [data, setData, isLoading, error, fetchData] as const;
};
