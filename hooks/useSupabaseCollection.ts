/**
 * useSupabaseCollection — MIGRATED TO R2
 *
 * This hook previously fetched data directly from Supabase tables.
 * All data storage now lives in Cloudflare R2. Supabase is used for
 * authentication only (via AuthContext / supabase.auth.*).
 *
 * This file is kept as a backwards-compatible re-export of useR2Collection
 * so that any legacy imports continue to work without changes.
 */
export { useR2Collection as useSupabaseCollection } from './useR2Collection';
