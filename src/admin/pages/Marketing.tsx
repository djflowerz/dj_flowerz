import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Megaphone, Search, Tag, BarChart3, Plus } from 'lucide-react';
import { toast } from 'sonner';

const Marketing: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        try {
            const data = await request('/api/admin/newsletter_campaigns');
            setCampaigns(Array.isArray(data) ? data : (data?.campaigns || []));
        } catch {
            // Fallback
        }
    };

    return (
        <AdminLayout title="Growth Protocols">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Market <span className="text-brand-purple">Intelligence</span></h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Campaign Orchestration & Reach Analysis</p>
                </div>
                <button className="px-8 py-4 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest shadow-xl shadow-brand-purple/20 flex items-center gap-3">
                    <Plus size={16} /> New Campaign
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                        <Megaphone size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Active Campaigns</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{campaigns.length}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                        <Tag size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Promo Codes</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">0</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                        <BarChart3 size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Reach</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">0</h4>
                    </div>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Active Transmissions</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Marketing Vector Registry</p>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="SEARCH CAMPAIGNS..." 
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
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Campaign Point</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Channel</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Efficiency</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Fetching Intel...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && campaigns.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <Megaphone size={48} className="text-gray-500" />
                                            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No campaigns currently broadcasting.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Marketing;
