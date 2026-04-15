/**
 * EscrowWidget.tsx — DJ Flowerz
 * Drop-in escrow lifecycle UI. Role-aware (buyer / seller / admin).
 *
 * Usage:
 *   <EscrowWidget escrowId="esc_abc123" />
 *   <EscrowWidget listingId="lst_xyz" sellerId="uid_seller" amountKes={4500} itemDescription="Pioneer CDJ-2000NXS2" />
 */

import React, { useState } from 'react';
import {
    Lock, Package, CheckCircle2, AlertTriangle, Clock, XCircle,
    ShieldCheck, RotateCcw, ArrowRight, Loader2, ChevronRight,
    UserX, Star, Paperclip
} from 'lucide-react';
import { useEscrow, computeEscrowFee, EscrowState, EscrowTransaction, EscrowEvent } from '../hooks/useEscrow';
import { useEscrowChat } from '../hooks/useEscrowChat';
import { R2Upload } from './ui/R2Upload';
import { VoiceRecorder } from './ui/VoiceRecorder';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// ─── State config ─────────────────────────────────────────────────────────────

const STATE_META: Record<EscrowState, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    PENDING:   { label: 'Awaiting Payment',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: <Clock size={14} /> },
    FUNDED:    { label: 'Payment Held',       color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <Lock size={14} /> },
    SHIPPED:   { label: 'In Transit',         color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: <Package size={14} /> },
    DELIVERED: { label: 'Delivered',          color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <CheckCircle2 size={14} /> },
    RELEASED:  { label: 'Funds Released',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <CheckCircle2 size={14} /> },
    DISPUTED:  { label: 'Under Dispute',      color: 'text-red-400',     bg: 'bg-red-500/10',     icon: <AlertTriangle size={14} /> },
    RESOLVED:  { label: 'Resolved',           color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <ShieldCheck size={14} /> },
    REFUNDED:  { label: 'Refunded',           color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <RotateCcw size={14} /> },
    CANCELLED: { label: 'Cancelled',          color: 'text-gray-500',    bg: 'bg-white/5',        icon: <XCircle size={14} /> },
};

const STEPS: { key: EscrowState; label: string }[] = [
    { key: 'PENDING',  label: 'Payment pending' },
    { key: 'FUNDED',   label: 'Funds held'      },
    { key: 'SHIPPED',  label: 'Item shipped'    },
    { key: 'RELEASED', label: 'Funds released'  },
];

const STATE_ORDER: EscrowState[] = ['PENDING', 'FUNDED', 'SHIPPED', 'RELEASED', 'RESOLVED', 'REFUNDED', 'CANCELLED'];

// ─── Main Component ───────────────────────────────────────────────────────────

interface EscrowWidgetProps {
    escrowId?: string;
    listingId?: string;
    sellerId?: string;
    amountKes?: number;
    itemDescription?: string;
    className?: string;
}

