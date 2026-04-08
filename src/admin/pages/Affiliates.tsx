import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Users, DollarSign, TrendingUp, Search } from 'lucide-react';
import { toast } from 'sonner';

const Affiliates: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAffiliates();
    }, []);

    const loadAffiliates = async () => {
        try {
            const data = await request('/api/admin/referrals/stats');
            setAffiliates(Array.isArray(data) ? data : (data?.stats || []));
        } catch {
            // Fallback for missing endpoint
        }
    };

    const filtered = affiliates.filter(a => 
        (a.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.referral_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Affiliate Protocol">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Partners</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{affiliates.length}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Conversions</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">0</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Owed Commissions</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">Ksh 0</h4>
                    </div>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Active Partners</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Satellite User Protocol</p>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="SEARCH PARTNERS..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Partner Details</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Affiliate Code</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Commission %</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Earnings</th>
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
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <Users size={48} className="text-gray-500" />
                                            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No affiliates found in the registry.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {filtered.map((a) => (
                                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-white group-hover:text-brand-purple transition-colors">{a.full_name || (a.email ? a.email.split('@')[0] : 'Unknown')}</div>
                                        <div className="text-[11px] text-gray-500">{a.email}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-brand-yellow">{a.referral_code || 'N/A'}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[11px] font-black text-white">{a.percentage || 10}%</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[11px] font-black text-white">Ksh {a.total_earned || 0}</div>
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Lifetime</div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="px-4 py-2 bg-white/5 hover:bg-brand-purple hover:text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-500 transition-all">Details</button>
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

export default Affiliates;
