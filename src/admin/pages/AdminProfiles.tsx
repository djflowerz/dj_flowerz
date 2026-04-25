import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Users, ShieldCheck, CheckCircle2, Search, Filter, Trash2, ExternalLink, Activity, Globe, X, Zap } from 'lucide-react';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '../components/StatCard';
import { toast } from 'sonner';

interface Profile {
    id: string;
    handle: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    aura_tier: string;
    is_verified: boolean;
    presence_status?: string;
    last_seen?: string;
    created_at: string;
    aura_points?: number;
}

const AdminProfiles: React.FC = () => {
    const { request } = useAdminApi();
    const { session } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'registry' | 'community'>('registry');
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

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

    const activeUsers = useMemo(() => {
        const now = new Date();
        return profiles.filter(p => {
            if (p.presence_status === 'online') return true;
            if (p.last_seen) {
                const lastSeenDate = new Date(p.last_seen);
                const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
                return diffMinutes < 5;
            }
            return false;
        });
    }, [profiles]);

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            const matchesSearch = 
                (p.handle?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (p.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (p.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            
            const matchesTab = activeTab === 'registry' ? true : !!p.handle;
            
            return matchesSearch && matchesTab;
        });
    }, [profiles, searchTerm, activeTab]);

    const toggleVerification = async (profileId: string, currentStatus: boolean) => {
        try {
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

    const deleteUser = async (id: string, name: string) => {
        if (!window.confirm(`Permanently terminate access for ${name}? This action is irreversible.`)) return;
        try {
            toast.loading("De-registering operator...");
            await request(`/api/admin/profiles/${id}`, { method: 'DELETE' });
            toast.success("User removed from registry");
            fetchProfiles();
        } catch (e) {
            toast.error("Failed to remove user");
        }
    };

    return (
        <AdminLayout title="Member Registry">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <StatCard 
                    label="Total Registered Members" 
                    value={profiles.length} 
                    icon={Users} 
                    color="text-brand-purple" 
                    trend="LIVE"
                    trendUp={true}
                />
                <StatCard 
                    label="Active Online Now" 
                    value={activeUsers.length} 
                    icon={Activity} 
                    color="text-brand-cyan" 
                    trend="ACTIVE"
                    trendUp={true}
                />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                <div className="flex gap-4 p-1.5 bg-black/40 rounded-[1.25rem] border border-white/5">
                    <button 
                        onClick={() => setActiveTab('registry')} 
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'registry' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        Registry
                    </button>
                    <button 
                        onClick={() => setActiveTab('community')} 
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'community' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 border-brand-purple/50' : 'text-gray-500 hover:text-white border-transparent'} border`}
                    >
                        Community Feed
                    </button>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search registry..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-xs font-bold text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                    />
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Identity</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Contact Info</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Member Tier</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Joined</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Syncing Members...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProfiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">No members detected.</p>
                                    </td>
                                </tr>
                            ) : filteredProfiles.map((p) => {
                                const isOnline = p.presence_status === 'online' || (p.last_seen && (new Date().getTime() - new Date(p.last_seen).getTime()) < 300000);
                                return (
                                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-105 transition-all overflow-hidden relative shadow-inner">
                                                    {p.avatar_url ? (
                                                        <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={20} className="text-gray-600" />
                                                    )}
                                                    {isOnline && (
                                                        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0B0B0F] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-black text-white uppercase truncate">{p.full_name || 'Anonymous User'}</p>
                                                        {p.is_verified && <CheckCircle2 size={12} className="text-brand-cyan fill-brand-cyan/10" />}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-500">@{p.handle || p.id.substring(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-[10px] font-bold text-gray-300 truncate">{p.email}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-gray-600'}`}>
                                                        {isOnline ? 'Online Now' : p.last_seen ? `Seen ${new Date(p.last_seen).toLocaleDateString()}` : 'Idle'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm w-fit ${
                                                    p.aura_tier === 'legendary' ? 'bg-brand-yellow/10 border-brand-yellow/20 text-brand-yellow' :
                                                    p.aura_tier === 'elite' ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' :
                                                    'bg-white/5 border-white/5 text-gray-500'
                                                }`}>
                                                    {p.aura_tier || 'standard'}
                                                </span>
                                                <div className="flex items-center gap-1 text-gray-400">
                                                    <Zap size={12} className="text-brand-purple fill-brand-purple/20" />
                                                    <span className="text-[10px] font-bold">{p.aura_points || 0} pts</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{new Date(p.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                {p.handle && (
                                                    <a 
                                                        href={`/member/@${p.handle}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="p-3 bg-white/5 border border-white/5 rounded-xl text-gray-500 hover:text-brand-cyan hover:bg-brand-cyan/5 transition-all"
                                                        title="View Public Profile"
                                                    >
                                                        <Globe size={16} />
                                                    </a>
                                                )}
                                                 <button 
                                                    onClick={() => setSelectedProfile(p)}
                                                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 transition-all"
                                                    title="Account Details"
                                                >
                                                    <Search size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => toggleVerification(p.id, p.is_verified)}
                                                    className={`p-3 rounded-xl border transition-all ${p.is_verified ? 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}
                                                    title={p.is_verified ? "Revoke Verification" : "Verify Operator"}
                                                >
                                                    <ShieldCheck size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => deleteUser(p.id, p.full_name || p.handle || p.email)}
                                                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                    title="Permanently Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        {selectedProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="relative h-32 bg-gradient-to-r from-brand-purple/20 to-brand-cyan/20">
                            <button 
                                onClick={() => setSelectedProfile(null)}
                                className="absolute top-6 right-6 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-10 pb-10 -mt-12 relative">
                            <div className="w-24 h-24 rounded-3xl bg-[#0B0B0F] border-4 border-[#0B0B0F] shadow-2xl flex items-center justify-center overflow-hidden mb-6">
                                {selectedProfile.avatar_url ? (
                                    <img src={selectedProfile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <Users size={40} className="text-gray-700" />
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{selectedProfile.full_name || 'Anonymous Member'}</h3>
                                    <p className="text-sm font-bold text-brand-purple">@{selectedProfile.handle || 'no-handle'}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedProfile.is_verified ? 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                                        {selectedProfile.is_verified ? 'Verified Profile' : 'Pending Verification'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Email Address</p>
                                    <p className="text-sm font-bold text-white">{selectedProfile.email}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Membership Level</p>
                                    <p className="text-sm font-bold text-white uppercase">{selectedProfile.aura_tier || 'Standard'}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Joined Date</p>
                                    <p className="text-sm font-bold text-white">{new Date(selectedProfile.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Unique Identifier</p>
                                    <p className="text-[10px] font-mono text-gray-400 break-all">{selectedProfile.id}</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setSelectedProfile(null)}
                                    className="flex-1 py-4 bg-white/5 text-gray-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                                >
                                    Close Profile Summary
                                </button>
                                {selectedProfile.handle && (
                                    <a 
                                        href={`/member/@${selectedProfile.handle}`}
                                        target="_blank"
                                        className="flex-1 py-4 bg-brand-purple text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all text-center shadow-lg shadow-brand-purple/20"
                                    >
                                        Visit Public Profile
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminProfiles;
