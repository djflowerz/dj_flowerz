import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Send, Search, Download, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const Newsletter: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadSubscribers();
    }, []);

    const loadSubscribers = async () => {
        try {
            const data = await request('/api/admin/newsletter_subscribers');
            setSubscribers(Array.isArray(data) ? data : (data?.subscribers || []));
        } catch {
            // Fallback for missing endpoint
        }
    };

    const filtered = subscribers.filter(s => 
        (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const csv = 'Email,Join Date\n' + filtered.map(s => `${s.email},${s.created_at}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Subscriber list exported');
    };

    return (
        <AdminLayout title="Broadcast Registry">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                            <Send size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Subscribers</p>
                            <h4 className="text-3xl font-black text-white tracking-tighter">{subscribers.length}</h4>
                        </div>
                    </div>
                    <button 
                        onClick={handleExport}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                        <MessageSquare size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Open Rate (Avg)</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">0%</h4>
                    </div>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">System Subscribers</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">External Signal Reception List</p>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="SEARCH EMAILS..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all font-mono"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Email Address</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Subscription Date</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Source</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Fetching Intel...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <Send size={48} className="text-gray-500" />
                                            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No subscribers found in the registry.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {filtered.map((s) => (
                                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-white group-hover:text-brand-purple transition-colors font-mono">{s.email}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[11px] font-black text-gray-400 capitalize">{new Date(s.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500">{s.source || 'Footer Form'}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-green-500">Active</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Newsletter;
