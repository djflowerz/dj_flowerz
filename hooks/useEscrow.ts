/**
 * useEscrow.ts — DJ Flowerz Escrow Hook
 * Wraps all escrow API calls with typed state and role-aware derived helpers.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = `${import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke'}/api/escrow`;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type EscrowState =
    | 'PENDING' | 'FUNDED' | 'SHIPPED' | 'DELIVERED'
    | 'RELEASED' | 'DISPUTED' | 'RESOLVED' | 'REFUNDED' | 'CANCELLED';

export interface EscrowTransaction {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    amount_kes: number;
    fee_kes: number;
    seller_receives: number;
    item_description: string;
    state: EscrowState;
    paystack_ref: string | null;
    tracking_number: string | null;
    shipping_carrier: string | null;
    dispute_reason: string | null;
    resolution_notes: string | null;
    release_code: string | null;
    release_attempts: number;
    is_blocked: number;
    created_at: string;
    funded_at: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    released_at: string | null;
    auto_release_at: string | null;
    updated_at: string;
    evidence?: any[];
}

export interface EscrowEvent {
    id: string;
    escrow_id: string;
    event: string;
    actor_id: string;
    note: string | null;
    created_at: string;
}

// ─── Main hook ──────────────────────────────────────────────────────────────────

export function useEscrow(escrowId: string | null = null) {
    const { user } = useAuth();
    const [escrow, setEscrow] = useState<EscrowTransaction | null>(null);
    const [events, setEvents] = useState<EscrowEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!escrowId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await call<{ escrow: EscrowTransaction; events: EscrowEvent[] }>('GET', `/${escrowId}`);
            setEscrow(data.escrow);
            setEvents(data.events ?? []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [escrowId]);

    useEffect(() => { refresh(); }, [refresh]);

    const withLoading = async <T>(fn: () => Promise<T>): Promise<T> => {
        setLoading(true);
        setError(null);
        try {
            return await fn();
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const createEscrow = useCallback(async (params: {
        listing_id: string;
        seller_id: string;
        amount_kes: number;
        item_description: string;
    }): Promise<EscrowTransaction> => {
        return withLoading(async () => {
            const data = await call<{ escrow: EscrowTransaction }>('POST', '/', params);
            setEscrow(data.escrow);
            return data.escrow;
        });
    }, []);

    const fund = useCallback(async (paystack_ref: string) => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/fund`, { paystack_ref });
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const ship = useCallback(async (params: { tracking_number: string; shipping_carrier: string }) => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/ship`, params);
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const deliver = useCallback(async () => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/deliver`, {});
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const dispute = useCallback(async (reason: string) => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/dispute`, { reason });
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const resolve = useCallback(async (outcome: 'release' | 'refund', notes = '') => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/resolve`, { outcome, notes });
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const cancel = useCallback(async () => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/cancel`, {});
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const verifyCode = useCallback(async (code: string) => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/verify-code`, { code });
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const submitReview = useCallback(async (params: { rating: number; review_text?: string; tags?: string[] }) => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/review`, params);
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const uploadEvidence = useCallback(async (params: { file_url: string; file_type?: string; caption?: string }) => {
        return withLoading(async () => {
            const data = await call('POST', `/${escrowId}/evidence`, params);
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    const reportUser = useCallback(async (params: { reported_id: string; reason: string; details?: string }) => {
        return withLoading(async () => {
            const data = await call('POST', `/reports`, { ...params, escrow_id: escrowId });
            await refresh();
            return data;
        });
    }, [escrowId, refresh]);

    // ─── Derived helpers ──────────────────────────────────────────────────────

    const isBuyer  = !!(escrow && user && escrow.buyer_id  === user.id);
    const isSeller = !!(escrow && user && escrow.seller_id === user.id);

    const canFund    = isBuyer  && escrow?.state === 'PENDING';
    const canShip    = isSeller && escrow?.state === 'FUNDED';
    const canDeliver = isBuyer  && escrow?.state === 'SHIPPED';
    const canDispute = isBuyer  && (['FUNDED', 'SHIPPED'] as EscrowState[]).includes(escrow?.state!);
    const canCancel  = (isBuyer || isSeller) && escrow?.state === 'PENDING';
    const canVerifyCode = isSeller && escrow?.state === 'SHIPPED' && !escrow.is_blocked;
    const canReview = (isBuyer || isSeller) && (['RELEASED', 'RESOLVED', 'REFUNDED'] as EscrowState[]).includes(escrow?.state!);

    const autoReleaseDate = escrow?.auto_release_at ? new Date(escrow.auto_release_at) : null;
    const autoReleaseDaysLeft = autoReleaseDate
        ? Math.max(0, Math.ceil((autoReleaseDate.getTime() - Date.now()) / 86_400_000))
        : null;

    return {
        escrow, events, loading, error, refresh,
        createEscrow, fund, ship, deliver, dispute, resolve, cancel,
        verifyCode, submitReview, uploadEvidence, reportUser,
        isBuyer, isSeller,
        canFund, canShip, canDeliver, canDispute, canCancel, canVerifyCode, canReview,
        autoReleaseDaysLeft,
    };
}

// ─── List all escrows for current user ────────────────────────────────────────

export function useMyEscrows(role: 'buyer' | 'seller' | 'admin' | 'both' = 'both') {
    const { user } = useAuth();
    const [escrows, setEscrows] = useState<EscrowTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await call<{ escrows: EscrowTransaction[] }>('GET', `/?role=${role}`);
            setEscrows(data.escrows ?? []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [user, role]);

    useEffect(() => { refresh(); }, [refresh]);

    return { escrows, loading, error, refresh };
}

// ─── Fee preview (client-side, mirrors server logic) ─────────────────────────

export function computeEscrowFee(amount_kes: number): number {
    const fee = amount_kes <= 10000
        ? amount_kes * 0.05
        : 10000 * 0.05 + (amount_kes - 10000) * 0.03;
    return Math.max(50, Math.round(fee));
}

// ─── Fetch helper ──────────────────────────────────────────────────────────────

async function call<T = any>(method: string, path: string, body?: object): Promise<T> {
    const token = localStorage.getItem('sb-access-token');
    const opts: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data;
}
