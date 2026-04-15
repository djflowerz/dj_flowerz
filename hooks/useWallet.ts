import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export interface WalletTransaction {
    id: string;
    user_id: string;
    amount_kes: number;
    type: 'CREDIT' | 'WITHDRAWAL' | 'SERVICE_FEE';
    escrow_id?: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    created_at: string;
}

export function useWallet() {
    const { token } = useAuth();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke'}/api/wallet`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setBalance(data.balance);
            setTransactions(data.transactions);
        } catch (err: any) {
            console.error('[useWallet]', err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const withdraw = async (amount: number) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke'}/api/wallet/withdraw`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success('Withdrawal Requested', { description: 'Admin will process your payout within 24h.' });
            await refresh();
            return { success: true };
        } catch (err: any) {
            toast.error('Withdrawal Failed', { description: err.message });
            return { error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { balance, transactions, loading, refresh, withdraw };
}
