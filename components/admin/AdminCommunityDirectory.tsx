import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, ShieldCheck, ShieldOff, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

interface Profile {
  id: string;
  handle: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  aura_tier: string;
  aura_points: number;
  is_verified: number;
  verification_status: string;
  created_at: string;
  otp_code?: string;
}

export default function AdminCommunityDirectory() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const authHeaders = {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json'
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${WORKER_URL}/api/admin/profiles`, { headers: authHeaders });
      if (!resp.ok) throw new Error('Failed to fetch');
      const data = await resp.json();
      setProfiles(Array.isArray(data) ? data : data.profiles || []);
    } catch (e: any) {
      toast.error('Could not load profiles: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleApproveAndSendOtp = async (profile: Profile) => {
    setVerifyingId(profile.id);
    try {
      const resp = await fetch(`${WORKER_URL}/api/admin/verify/${profile.id}`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      toast.success(`OTP generated: ${data.otp} — Send to user via WhatsApp/Email!`, { duration: 10000 });
      fetchProfiles();
    } catch (e: any) {
      toast.error(e.message || 'Verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleManualVerify = async (profile: Profile) => {
    if (!confirm(`Manually verify @${profile.handle}? This skips OTP and directly awards the badge.`)) return;
    setVerifyingId(profile.id);
    try {
      const resp = await fetch(`${WORKER_URL}/api/admin/verify/${profile.id}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ manual: true })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      toast.success(`@${profile.handle} is now verified!`);
      fetchProfiles();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRevoke = async (profile: Profile) => {
    if (!confirm(`Revoke verification for @${profile.handle}?`)) return;
    setVerifyingId(profile.id);
    try {
      const resp = await fetch(`${WORKER_URL}/api/admin/profiles/${profile.id}/revoke-verification`, {
        method: 'POST',
        headers: authHeaders
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      toast.success(`Verification revoked for @${profile.handle}`);
      fetchProfiles();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const filtered = profiles.filter(p =>
    !search ||
    p.handle?.toLowerCase().includes(search.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (p: Profile) => {
    if (p.is_verified) return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Verified</span>;
    if (p.verification_status === 'requested') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">⏳ Pending</span>;
    if (p.verification_status === 'approved') return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">📨 OTP Sent</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/5 text-gray-500 border border-white/10">Unverified</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">Community Directory</h2>
          <p className="text-gray-500 text-xs mt-1">{profiles.length} operators in the system</p>
        </div>
        <button onClick={fetchProfiles} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black hover:bg-white/10 transition-all">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search operators..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:border-brand-purple outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users size={32} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm font-bold">No profiles found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
              <img
                src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || p.handle || 'U')}&background=7C3AED&color=fff`}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                alt={p.full_name}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-white">{p.full_name || 'Anonymous'}</span>
                  <span className="text-gray-500 text-xs">@{p.handle}</span>
                  {statusBadge(p)}
                </div>
                <p className="text-[11px] text-gray-600 truncate">{p.email}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {p.verification_status === 'requested' && !p.is_verified && (
                  <button
                    onClick={() => handleApproveAndSendOtp(p)}
                    disabled={verifyingId === p.id}
                    title="Approve & generate OTP"
                    className="p-2 bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-xl hover:bg-brand-cyan/20 transition-all disabled:opacity-50"
                  >
                    <Shield size={14} />
                  </button>
                )}
                {!p.is_verified && (
                  <button
                    onClick={() => handleManualVerify(p)}
                    disabled={verifyingId === p.id}
                    title="Manually verify (no OTP)"
                    className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <ShieldCheck size={14} />
                  </button>
                )}
                {!!p.is_verified && (
                  <button
                    onClick={() => handleRevoke(p)}
                    disabled={verifyingId === p.id}
                    title="Revoke verification"
                    className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    <ShieldOff size={14} />
                  </button>
                )}
                <a href={`/op/${p.handle}`} target="_blank" rel="noreferrer" className="p-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl hover:text-white transition-all">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
