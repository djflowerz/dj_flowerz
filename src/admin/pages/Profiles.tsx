import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Users, ShieldCheck, CheckCircle2, Search, Filter } from 'lucide-react';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface Profile {
    id: string;
    handle: string;
    full_name: string;
    email: string;
    aura_tier: string;
    is_verified: boolean;
    created_at: string;
}

const AdminProfiles: React.FC = () => {
    const { request } = useAdminApi();
    const { session } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchProfiles = async () => {
        try {
            const data = await request('/api/admin/profiles');
            setProfiles(data);
        } catch (error) {
            console.error("Profiles fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) fetchProfiles();
    }, [session]);

    const filteredProfiles = profiles.filter(p => 
        (p.handle?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const toggleVerification = async (profileId: string, currentStatus: boolean) => {
        try {
            // Re-using patch profile endpoint if it exists or generic update
            toast.loading("Updating verification status...");
            await request(`/api/admin/profiles/${profileId}/verify`, { 
                method: 'POST',
                body: JSON.stringify({ verified: !currentStatus })
            });
            toast.success("Profile updated");
            fetchProfiles();
        } catch (e) {
            toast.error("Failed to update profile");
        }
    };

    return (
        <AdminLayout title="Operator Registry">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by handle, name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-xs font-bold text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                        <Filter size={14} /> Filter Tiers
                    </button>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Operator</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Aura Tier</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Joined</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Retrieving intelligence...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProfiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">No matching operators found.</p>
                                    </td>
                                </tr>
                            ) : filteredProfiles.map((p) => (
                                <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-purple/20 to-brand-cyan/20 flex items-center justify-center text-white ring-1 ring-white/10 group-hover:scale-105 transition-transform overflow-hidden">
                                                <Users size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-black text-white uppercase truncate">{p.full_name || 'Incognito Operator'}</p>
                                                    {p.is_verified && <CheckCircle2 size={12} className="text-brand-cyan fill-brand-cyan/10" />}
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-500">@{p.handle || 'no_handle'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] font-bold text-white truncate">{p.email}</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.id ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Active</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            p.aura_tier === 'legendary' ? 'bg-brand-yellow/10 border-brand-yellow/20 text-brand-yellow' :
                                            p.aura_tier === 'elite' ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' :
                                            'bg-gray-400/5 border-white/5 text-gray-500'
                                        }`}>
                                            {p.aura_tier || 'standard'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[10px] font-bold text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => toggleVerification(p.id, p.is_verified)}
                                                className={`p-3 rounded-xl border transition-all ${p.is_verified ? 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}
                                                title={p.is_verified ? "Revoke Verification" : "Verify Operator"}
                                            >
                                                <ShieldCheck size={16} />
                                            </button>
                                            <button className="p-3 bg-white/5 border border-white/5 rounded-xl text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 transition-all">
                                                <Search size={16} />
                                            </button>
                                        </div>
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

export default AdminProfiles;
