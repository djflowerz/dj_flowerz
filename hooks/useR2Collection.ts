
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

    const fetchData = async (isBackground: boolean = false) => {
        if (!enabled) return;

        if (!isBackground) setIsLoading(true);
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
            const newData = transformed.length === 0 && initialData.length > 0 ? initialData : transformed;

            // Only update state if data has actually changed to prevent VirtualGrid re-renders
            setData(prevData => {
                if (JSON.stringify(prevData) === JSON.stringify(newData)) {
                    return prevData;
                }
                return newData;
            });

            setError(null);
        } catch (err: any) {
            console.error(`R2 fetch error (${collectionName}):`, err.message);
            setError(err.message);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) {
            setData(initialData);
            setIsLoading(false);
            return;
        }

        fetchData();

        // Auto-polling for freshness
        const interval = setInterval(() => fetchData(true), 300000); // Poll every 5 mins
        return () => clearInterval(interval);
    }, [collectionName, enabled, orderByField, orderDirection]);

    const loadMore = () => { console.warn("loadMore not implemented for static R2 source"); };

    return [data, setData, isLoading, loadMore, error, fetchData] as const;
};
