import React, { useState, useEffect } from 'react';
import { Shield, UserX, Clock, Download, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { STORAGE_WORKER_URL, getAuthHeader } from '../../utils/r2';

interface UserUsage {
    email: string;
    full_name: string | null;
    current_plan: string;
    downloads_today: number;
    last_download_at: string | null;
    subscription_end_date: string | null;
    is_subscriber: number;
}

export default function AdminUsageMonitor() {
    const [usageData, setUsageData] = useState<UserUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    const fetchUsage = async () => {
        setLoading(true);
        try {
            const authHeader = await getAuthHeader();
            const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/usage`, {
                headers: authHeader
            });
            if (response.ok) {
                const data = await response.json();
                setUsageData(data);
            }
        } catch (error) {
            console.error("Error fetching usage:", error);
            toast.error("Failed to load usage data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsage();
        const interval = setInterval(fetchUsage, 30000); // Auto refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleRevoke = async (email: string) => {
        if (!confirm(`Are you sure you want to REVOKE access for ${email}? This will kill their current subscription.`)) return;

        setRevoking(email);
        try {
            const authHeader = await getAuthHeader();
            const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/revoke-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ targetEmail: email })
            });

            if (response.ok) {
                toast.success(`Access revoked for ${email}`);
                fetchUsage();
            } else {
                toast.error("Failed to revoke access");
            }
        } catch (error) {
            console.error("Revoke error:", error);
            toast.error("Error revoking access");
        } finally {
            setRevoking(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter">Usage Monitor</h3>
                    <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold">Real-time Music Pool Surveillance</p>
                </div>
                <button
                    onClick={fetchUsage}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Active Subscribers</p>
                    <h4 className="text-4xl font-black text-white">{usageData.filter(u => u.is_subscriber === 1).length}</h4>
                </div>
                <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-orange-500">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Potential Misuse</p>
                    <h4 className="text-4xl font-black">{usageData.filter(u => u.downloads_today > 10).length}</h4>
                </div>
                <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-brand-purple">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total Pool Actions</p>
                    <h4 className="text-4xl font-black">{usageData.reduce((sum, u) => sum + u.downloads_today, 0)}</h4>
                </div>
            </div>

            <div className="bg-[#0B0B0F] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">User / Plan</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Daily Usage</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Last Activity</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {usageData.map((u) => (
                                <tr key={u.email} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white">{u.full_name || 'Anonymous User'}</span>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest">{u.email}</span>
                                            <div className="mt-1 flex items-center gap-1.5">
                                                <Zap size={10} className="text-brand-purple" />
                                                <span className="text-[9px] font-black text-brand-purple uppercase tracking-tighter">{u.current_plan}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <Download size={14} className={u.downloads_today > 10 ? "text-orange-500" : "text-gray-500"} />
                                                <span className={`text-lg font-black ${u.downloads_today > 10 ? 'text-orange-500' : 'text-white'}`}>{u.downloads_today}</span>
                                            </div>
                                            <span className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Files today</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Clock size={12} />
                                                <span className="text-[10px] font-bold uppercase">{u.last_download_at ? new Date(u.last_download_at).toLocaleTimeString() : 'No activity'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        {u.is_subscriber === 1 ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 w-fit">
                                                <AlertTriangle size={12} className="text-red-500" />
                                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Revoked</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        {u.is_subscriber === 1 && (
                                            <button
                                                onClick={() => handleRevoke(u.email)}
                                                disabled={revoking === u.email}
                                                className="p-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                                title="Revoke Access"
                                            >
                                                {revoking === u.email ? <RefreshCw className="animate-spin" size={16} /> : <UserX size={16} />}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {usageData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-600 font-bold uppercase tracking-[0.2em]">
                                        No active pool users detected
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
