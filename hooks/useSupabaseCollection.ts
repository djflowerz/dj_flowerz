import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export const useSupabaseCollection = <T extends { id: string }>(
    tableName: string,
    initialData: T[],
    enabled: boolean = true,
    transform?: (data: any) => T,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    isRealtime: boolean = true,
    limit?: number
) => {
    const [data, setData] = useState<T[]>(initialData);
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!enabled) return;

        setIsLoading(true);
        let query = supabase.from(tableName).select('*');

        const sbOrderBy = orderByField === 'createdAt' ? 'created_at' :
            orderByField === 'updatedAt' ? 'updated_at' :
                orderByField === 'dateSubscribed' ? 'date_subscribed' :
                    orderByField === 'startDate' ? 'start_date' :
                        orderByField === 'dateAdded' ? 'date_added' :
                            orderByField;

        if (sbOrderBy) {
            query = query.order(sbOrderBy, { ascending: orderDirection === 'asc' });
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data: results, error: sbError } = await query;

        if (sbError) {
            console.error(`Supabase fetch error (${tableName}):`, sbError.message);
            setError(sbError.message);
        } else {
            const transformed = results.map(item => transform ? transform(item) : (item as unknown as T));
            // If empty, fallback to initialData (useful for things like INITIAL_GENRES)
            if (transformed.length === 0 && initialData.length > 0) {
                setData(initialData);
            } else {
                setData(transformed);
            }
        }
        setIsLoading(false);
    };

    const loadMore = async (count: number = 20) => {
        if (!enabled || isLoading) return;

        setIsLoading(true);
        const from = data.length;
        const to = from + count - 1;

        let query = supabase.from(tableName).select('*').range(from, to);

        const sbOrderBy = orderByField === 'createdAt' ? 'created_at' :
            orderByField === 'updatedAt' ? 'updated_at' :
                orderByField === 'dateSubscribed' ? 'date_subscribed' :
                    orderByField === 'startDate' ? 'start_date' :
                        orderByField === 'dateAdded' ? 'date_added' :
                            orderByField;

        if (sbOrderBy) {
            query = query.order(sbOrderBy, { ascending: orderDirection === 'asc' });
        }

        const { data: results, error: sbError } = await query;

        if (sbError) {
            console.error(`Supabase loadMore error (${tableName}):`, sbError.message);
            setError(sbError.message);
        } else if (results && results.length > 0) {
            const transformed = results.map(item => transform ? transform(item) : (item as unknown as T));
            setData(prev => [...prev, ...transformed]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (!enabled) {
            setData(initialData);
            setIsLoading(false);
            return;
        }

        fetchData();

        if (isRealtime) {
            const channel = supabase
                .channel(`public:${tableName}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
                    console.log(`Realtime update for ${tableName}:`, payload.eventType);
                    fetchData(); // Simplest way to handle updates for now
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [tableName, enabled, orderByField, orderDirection, isRealtime]);

    return [data, setData, isLoading, loadMore, error, fetchData] as const;
};