export default function EscrowWidget({
    escrowId: initialEscrowId,
    listingId,
    sellerId,
    amountKes,
    itemDescription,
    className = '',
}: EscrowWidgetProps) {
    const [escrowId, setEscrowId] = useState<string | null>(initialEscrowId ?? null);

    const {
        escrow, events, loading, error,
        createEscrow, fund, ship, deliver, dispute, resolve, cancel,
        verifyCode, submitReview, uploadEvidence, reportUser,
        isBuyer, isSeller,
        canFund, canShip, canDeliver, canDispute, canCancel, canVerifyCode, canReview,
        autoReleaseDaysLeft,
    } = useEscrow(escrowId);

    const [counterparty, setCounterparty] = useState<any>(null);

    useEffect(() => {
        if (escrow) {
            const otherId = isBuyer ? escrow.seller_id : escrow.buyer_id;
            fetch(`${import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke'}/api/admin/profiles/${otherId}`)
                .then(r => r.json())
                .then(data => setCounterparty(data.profile))
                .catch(() => {});
        }
    }, [escrow, isBuyer]);

    const [view, setView] = useState<'status' | 'chat' | 'timeline' | 'details'>('status');

    // ── Create flow ────────────────────────────────────────────────────────────
    if (!escrowId) {
        return (
            <CreatePanel
                itemDescription={itemDescription ?? ''}
                amountKes={amountKes ?? 0}
                loading={loading}
                error={error}
                onCreate={async () => {
                    if (!listingId || !sellerId || !amountKes || !itemDescription) return;
                    try {
                        const e = await createEscrow({ listing_id: listingId, seller_id: sellerId, amount_kes: amountKes, item_description: itemDescription });
                        setEscrowId(e.id);
                        toast.success('Escrow created!', { description: 'Funds are locked until you confirm delivery.' });
                    } catch { /* error already in state */ }
                }}
                className={className}
            />
        );
    }

    if (loading && !escrow) {
        return (
            <div className={`glass-card rounded-2xl p-6 flex items-center justify-center gap-3 ${className}`}>
                <Loader2 className="animate-spin text-brand-purple" size={20} />
                <span className="text-gray-400 text-sm">Loading escrow…</span>
            </div>
        );
    }

    const meta = escrow ? STATE_META[escrow.state] : null;
    const isTerminal = escrow && ['RELEASED', 'RESOLVED', 'REFUNDED', 'CANCELLED'].includes(escrow.state);

    return (
        <div className={`glass-card rounded-2xl border border-white/10 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Escrow Protection</p>
                    <p className="font-semibold text-white text-sm leading-snug">{escrow?.item_description ?? '—'}</p>
                </div>
                {meta && (
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${meta.color} ${meta.bg}`}>
                        {meta.icon} {meta.label}
                    </span>
                )}
            </div>

            {/* Amount row */}
            {escrow && (
                <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                    <AmountCard label="Total" value={escrow.amount_kes} />
                    <AmountCard label="Platform fee" value={escrow.fee_kes} muted />
                    <AmountCard label="Seller gets" value={escrow.seller_receives} accent />
                </div>
            )}

            {/* Auto-release notice */}
            {escrow?.state === 'SHIPPED' && autoReleaseDaysLeft !== null && (
                <div className="mx-4 mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300">
                    <Clock size={14} className="shrink-0" />
                    Funds auto-release to seller in <strong className="mx-1">{autoReleaseDaysLeft} day{autoReleaseDaysLeft !== 1 ? 's' : ''}</strong> if you don't confirm delivery.
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mx-4 mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* Tab nav */}
            <div className="flex gap-1 px-4 pt-4">
                {(['status', 'chat', 'timeline', 'details'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setView(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                            view === t ? 'bg-brand-purple/20 text-brand-purple' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Views */}
            <div className="px-4 pb-4">
                {view === 'status'   && <StatusView escrow={escrow} isBuyer={isBuyer} isSeller={isSeller} counterparty={counterparty} />}
                {view === 'chat'     && <ChatView escrowId={escrowId!} userId={user?.id!} />}
                {view === 'timeline' && <TimelineView events={events} />}
                {view === 'details'  && <DetailsView escrow={escrow} />}
                {view === 'status' && canReview && <ReviewPanel onSubmit={submitReview} loading={loading} />}
            </div>

            {/* Actions */}
            {!isTerminal && escrow && (
                <ActionPanel
                    escrow={escrow}
                    loading={loading}
                    canFund={canFund}
                    canShip={canShip}
                    canDeliver={canDeliver}
                    canDispute={canDispute}
                    canCancel={canCancel}
                    canVerifyCode={canVerifyCode}
                    onFund={async () => {
                        const ref = `pay_${Math.random().toString(36).slice(2, 10)}`;
                        await fund(ref);
                        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
                        toast.success('Payment locked!', { description: 'Funds are held securely until delivery.' });
                    }}
                    onShip={async (params) => {
                        await ship(params);
                        toast.success('Marked as shipped!', { description: 'Release code has been sent to the buyer.' });
                    }}
                    onDeliver={async () => {
                        await deliver();
                        toast.success('Delivery confirmed!', { description: 'Funds have been released to the seller.' });
                    }}
                    onVerifyCode={async (code) => {
                        await verifyCode(code);
                        if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
                        toast.success('Code verified!', { description: 'Handshake complete. Funds released.' });
                    }}
                    onDispute={async (reason) => {
                        await dispute(reason);
                        if (navigator.vibrate) navigator.vibrate(100);
                        toast.info('Dispute raised.', { description: 'Please upload evidence to support your case.' });
                    }}
                    onEvidence={async (params) => {
                        await uploadEvidence(params);
                        toast.success('Evidence uploaded.');
                    }}
                    onResolve={resolve}
                    onCancel={async () => {
                        await cancel();
                        toast.success('Escrow cancelled.');
                    }}
                    onReport={async (reason) => {
                        if (!escrow) return;
                        const targetId = isBuyer ? escrow.seller_id : escrow.buyer_id;
                        await reportUser({ reported_id: targetId, reason });
                        toast.error('User Reported', { description: 'Our security team has been notified.' });
                    }}
                    isSeller={isSeller}
                    isAdmin={user?.role === 'admin'}
                />
            )}

            {isTerminal && meta && (
                <div className={`mx-4 mb-4 text-center py-3 px-4 rounded-xl text-xs font-medium ${meta.bg} ${meta.color} border border-white/5`}>
                    {meta.icon} This escrow is closed — {meta.label}
                </div>
            )}
        </div>
    );
}

// ─── Sub Panels ───────────────────────────────────────────────────────────────

function CreatePanel({ itemDescription, amountKes, loading, error, onCreate, className }: {
    itemDescription: string; amountKes: number; loading: boolean; error: string | null;
    onCreate: () => void; className?: string;
}) {
    const fee = computeEscrowFee(amountKes);
    return (
        <div className={`glass-card rounded-2xl border border-white/10 overflow-hidden ${className}`}>
            <div className="p-5 border-b border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Protected Purchase</p>
                <p className="font-semibold text-white text-sm">{itemDescription}</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                <AmountCard label="Item price" value={amountKes} />
                <AmountCard label="Platform fee" value={fee} muted />
                <AmountCard label="You pay" value={amountKes} accent />
            </div>
            <div className="p-4 space-y-3">
                <div className="flex items-start gap-2 bg-brand-purple/10 border border-brand-purple/20 rounded-xl px-4 py-3 text-xs text-gray-300">
                    <Lock size={14} className="text-brand-purple shrink-0 mt-0.5" />
                    Your payment is held securely until you confirm the item arrived in the described condition.
                </div>
                {error && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}
                <button
                    onClick={onCreate}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/80 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    {loading ? 'Creating…' : 'Start Secure Purchase'}
                    {!loading && <ArrowRight size={16} />}
                </button>
            </div>
        </div>
    );
}

function StatusView({ escrow, isBuyer, isSeller, counterparty }: { escrow: EscrowTransaction | null; isBuyer: boolean; isSeller: boolean; counterparty?: any }) {
    if (!escrow) return null;
    const currentIdx = STATE_ORDER.indexOf(escrow.state);
    const isDisputed = escrow.state === 'DISPUTED';

    return (
        <div className="pt-4 space-y-4">
            {/* Progress stepper */}
            <div className="flex items-center">
                {STEPS.map((step, i) => {
                    const stepIdx = STATE_ORDER.indexOf(step.key);
                    const done = !isDisputed && currentIdx >= stepIdx;
                    const active = !isDisputed && escrow.state === step.key;
                    return (
                        <React.Fragment key={step.key}>
                            {i > 0 && <div className={`flex-1 h-px ${done ? 'bg-emerald-500/60' : 'bg-white/10'}`} />}
                            <div className="flex flex-col items-center gap-1.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition ${
                                    isDisputed ? 'border-red-500 bg-red-500/10 text-red-400' :
                                    done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' :
                                    active ? 'border-brand-purple bg-brand-purple/20 text-brand-purple' :
                                    'border-white/10 bg-white/5 text-gray-600'
                                }`}>
                                    {isDisputed ? '!' : done ? '✓' : i + 1}
                                </div>
                                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${active ? 'text-white' : done ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {step.label}
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
            
            {isDisputed && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase font-black text-red-500 tracking-widest mb-1">⚖ Dispute Courtroom Active</p>
                    <p className="text-[11px] text-white">Upload evidence below. An admin will review and resolve this deal.</p>
                </div>
            )}

            {/* Evidence Vault */}
            {escrow.evidence && escrow.evidence.length > 0 && (
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Evidence Vault</p>
                    <div className="grid grid-cols-2 gap-2">
                        {escrow.evidence.map((ev: any) => (
                            <a 
                                key={ev.id}
                                href={ev.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block bg-black/20 border border-white/10 rounded-lg p-2 hover:border-brand-purple transition"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                        ev.role === 'buyer' ? 'bg-blue-500/10 text-blue-400' : 
                                        ev.role === 'seller' ? 'bg-amber-500/10 text-amber-400' : 
                                        'bg-purple-500/10 text-purple-400'
                                    }`}>
                                        {ev.role}
                                    </span>
                                    <ArrowRight size={8} className="text-gray-600 group-hover:text-brand-purple transition-colors" />
                                </div>
                                <p className="text-[9px] text-gray-400 truncate">{ev.caption || 'Attached Evidence'}</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}


            {/* Counterparty card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500">{isBuyer ? 'Seller' : 'Buyer'}</p>
                        <p className="text-sm font-semibold text-white">{counterparty?.full_name || 'Counterparty'}</p>
                    </div>
                    {counterparty && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                            <Star size={10} className="text-amber-400" fill="currentColor" />
                            <span className="text-[10px] font-bold text-white">{counterparty.avg_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                    )}
                </div>

                {counterparty && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                            <p className="text-[8px] uppercase text-gray-600 mb-0.5">Success Rate</p>
                            <p className="text-[10px] font-bold text-emerald-400">
                                {counterparty.total_deals > 0 
                                    ? Math.round((counterparty.success_deals / counterparty.total_deals) * 100)
                                    : 100}%
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                            <p className="text-[8px] uppercase text-gray-600 mb-0.5">Avg. Delivery</p>
                            <p className="text-[10px] font-bold text-brand-cyan">
                                {counterparty.avg_release_hours 
                                    ? Math.round(counterparty.avg_release_hours) + 'h'
                                    : '< 1h'}
                            </p>
                        </div>
                    </div>
                )}

                {counterparty?.seller_tier && counterparty.seller_tier !== 'none' && (
                    <div className={`px-2 py-1 rounded text-[9px] font-black uppercase text-center tracking-widest border border-current ${
                        counterparty.seller_tier === 'gold'   ? 'text-amber-400 bg-amber-400/10' :
                        counterparty.seller_tier === 'silver' ? 'text-gray-300 bg-gray-300/10' :
                        'text-orange-400 bg-orange-400/10'
                    }`}>
                        🏆 {counterparty.seller_tier} Level
                    </div>
                )}
            </div>

            {/* Tracking card */}
            {(escrow.tracking_number || isDisputed) && (
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Logistics & Support</p>
                    {escrow.tracking_number && (
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-blue-400 font-mono">{escrow.shipping_carrier}</p>
                            <p className="text-xs text-white font-mono">{escrow.tracking_number}</p>
                        </div>
                    )}
                    {escrow.dispute_reason && (
                        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mt-2 border border-red-500/20">
                            ⚠ Dispute: "{escrow.dispute_reason}"
                        </p>
                    )}
                </div>
            )}
            </div>
        );
    }

function ReviewPanel({ onSubmit, loading }: { onSubmit: (p: any) => Promise<any>; loading: boolean }) {
    const [rating, setRating] = useState(5);
    const [text, setText] = useState('');
    const [done, setDone] = useState(false);

    if (done) return (
        <div className="mt-4 p-4 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
             <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={24} />
             <p className="text-xs text-emerald-400 font-bold">Review submitted! Thank you.</p>
        </div>
    );

    return (
        <div className="mt-6 border-t border-white/5 pt-6 space-y-4">
            <div>
                 <p className="text-xs font-semibold text-white mb-3">Rate your interaction</p>
                 <div className="flex gap-2">
                     {[1, 2, 3, 4, 5].map(star => (
                         <button 
                            key={star} 
                            onClick={() => setRating(star)}
                            className={`p-1.5 rounded-lg transition ${rating >= star ? 'text-amber-400 bg-amber-400/10' : 'text-gray-600'}`}
                         >
                             <CheckCircle2 size={24} fill={rating >= star ? 'currentColor' : 'none'} />
                         </button>
                     ))}
                 </div>
            </div>
            <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-purple h-24 resize-none"
                placeholder="How was the process? (Optional)"
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <button
                onClick={async () => { await onSubmit({ rating, review_text: text }); setDone(true); }}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/80 text-white font-semibold text-sm transition disabled:opacity-50"
            >
                Submit Review
            </button>
        </div>
    );
}

function TimelineView({ events }: { events: EscrowEvent[] }) {
    if (!events?.length) return (
        <p className="text-gray-500 text-xs text-center py-6">No events yet.</p>
    );

    const EVENT_ICONS: Record<string, string> = {
        CREATED: '○', FUNDED: '🔒', SHIPPED: '📦',
        DELIVERED_AND_RELEASED: '✓', AUTO_RELEASED: '⏱',
        DISPUTED: '⚠', RESOLVED_RELEASE: '✓', RESOLVED_REFUND: '↩', CANCELLED: '×',
    };

    return (
        <div className="pt-4 space-y-0">
            {events.map((ev, i) => (
                <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs">
                            {EVENT_ICONS[ev.event] ?? '·'}
                        </div>
                        {i < events.length - 1 && <div className="w-px flex-1 bg-white/5 min-h-[16px]" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                        <p className="text-xs font-medium text-white capitalize">
                            {ev.event.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                        </p>
                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{ev.note}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{new Date(ev.created_at).toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DetailsView({ escrow }: { escrow: EscrowTransaction | null }) {
    if (!escrow) return null;
    const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : '—';
    const rows = [
        ['Escrow ID',    escrow.id],
        ['Listing ID',   escrow.listing_id],
        ['Paystack ref', escrow.paystack_ref ?? '—'],
        ['Created',      fmt(escrow.created_at)],
        ['Funded',       fmt(escrow.funded_at)],
        ['Shipped',      fmt(escrow.shipped_at)],
        ['Released',     fmt(escrow.released_at)],
        ['Auto-release', fmt(escrow.auto_release_at)],
    ];
    return (
        <div className="pt-4">
            <table className="w-full text-xs">
                <tbody>
                    {rows.map(([k, v]) => (
                        <tr key={k} className="border-b border-white/5">
                            <td className="py-2 pr-3 text-gray-500 w-2/5">{k}</td>
                            <td className="py-2 text-gray-300 font-mono break-all">{v}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Action Panel ─────────────────────────────────────────────────────────────

function ActionPanel({ escrow, loading, canFund, canShip, canDeliver, canDispute, canCancel, canVerifyCode, onFund, onShip, onDeliver, onVerifyCode, onDispute, onEvidence, onResolve, onCancel, onReport, isSeller, isAdmin }: {
    escrow: EscrowTransaction; loading: boolean;
    canFund: boolean; canShip: boolean; canDeliver: boolean; canDispute: boolean; canCancel: boolean; canVerifyCode: boolean;
    onFund: () => void; onShip: (p: { tracking_number: string; shipping_carrier: string }) => void;
    onDeliver: () => void; onVerifyCode: (code: string) => void; onDispute: (r: string) => void;
    onEvidence: (p: { file_url: string; file_type?: string; caption?: string }) => void;
    onResolve: (outcome: 'release' | 'refund', notes?: string) => void;
    onCancel: () => void; onReport: (reason: string) => void; isSeller: boolean; isAdmin: boolean;
}) {
    const [modal, setModal] = useState<'ship' | 'dispute' | 'evidence' | 'verify' | 'report' | 'resolve' | null>(null);
    const [carrier, setCarrier] = useState('');
    const [tracking, setTracking] = useState('');
    const [reason, setReason] = useState('');
    const [otp, setOtp] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [resolutionOutcome, setResolutionOutcome] = useState<'release' | 'refund'>('release');

    const canReport = !!escrow;
    const isDisputed = escrow.state === 'DISPUTED';

    if (!canFund && !canShip && !canDeliver && !canDispute && !canCancel && !canVerifyCode && !canReport && !(isAdmin && isDisputed)) return null;

    return (
        <div className="border-t border-white/5 p-4 space-y-2">
            {/* Admin Resolution Controls */}
            {isAdmin && isDisputed && modal !== 'resolve' && (
                <button
                    onClick={() => setModal('resolve')}
                    className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-600/80 text-white font-black text-sm uppercase tracking-widest transition flex items-center justify-center gap-2"
                >
                    ⚖ Finalize Adjudication
                </button>
            )}

            {modal === 'resolve' && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-black text-white uppercase tracking-widest text-center">Dispute Resolution Window</p>
                    <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => setResolutionOutcome('release')}
                            className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition ${resolutionOutcome === 'release' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/10 text-gray-500'}`}
                         >
                             Release to Seller
                         </button>
                         <button 
                            onClick={() => setResolutionOutcome('refund')}
                            className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition ${resolutionOutcome === 'refund' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-white/10 text-gray-500'}`}
                         >
                             Refund to Buyer
                         </button>
                    </div>
                    <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 h-16"
                        placeholder="Resolution notes (e.g. proof verified)..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={async () => { await onResolve(resolutionOutcome, reason); setModal(null); setReason(''); }}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-600/80 text-white font-semibold text-sm transition"
                        >
                            Confirm Resolution
                        </button>
                        <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm">
                            Back
                        </button>
                    </div>
                </div>
            )}
            {canFund && (
                <button
                    onClick={onFund}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/80 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    Pay & Lock Funds
                </button>
            )}

            {canDeliver && (
                <button
                    onClick={onDeliver}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-600/80 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Confirm Delivery & Release Funds
                </button>
            )}

            {canShip && modal !== 'ship' && (
                <button
                    onClick={() => setModal('ship')}
                    className="w-full py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                    <Package size={16} /> Mark as Shipped <ArrowRight size={14} />
                </button>
            )}

            {modal === 'ship' && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-white">Shipping Details</p>
                    <div className="grid grid-cols-2 gap-2">
                         <input 
                            placeholder="Carrier (G4S, Wells Fargo)"
                            value={carrier}
                            onChange={e => setCarrier(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                         />
                         <input 
                            placeholder="Tracking #"
                            value={tracking}
                            onChange={e => setTracking(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                         />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => { await onShip({ carrier, tracking }); setModal(null); }}
                            disabled={!carrier || !tracking || loading}
                            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-600/80 text-white font-semibold text-xs"
                        >
                            Mark Shipped
                        </button>
                        <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-xs">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {canVerifyCode && modal !== 'verify' && (
                <button
                    onClick={() => setModal('verify')}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-600/80 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={16} /> Verify Release Code
                </button>
            )}

            {modal === 'verify' && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-white text-center">Enter Release Code</p>
                    <p className="text-[10px] text-gray-500 text-center px-4">The buyer will give you a 4-digit code once they have received and inspected the item.</p>
                    <input
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-white focus:outline-none focus:border-brand-purple"
                        placeholder="••••"
                        maxLength={4}
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={async () => { await onVerifyCode(otp); setModal(null); }}
                            disabled={otp.length !== 4 || loading}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-600/80 text-white font-semibold text-sm transition disabled:opacity-50"
                        >
                            Verify & Get Paid
                        </button>
                        <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition">
                            Cancel
                        </button>
                    </div>
                    {escrow.release_attempts > 0 && (
                        <p className="text-[10px] text-red-500 text-center font-medium">
                            Warning: {escrow.release_attempts} / 3 failed attempts. Transaction will lock on next failure.
                        </p>
                    )}
                </div>
            )}


            {canDispute && modal !== 'dispute' && (
                <button
                    onClick={() => setModal('dispute')}
                    className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm transition flex items-center justify-center gap-2"
                >
                    <AlertTriangle size={14} /> Raise a Dispute
                </button>
            )}

            {modal === 'dispute' && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-red-400">Raise a Dispute</p>
                    <textarea
                        className="w-full bg-black/30 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition resize-none"
                        placeholder="Describe the issue clearly (e.g. item not received, item damaged, wrong item sent)…"
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => { onDispute(reason); setModal(null); }}
                            disabled={!reason || reason.length < 10 || loading}
                            className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-700/80 text-white font-semibold text-sm transition disabled:opacity-50"
                        >
                            Submit Dispute
                        </button>
                        <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition">
                            Cancel
                        </button>
                    </div>
                </div>
            )}




            {canReport && modal !== 'report' && (
                <button
                    onClick={() => setModal('report')}
                    className="w-full py-2 text-red-500/50 hover:text-red-500 text-[10px] uppercase font-black tracking-widest transition flex items-center justify-center gap-1.5 opacity-50 hover:opacity-100"
                >
                    <UserX size={12} /> Report Scammer
                </button>
            )}

            {modal === 'report' && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest text-center">Identity Hub: Fraud Report</p>
                    <textarea 
                        className="w-full bg-black/40 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 h-20"
                        placeholder="Reason for report (Scam, item not as described, abuse)..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={async () => { await onReport(reason); setModal(null); setReason(''); }}
                            disabled={!reason || loading}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-600/80 text-white font-semibold text-sm transition"
                        >
                            Submit Report
                        </button>
                        <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm">
                            Cancel
                        </button>
                    </div>
                </div>
            )}


            {canCancel && !modal && (
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="w-full py-2 text-gray-600 hover:text-gray-400 text-xs transition"
                >
                    Cancel Escrow
                </button>
            )}
        </div>
    );
}

// ─── Primitives ───────────────────────────────────────────────────────────────


// ─── Chat View ─────────────────────────────────────────────────────────────

function ChatView({ escrowId, userId }: { escrowId: string; userId: string }) {
    const { messages, loading, sending, sendMessage, refresh } = useEscrowChat(escrowId);
    const [content, setContent] = useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!content.trim() || sending) return;
        const success = await sendMessage(content.trim());
        if (success) {
            setContent('');
            refresh();
        } else {
            toast.error("Message failed to send");
        }
    };

    return (
        <div className="flex flex-col h-[400px] mt-4">
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10"
            >
                {loading && messages.length === 0 ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-gray-700" size={24} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="py-10 text-center opacity-30">
                        <Lock className="mx-auto mb-2" size={24} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Secure Deal Chat</p>
                        <p className="text-[9px] mt-1">Chat is private between buyer & seller</p>
                    </div>
                ) : messages.map((msg: any) => {
                    const isMe = msg.sender_id === userId;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                 {msg.content.includes('[Attachment: Image]') ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase font-black tracking-widest opacity-50 mb-1">Shared Image</p>
                                        <img 
                                            src={msg.attachment_url} 
                                            alt="Chat Attachment" 
                                            className="rounded-lg max-h-60 w-full object-cover border border-white/10 hover:border-brand-purple transition-all cursor-zoom-in"
                                            onClick={() => window.open(msg.attachment_url, '_blank')}
                                        />
                                    </div>
                                 ) : msg.attachment_url && msg.attachment_url.includes('.webm') ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase font-black tracking-widest opacity-50 mb-1">Voice Message</p>
                                        <audio controls src={msg.attachment_url} className="w-full max-w-[200px] h-8 accent-brand-purple" />
                                    </div>
                                 ) : (
                                    msg.content
                                 )}
                             <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1 px-1">
                                 {isMe ? 'YOU' : (msg.username || 'SENDER').toUpperCase()} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex gap-2 pt-4 border-t border-white/5 relative">
                {/* Image upload button inside chat */}
                <div className="absolute -top-12 left-0 right-0 px-2 flex gap-2">
                    <R2Upload 
                        folder={`escrow_${escrowId}/chat`}
                        label="Share Media"
                        onUploadSuccess={(url) => sendMessage(`[Attachment: Image]`, url)}
                        accept="image/*"
                    />
                    <VoiceRecorder 
                        folder={`escrow_${escrowId}/chat`}
                        onUploadSuccess={(url) => sendMessage(`[Voice Message]`, url)}
                    />
                </div>
                
                <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple transition"
                />
                <button
                    onClick={handleSend}
                    disabled={sending || !content.trim()}
                    className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black hover:bg-brand-cyan transition disabled:opacity-50"
                >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={20} />}
                </button>
            </div>
        </div>
    );
}

function AmountCard({ label, value, muted, accent }: { label: string; value: number; muted?: boolean; accent?: boolean }) {
    return (
        <div className="p-4 text-center">
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">{label}</p>
            <p className={`text-sm font-bold ${accent ? 'text-emerald-400' : muted ? 'text-gray-500' : 'text-white'}`}>
                KES {value.toLocaleString()}
            </p>
        </div>
    );
}
