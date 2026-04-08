import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Send, Search, Download, MessageSquare, X, Plus, Mail, Users, Eye, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const Newsletter: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [subTab, setSubTab] = useState<'subscribers' | 'campaigns'>('subscribers');
    const [showCompose, setShowCompose] = useState(false);
    const [sending, setSending] = useState(false);
    const [compose, setCompose] = useState({
        subject: '',
        content: '',
        target_audience: 'all'
    });

    useEffect(() => {
        loadSubscribers();
        loadCampaigns();
    }, []);

    const loadSubscribers = async () => {
        try {
            const data = await request('/api/admin/newsletter_subscribers');
            setSubscribers(Array.isArray(data) ? data : (data?.subscribers || []));
        } catch { /* fallback */ }
    };

    const loadCampaigns = async () => {
        try {
            const data = await request('/api/admin/newsletter_campaigns');
            setCampaigns(Array.isArray(data) ? data : (data?.campaigns || []));
        } catch { /* fallback */ }
    };

    const filtered = subscribers.filter(s =>
        (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const csv = 'Email,Join Date\n' + filtered.map(s => `${s.email},${s.created_at || s.dateSubscribed}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Subscriber list exported');
    };

    const handleSendBroadcast = async () => {
        if (!compose.subject.trim() || !compose.content.trim()) {
            toast.error('Subject and message are required');
            return;
        }
        setSending(true);
        try {
            // Save campaign as sent
            await request('/api/admin/newsletter_campaigns', {
                method: 'POST',
                body: JSON.stringify({ ...compose, status: 'sent' })
            });
            toast.success(`Broadcast queued for ${subscribers.length} subscriber(s)`);
            setShowCompose(false);
            setCompose({ subject: '', content: '', target_audience: 'all' });
            await loadCampaigns();
        } catch {
            toast.error('Failed to send broadcast');
        } finally {
            setSending(false);
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm('Delete this campaign?')) return;
        try {
            await request(`/api/admin/newsletter_campaigns/${id}`, { method: 'DELETE' });
            toast.success('Campaign deleted');
            await loadCampaigns();
        } catch { toast.error('Delete failed'); }
    };

    return (
        <AdminLayout title="Broadcast Registry">
            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="px-10 py-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Compose Broadcast</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">{subscribers.length} recipients</p>
                            </div>
                            <button onClick={() => setShowCompose(false)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Subject Line</label>
                                <input
                                    type="text"
                                    placeholder="e.g., New Mixtape Drop — June 2026"
                                    value={compose.subject}
                                    onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Target Audience</label>
                                <select
                                    value={compose.target_audience}
                                    onChange={e => setCompose(p => ({ ...p, target_audience: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                >
                                    <option value="all">All Subscribers</option>
                                    <option value="music_pool">Music Pool Members</option>
                                    <option value="store">Store Customers</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Message Body</label>
                                <textarea
                                    rows={8}
                                    placeholder="Write your broadcast message here..."
                                    value={compose.content}
                                    onChange={e => setCompose(p => ({ ...p, content: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-3xl py-5 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowCompose(false)}
                                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendBroadcast}
                                    disabled={sending}
                                    className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest shadow-xl shadow-brand-purple/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                    {sending ? 'Sending...' : 'Send Broadcast'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                            <Users size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Subscribers</p>
                            <h4 className="text-3xl font-black text-white tracking-tighter">{subscribers.length}</h4>
                        </div>
                    </div>
                    <button onClick={handleExport} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2">
                        <Download size={12} /> CSV
                    </button>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                        <Mail size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Campaigns Sent</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{campaigns.filter(c => c.status === 'sent').length}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                        <MessageSquare size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Drafts</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{campaigns.filter(c => c.status === 'draft').length}</h4>
                    </div>
                </div>
            </div>

            {/* Sub-tab Nav */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                    {(['subscribers', 'campaigns'] as const).map(tab => (
                        <button key={tab} onClick={() => setSubTab(tab)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === tab ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowCompose(true)}
                    className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest shadow-xl shadow-brand-purple/20 flex items-center gap-2"
                >
                    <Plus size={14} /> Compose Broadcast
                </button>
            </div>

            {subTab === 'subscribers' && (
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Subscriber Registry</h3>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Active Signal Receivers</p>
                        </div>
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                            <input type="text" placeholder="SEARCH EMAILS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all font-mono" />
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
                                    <tr><td colSpan={4} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Loading Registry...</p>
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && filtered.length === 0 && (
                                    <tr><td colSpan={4} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <Send size={48} className="text-gray-500" />
                                            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No subscribers found.</p>
                                        </div>
                                    </td></tr>
                                )}
                                {filtered.map((s, i) => (
                                    <tr key={s.email || i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6"><div className="font-black text-white group-hover:text-brand-purple transition-colors font-mono">{s.email}</div></td>
                                        <td className="px-8 py-6"><span className="text-[11px] font-black text-gray-400">{new Date(s.created_at || s.dateSubscribed || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></td>
                                        <td className="px-8 py-6"><span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500">{s.source || 'Footer Form'}</span></td>
                                        <td className="px-8 py-6 text-right"><span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-green-500">Active</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {subTab === 'campaigns' && (
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <h3 className="text-xl font-black text-white tracking-tight">Campaign History</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Broadcast Archive</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Subject</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Audience</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {campaigns.length === 0 && (
                                    <tr><td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <Mail size={48} className="text-gray-500" />
                                            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No campaigns yet. Compose your first broadcast.</p>
                                        </div>
                                    </td></tr>
                                )}
                                {campaigns.map(c => (
                                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-black text-white group-hover:text-brand-purple transition-colors">{c.subject}</div>
                                            <div className="text-[10px] text-gray-600 mt-0.5 truncate max-w-[280px]">{c.content?.slice(0, 60)}...</div>
                                        </td>
                                        <td className="px-8 py-6"><span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 capitalize">{c.target_audience || 'all'}</span></td>
                                        <td className="px-8 py-6"><span className="text-[11px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span></td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${c.status === 'sent' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-brand-yellow/10 border-brand-yellow/20 text-brand-yellow'}`}>
                                                {c.status || 'draft'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Newsletter;
