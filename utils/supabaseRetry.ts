/**
 * Supabase Retry Utility
 * Handles connection timeouts and implements retry logic with exponential backoff
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    timeout?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    timeout: 30000, // 30 seconds
};

/**
 * Sleep utility for delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrap a Supabase query with retry logic
 */
export async function withRetry<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any = null;
    let delay = opts.initialDelay;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), opts.timeout);
            });

            // Race between the query and timeout
            const result = await Promise.race([
                queryFn(),
                timeoutPromise
            ]);

            // If successful, return immediately
            if (!result.error) {
                if (attempt > 0) {
                    console.log(`✅ Query succeeded on attempt ${attempt + 1}`);
                }
                return result;
            }

            // Store the error
            lastError = result.error;

            // Check if error is retryable
            const isRetryable = isRetryableError(result.error);

            if (!isRetryable || attempt === opts.maxRetries) {
                console.error(`❌ Query failed after ${attempt + 1} attempts:`, result.error);
                return result;
            }

            // Log retry attempt
            console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, result.error.message);

            // Wait before retrying
            await sleep(delay);

            // Increase delay with exponential backoff
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);

        } catch (error: any) {
            lastError = error;

            // If it's a timeout or network error, retry
            if (attempt < opts.maxRetries) {
                console.warn(`⚠️ Attempt ${attempt + 1} failed with exception, retrying in ${delay}ms...`, error.message);
                await sleep(delay);
                delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
            } else {
                console.error(`❌ Query failed after ${attempt + 1} attempts:`, error);
                return { data: null, error: lastError };
            }
        }
    }

    return { data: null, error: lastError };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
    if (!error) return false;

    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    // Network and timeout errors
    const retryableMessages = [
        'timeout',
        'network',
        'connection',
        'econnreset',
        'econnrefused',
        'etimedout',
        'fetch failed',
        '522', // Cloudflare error
        '503', // Service unavailable
        '504', // Gateway timeout
    ];

    return retryableMessages.some(msg =>
        message.includes(msg) || code.includes(msg)
    );
}

/**
 * Batch queries with retry logic
 */
export async function batchWithRetry<T>(
    queries: Array<() => Promise<{ data: T | null; error: any }>>,
    options: RetryOptions & { concurrency?: number } = {}
): Promise<Array<{ data: T | null; error: any }>> {
    const { concurrency = 5, ...retryOpts } = options;
    const results: Array<{ data: T | null; error: any }> = [];

    // Process queries in batches
    for (let i = 0; i < queries.length; i += concurrency) {
        const batch = queries.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(query => withRetry(query, retryOpts))
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Helper to create a retryable Supabase query
 */
export function createRetryableQuery<T>(
    client: SupabaseClient,
    tableName: string,
    options: RetryOptions = {}
) {
    return {
        select: (columns = '*') => ({
            execute: () => withRetry(
                async () => await client.from(tableName).select(columns),
                options
            ),
            eq: (column: string, value: any) => ({
                execute: () => withRetry(
                    async () => await client.from(tableName).select(columns).eq(column, value),
                    options
                ),
            }),
        }),
        insert: (data: any) => ({
            execute: () => withRetry(
                async () => await client.from(tableName).insert(data),
                options
            ),
        }),
        update: (data: any) => ({
            eq: (column: string, value: any) => ({
                execute: () => withRetry(
                    async () => await client.from(tableName).update(data).eq(column, value),
                    options
                ),
            }),
        }),
        delete: () => ({
            eq: (column: string, value: any) => ({
                execute: () => withRetry(
                    async () => await client.from(tableName).delete().eq(column, value),
                    options
                ),
            }),
        }),
    };
}
