
import { useState, useEffect } from 'react';

export const useD1Collection = <T extends { id: string }>(
    endpoint: string,
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
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
            }
            const results = await response.json() as any[];

            let transformed = results.map(item => transform ? transform(item) : (item as unknown as T));

            // Sort data if needed (though D1 usually handles this)
            if (orderByField) {
                transformed.sort((a: any, b: any) => {
                    const valA = a[orderByField];
                    const valB = b[orderByField];
                    if (valA < valB) return orderDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return orderDirection === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            const newData = transformed.length === 0 && initialData.length > 0 ? initialData : transformed;

            setData(prevData => {
                if (JSON.stringify(prevData) === JSON.stringify(newData)) {
                    return prevData;
                }
                return newData;
            });

            setError(null);
        } catch (err: any) {
            console.error(`D1 fetch error (${endpoint}):`, err.message);
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

        // Auto-polling for freshness every 1 minute for active logs
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, [endpoint, enabled, orderByField, orderDirection]);

    const loadMore = () => { console.warn("loadMore not implemented for D1 source yet"); };

    return [data, setData, isLoading, loadMore, error, fetchData] as const;
};
