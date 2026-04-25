import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { 
    ShieldCheck, 
    UserCheck, 
    Zap, 
    AlertTriangle, 
    Search,
    Filter,
    MoreVertical,
    Activity,
    Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../hooks/useAdminApi';
import { cn } from '@/utils';

interface Operator {
    id: string;
    handle: string;
    full_name: string;
    avatar_url: string;
    aura_tier: 'standard' | 'prime' | 'legendary';
    is_verified: boolean;
    primary_role: string;
    created_at: string;
}

const Governance: React.FC = () => {
    const { request } = useAdminApi();
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await request('/api/admin/governance/queue');
            setOperators(data.operators || []);
        } catch (e) {
            toast.error("Failed to sync member data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleVerify = async (id: string, verify: boolean) => {
        try {
            await request(`/api/admin/governance/operators/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_verified: verify })
            });
            toast.success(verify ? "Member Verified" : "Verification Revoked");
            fetchData();
        } catch (e) {
            toast.error("Process failed");
        }
    };

    const handleModulateAura = async (id: string, tier: string) => {
        try {
            await request(`/api/admin/governance/operators/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ aura_tier: tier })
            });
            toast.success(`Tier adjusted to ${tier}`);
            fetchData();
        } catch (e) {
            toast.error("Tier adjustment failed");
        }
    };

    const filteredOperators = operators.filter(op => {
        const matchesSearch = op.handle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             op.full_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || 
                             (filter === 'pending' && !op.is_verified) || 
                             (filter === 'verified' && op.is_verified);
        return matchesSearch && matchesFilter;
    });

    return (
        <AdminLayout title="Member Verification">
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* ── STATS BAR ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0B0B0F] border border-white/5 p-8 rounded-[2.5rem]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-[#A349F5]/10 flex items-center justify-center text-[#A349F5]">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Members</p>
                                <p className="text-3xl font-black">{operators.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#0B0B0F] border border-white/5 p-8 rounded-[2.5rem]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-[#00F5FF]/10 flex items-center justify-center text-[#00F5FF]">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Verified Profiles</p>
                                <p className="text-3xl font-black">{operators.filter(o => o.is_verified).length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#0B0B0F] border border-white/5 p-8 rounded-[2.5rem]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]">
                                <Zap size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Activity Level</p>
                                <p className="text-3xl font-black">High</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── CONTROL TOWER ── */}
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Verification Queue</h3>
                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-1">Manage and authorize community accounts</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                <input 
                                    type="text"
                                    placeholder="Search handle..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-[10px] uppercase font-black tracking-widest text-white focus:border-[#A349F5]/40 outline-none transition-all"
                                />
                            </div>
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                                {['all', 'pending', 'verified'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={cn(
                                            "px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                            filter === f ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500 font-black uppercase tracking-widest text-[10px] animate-pulse italic">Loading Member Records...</div>
                        ) : filteredOperators.length === 0 ? (
                            <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                                <Activity className="w-12 h-12 mx-auto text-white/5 mb-4" />
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-600">No matching members found.</p>
                            </div>
                        ) : (
                            filteredOperators.map((op) => (
                                <div key={op.id} className="group bg-white/[0.02] border border-white/5 hover:border-white/10 p-6 rounded-[2rem] flex items-center justify-between transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <img src={op.avatar_url || 'https://via.placeholder.com/50'} className="w-14 h-14 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all border border-white/5" alt="" />
                                            {op.is_verified && (
                                                <div className="absolute -top-2 -right-2 bg-[#00F5FF] p-1 rounded-full border-2 border-[#0B0B0F]">
                                                    <ShieldCheck size={10} className="text-[#0B0B0F]" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-black text-white uppercase tracking-tighter text-lg">{op.full_name}</h4>
                                                <span className="text-[#00F5FF]/60 text-[10px] font-bold italic tracking-widest uppercase">@{op.handle}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{op.primary_role}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">{new Date(op.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right px-8 border-x border-white/5">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Tier Selection</p>
                                            <select 
                                                value={op.aura_tier}
                                                onChange={(e) => handleModulateAura(op.id, e.target.value)}
                                                className="bg-transparent text-[#A349F5] font-black uppercase tracking-tighter text-sm focus:outline-none cursor-pointer"
                                            >
                                                <option value="standard">Standard</option>
                                                <option value="prime">Prime</option>
                                                <option value="legendary">Legendary</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {op.is_verified ? (
                                                <button 
                                                    onClick={() => handleVerify(op.id, false)}
                                                    className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all"
                                                >
                                                    Revoke
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleVerify(op.id, true)}
                                                    className="px-8 py-3 bg-[#00F5FF]/10 border border-[#00F5FF]/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#00F5FF] hover:bg-[#00F5FF]/20 transition-all shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                                                >
                                                    Verify Profile
                                                </button>
                                            )}
                                            <button className="p-3 text-white/20 hover:text-white transition-all">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Governance;
