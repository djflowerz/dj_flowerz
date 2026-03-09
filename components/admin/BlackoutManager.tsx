
import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://api.djflowerz.co.ke';

interface Blackout {
    id: string;
    date: string;
    reason: string;
}

const BlackoutManager: React.FC = () => {
    const [blackouts, setBlackouts] = useState<Blackout[]>([]);
    const [newDate, setNewDate] = useState('');
    const [newReason, setNewReason] = useState('Gig Confirmed');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchBlackouts();
    }, []);

    const fetchBlackouts = async () => {
        try {
            const res = await fetch(`${WORKER_URL}/api/blackouts`);
            if (res.ok) {
                const data = await res.json();
                setBlackouts(data);
            }
        } catch (err) {
            console.error('Failed to fetch blackouts:', err);
        }
    };

    const handleAddBlackout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${WORKER_URL}/api/admin/bookings/blackout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ date: newDate, reason: newReason })
            });

            if (res.ok) {
                setSuccess(`Date ${newDate} is now blocked.`);
                setNewDate('');
                fetchBlackouts();
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to add blackout');
            }
        } catch (err) {
            setError('Network error. Check connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBlackout = async (id: string) => {
        if (!confirm('Unblock this date?')) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${WORKER_URL}/api/admin/bookings/blackout/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            if (res.ok) {
                fetchBlackouts();
            }
        } catch (err) {
            console.error('Failed to delete blackout:', err);
        }
    };

    return (
        <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                    <Calendar />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Blackout Dates</h2>
            </div>

            <form onSubmit={handleAddBlackout} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Date</label>
                    <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-red-500"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason</label>
                    <input
                        type="text"
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                        placeholder="e.g. Gig Confirmed"
                        className="w-full bg-[#0B0B0F] border border-white/10 p-3 rounded-2xl text-white outline-none focus:border-red-500"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="submit"
                        disabled={loading || !newDate}
                        className="w-full h-[52px] bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-900/20"
                    >
                        {loading ? 'Processing...' : <><Plus size={18} /> Block Date</>}
                    </button>
                </div>
            </form>

            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-xs font-bold">
                    <CheckCircle size={16} /> {success}
                </div>
            )}

            <div className="space-y-3">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Blocked Reservations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {blackouts.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-gray-600 italic text-sm border-2 border-dashed border-white/5 rounded-[2rem]">
                            No dates are currently blacked out.
                        </div>
                    ) : (
                        blackouts.map((b) => (
                            <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-red-500/50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-white font-bold">{new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{b.reason}</span>
                                </div>
                                <button
                                    onClick={() => handleDeleteBlackout(b.id)}
                                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlackoutManager;
