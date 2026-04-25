// src/admin/pages/TrustPortal.tsx
// Admin Moderation Dashboard — 4-tab trust management interface

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, Flag, Users2, Clock,
  CheckCircle2, X, Ban, Zap, ChevronDown, MoreHorizontal,
  UserX, Shield, Trash2, Eye, MessageSquare, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

function useAdminFetch(path: string, session: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${WORKER_URL}${path}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session) load(); }, [path, session?.access_token]);
  return { data, loading, error, refetch: load };
}

// ─── Verification Queue Tab ────────────────────────────────────────────────
function VerificationQueueTab({ session }: { session: any }) {
  const { data, loading, error, refetch } = useAdminFetch('/api/admin/trust/verification-queue', session);
  const queue = data?.queue || [];
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (userId: string, manual: boolean) => {
    setProcessingId(userId);
    try {
      const r = await fetch(`${WORKER_URL}/api/admin/verify/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ manual_override: manual })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (manual) {
        toast.success(`✅ User manually verified!`);
      } else {
        toast.success(`🔐 OTP generated: ${d.otp} — Share this with the user via WhatsApp. It expires in 24h.`, { duration: 15000 });
      }
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    try {
      const r = await fetch(`${WORKER_URL}/api/admin/verify/${userId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success('Request rejected.');
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter">Verification Queue</h3>
          <p className="text-[11px] text-gray-500 mt-1">{queue.length} pending request{queue.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={refetch} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      {queue.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={40} />} title="Queue is empty" desc="No pending verification requests at this time." />
      ) : (
        queue.map((user: any) => {
          const socialLinks = (() => { try { return typeof user.social_links === 'string' ? JSON.parse(user.social_links) : user.social_links || {}; } catch { return {}; } })();
          const linkedSocials = Object.entries(socialLinks).filter(([, v]) => v).length;
          const monthsOld = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
          const isProcessing = processingId === user.id;

          return (
            <div key={user.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <img
                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=7c3aed&color=fff`}
                  className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
                  alt={user.full_name}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-white">{user.full_name}</p>
                    {user.handle && <p className="text-[10px] text-gray-500 font-bold">@{user.handle}</p>}
                  </div>
                  {user.bio && <p className="text-[12px] text-gray-400 mt-1 line-clamp-2">{user.bio}</p>}

                  {/* Trust Signals */}
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider mb-0.5">Account Age</p>
                      <p className="text-base font-black text-white">{monthsOld}mo</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider mb-0.5">Posts</p>
                      <p className="text-base font-black text-white">{user.post_count || 0}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider mb-0.5">Trades</p>
                      <p className="text-base font-black text-white">{user.completed_trades || 0}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider mb-0.5">Social Links</p>
                      <p className={`text-base font-black ${linkedSocials > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>{linkedSocials}</p>
                    </div>
                  </div>

                  {user.location && (
                    <p className="text-[10px] text-gray-500 mt-2">📍 {user.location}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5 flex-wrap">
                <button
                  onClick={() => handleApprove(user.id, false)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-40"
                >
                  {isProcessing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Zap size={14} />}
                  Approve & Generate OTP
                </button>
                <button
                  onClick={() => handleApprove(user.id, true)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-3 bg-brand-purple text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-purple/80 transition-all disabled:opacity-40"
                >
                  <ShieldCheck size={14} />
                  Instant Verify (VIP)
                </button>
                <button
                  onClick={() => handleReject(user.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] border border-white/10 text-red-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-500/10 transition-all disabled:opacity-40"
                >
                  <X size={14} />
                  Reject
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Strike & Risk Management Tab ─────────────────────────────────────────
function StrikeManagementTab({ session }: { session: any }) {
  const { data, loading, error, refetch } = useAdminFetch('/api/admin/trust/strikes', session);
  const users = data?.users || [];
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleStrikeUpdate = async (userId: string, strikes: number, aura_tier: string) => {
    setProcessingId(userId);
    try {
      const r = await fetch(`${WORKER_URL}/api/admin/trust/strikes/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ strikes, aura_tier })
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(`Strike count updated to ${strikes}`);
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleShadowBan = async (userId: string, shadowBanned: boolean) => {
    setProcessingId(userId);
    try {
      const r = await fetch(`${WORKER_URL}/api/admin/trust/shadow-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: userId, shadow_banned: shadowBanned })
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(shadowBanned ? 'User shadow-banned.' : 'Shadow ban lifted.');
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter">Strike & Risk Management</h3>
          <p className="text-[11px] text-gray-500 mt-1">{users.length} flagged account{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={refetch} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Shield size={40} />} title="No Flagged Accounts" desc="No users currently have strikes or warnings." />
      ) : (
        users.map((u: any) => {
          const isProcessing = processingId === u.id;
          const strikeColor = u.strikes >= 5 ? 'text-red-400' : u.strikes >= 3 ? 'text-amber-400' : 'text-yellow-400';

          return (
            <div key={u.id} className={`bg-white/[0.02] border rounded-3xl p-6 transition-all ${
              u.is_shadow_banned ? 'border-red-500/20 bg-red-500/5' : u.strikes >= 3 ? 'border-amber-500/20' : 'border-white/5'
            }`}>
              <div className="flex items-center gap-4">
                <img
                  src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'User')}&background=7c3aed&color=fff`}
                  className="w-12 h-12 rounded-2xl object-cover"
                  alt={u.full_name}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-white truncate">{u.full_name}</p>
                    {u.handle && <p className="text-[10px] text-gray-500">@{u.handle}</p>}
                    {u.is_shadow_banned && (
                      <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">SHADOW BANNED</span>
                    )}
                    {u.aura_tier === 'CAUTION' && (
                      <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">⚠️ CAUTION</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className={`text-sm font-black ${strikeColor}`}>⚡ {u.strikes} strike{u.strikes !== 1 ? 's' : ''}</span>
                    <span className="text-[11px] text-gray-500">{u.total_reports} report{u.total_reports !== 1 ? 's' : ''}</span>
                    <span className="text-[11px] text-gray-500">{u.completed_trades} trades</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => handleStrikeUpdate(u.id, Math.max(0, (u.strikes || 0) - 1), 'Newcomer')}
                  disabled={isProcessing || u.strikes === 0}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-30"
                >
                  Clear 1 Strike
                </button>
                <button
                  onClick={() => handleStrikeUpdate(u.id, 0, 'Newcomer')}
                  disabled={isProcessing || u.strikes === 0}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-30"
                >
                  Clear All Strikes
                </button>
                <button
                  onClick={() => handleStrikeUpdate(u.id, (u.strikes || 0) + 1, u.strikes >= 2 ? 'CAUTION' : u.aura_tier)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all"
                >
                  + Add Strike
                </button>
                {u.is_shadow_banned ? (
                  <button
                    onClick={() => handleShadowBan(u.id, false)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all"
                  >
                    Lift Shadow Ban
                  </button>
                ) : (
                  <button
                    onClick={() => handleShadowBan(u.id, true)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                  >
                    <UserX size={12} className="inline mr-1" />
                    Shadow Ban
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Keyword Alert Feed Tab ────────────────────────────────────────────────
const REASON_LABELS: Record<string, string> = {
  off_platform: '💸 Off-Platform Payment',
  scam: '🚨 Scam Phrase',
  suspicious_pricing: '💰 Suspicious Pricing',
  phone_number_leak: '📵 Phone Number Leak',
  keyword_match: '🔍 Keyword Match',
};

function KeywordAlertFeedTab({ session }: { session: any }) {
  const { data, loading, error, refetch } = useAdminFetch('/api/admin/trust/flagged-content', session);
  const flags = data?.flags || [];
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (flagId: string, status: 'dismissed' | 'actioned', action?: string) => {
    setProcessingId(flagId);
    try {
      const r = await fetch(`${WORKER_URL}/api/admin/trust/flagged-content/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ status, action })
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(status === 'dismissed' ? 'Flag dismissed.' : 'Post actioned & removed.');
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter">Keyword Alert Feed</h3>
          <p className="text-[11px] text-gray-500 mt-1">{flags.length} pending alert{flags.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={refetch} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      {flags.length === 0 ? (
        <EmptyState icon={<Flag size={40} />} title="No Active Alerts" desc="No posts have triggered the keyword blacklist recently." />
      ) : (
        flags.map((flag: any) => {
          const isProcessing = processingId === flag.id;
          const reasonLabel = REASON_LABELS[flag.reason] || flag.reason;

          return (
            <div key={flag.id} className="bg-amber-500/[0.03] border border-amber-500/15 rounded-3xl p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-amber-400">{reasonLabel}</p>
                    <p className="text-[10px] text-gray-500">
                      @{flag.user_handle || 'unknown'} · {new Date(flag.created_at).toLocaleString('en-KE')}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                  keyword: "{flag.keyword_triggered}"
                </span>
              </div>

              {/* Content Snippet */}
              <div className="p-4 bg-black/30 rounded-2xl mb-4 border border-white/5">
                <p className="text-[12px] text-gray-300 leading-relaxed font-mono">
                  {flag.content_snippet}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleAction(flag.id, 'dismissed')}
                  disabled={isProcessing}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-40"
                >
                  Dismiss (False Positive)
                </button>
                <button
                  onClick={() => handleAction(flag.id, 'actioned', 'delete_post')}
                  disabled={isProcessing || !flag.post_id}
                  className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-40"
                >
                  <Trash2 size={12} />
                  Delete Post
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Vouching Registry Tab ─────────────────────────────────────────────────
function VouchingRegistryTab({ session }: { session: any }) {
  const { data, loading, error, refetch } = useAdminFetch('/api/admin/trust/vouches', session);
  const vouches = data?.vouches || [];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter">Vouching Registry</h3>
          <p className="text-[11px] text-gray-500 mt-1">{vouches.length} active vouch{vouches.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={refetch} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      {vouches.length === 0 ? (
        <EmptyState icon={<Users2 size={40} />} title="No Vouches Yet" desc="Community vouches will appear here as established members endorse others." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/5">
          <table className="w-full">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Voucher</th>
                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">→</th>
                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Vouchee</th>
                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vouches.map((v: any) => (
                <tr key={v.id} className="hover:bg-white/[0.02] transition-all">
                  <td className="px-6 py-4">
                    <p className="text-[12px] font-bold text-white">{v.voucher_name}</p>
                    <p className="text-[10px] text-gray-500">@{v.voucher_handle}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">→</td>
                  <td className="px-6 py-4">
                    <p className="text-[12px] font-bold text-white">{v.vouchee_name}</p>
                    <p className="text-[10px] text-gray-500">@{v.vouchee_handle}</p>
                  </td>
                  <td className="px-6 py-4">
                    {v.vouchee_banned ? (
                      <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                        Vouchee Banned — Voucher Penalized
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[11px] text-gray-500">
                    {new Date(v.created_at).toLocaleDateString('en-KE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Utility Components ────────────────────────────────────────────────────
const LoadingState = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
    ⚠️ {message}
  </div>
);

const EmptyState = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
    <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-600">
      {icon}
    </div>
    <h3 className="font-black text-xl uppercase tracking-tighter text-white">{title}</h3>
    <p className="text-gray-500 text-sm max-w-xs">{desc}</p>
  </div>
);

// ─── Main Trust Portal Page ────────────────────────────────────────────────
const TABS = [
  { id: 'verification', label: 'Verification Queue', icon: ShieldCheck },
  { id: 'strikes', label: 'Strike Management', icon: AlertTriangle },
  { id: 'keywords', label: 'Keyword Alerts', icon: Flag },
  { id: 'vouches', label: 'Vouching Registry', icon: Users2 },
];

export default function TrustPortal() {
  const [activeTab, setActiveTab] = useState('verification');
  // Grab session from localStorage (same pattern used in other admin pages)
  const session = (() => {
    try {
      const raw = localStorage.getItem('sb-auth-token') || localStorage.getItem('supabase.auth.token');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.currentSession || parsed;
    } catch { return null; }
  })();

  return (
    <div className="flex-1 min-h-screen p-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center">
            <ShieldCheck size={22} className="text-brand-purple" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Moderation Dashboard</h1>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Community Moderation Dashboard</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 max-w-xl">
          Manage verification requests, user strikes, keyword-flagged content, and community vouching relationships from one place.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                : 'text-gray-500 hover:text-white bg-white/[0.02] border border-white/5 hover:border-white/10'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'verification' && <VerificationQueueTab session={session} />}
          {activeTab === 'strikes' && <StrikeManagementTab session={session} />}
          {activeTab === 'keywords' && <KeywordAlertFeedTab session={session} />}
          {activeTab === 'vouches' && <VouchingRegistryTab session={session} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
