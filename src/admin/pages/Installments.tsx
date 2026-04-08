import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Clock, Search, Hash, RefreshCw } from 'lucide-react';

const Installments: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [installments, setInstallments] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadInstallments();
    }, []);

    const loadInstallments = async () => {
        try {
            const data = await request('/api/admin/installments');
            setInstallments(Array.isArray(data) ? data : (data?.installments || []));
        } catch {
            // Fallback
        }
    };

    const filtered = installments.filter(item => 
        (item.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.order_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Lipa Pole Pole Protocol">
            <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6 mb-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-brand-purple/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple transition-colors relative z-10">
                    <Clock size={28} />
                </div>
                <div className="relative z-10">
                    <h3 className="text-xl font-black text-white tracking-tight uppercase">Active Payment Plans</h3>
                    <p className="text-sm text-gray-500 font-medium">Track installments, pending balances, and default risks.</p>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="SEARCH ORDERS OR USERS..." 
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
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Order ID</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Client Info</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Progress</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Balance</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 animate-pulse">
                                            <RefreshCw size={40} className="text-brand-purple animate-spin" />
                                            <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Analyzing Transmission...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <Hash size={48} className="text-gray-500" />
                                            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No installments currently indexed.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6 font-mono text-[11px] text-brand-purple font-bold">#{item.order_id}</td>
                                    <td className="px-8 py-6">
                                        <div className="font-black text-white group-hover:text-brand-purple transition-colors">{item.user_name}</div>
                                        <div className="text-[11px] text-gray-500">{item.user_email}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[100px]">
                                                <div 
                                                    className="h-full bg-brand-purple transition-all duration-1000" 
                                                    style={{ width: `${(item.paid / item.total) * 100}%` }} 
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-white">{Math.round((item.paid / item.total) * 100)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-xs font-black text-white">Ksh {item.total - item.paid}</div>
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Remaining</div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="px-4 py-2 bg-white/5 hover:bg-brand-purple hover:text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-500 transition-all">Protocol</button>
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

export default Installments;
