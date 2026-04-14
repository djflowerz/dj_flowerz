// src/components/community/OffersManager.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Flame, Check, X, Clock, DollarSign, 
    ArrowRight, MessageSquare, ShoppingBag, Loader
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_STORAGE_WORKER_URL || '';

interface Offer {
    id: string;
    post_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    created_at: string;
    post_content: string;
    list_price: number;
    buyer_name: string;
    buyer_avatar: string;
    seller_name: string;
    seller_avatar: string;
}

const OffersManager: React.FC<{ userId: string }> = ({ userId }) => {
    const [sentOffers, setSentOffers] = useState<Offer[]>([]);
    const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState<'received' | 'sent'>('received');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchOffers = async () => {
        setLoading(true);
        try {
            const [sentRes, receivedRes] = await Promise.all([
                fetch(`${API_URL}/api/community/offers?type=sent`),
                fetch(`${API_URL}/api/community/offers?type=received`)
            ]);
            
            if (sentRes.ok && receivedRes.ok) {
                const sentData = await sentRes.json();
                const receivedData = await receivedRes.json();
                setSentOffers(sentData.offers || []);
                setReceivedOffers(receivedData.offers || []);
            }
        } catch (err) {
            toast.error("Failed to sync offers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
    }, [userId]);

    const handleUpdateStatus = async (offerId: string, status: 'accepted' | 'rejected') => {
        setProcessingId(offerId);
        try {
            const res = await fetch(`${API_URL}/api/community/offers/${offerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success(`Offer ${status}!`);
                fetchOffers();
            } else {
                toast.error("Failed to update offer");
            }
        } catch {
            toast.error("Connection error");
        } finally {
            setProcessingId(null);
        }
    };

    const offers = subTab === 'received' ? receivedOffers : sentOffers;

    if (loading) return (
        <div className="py-20 flex flex-col items-center gap-4">
            <Loader className="text-brand-purple animate-spin" size={32} />
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Scanning Frequencies...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex gap-2 mb-6">
                {(['received', 'sent'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setSubTab(t)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            subTab === t 
                                ? 'bg-brand-purple/20 border-brand-purple text-brand-purple' 
                                : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                        }`}
                    >
                        {t === 'received' ? 'Offers for You' : 'Your Offers'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {offers.length > 0 ? (
                    offers.map(offer => (
                        <motion.div
                            key={offer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-brand-purple/30 transition-all group"
                        >
                            <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                {/* Post Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingBag size={14} className="text-brand-cyan" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Marketplace Item</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-1 group-hover:text-brand-cyan transition-colors">
                                        {offer.post_content?.substring(0, 60)}...
                                    </h4>
                                    <div className="flex items-center gap-4 text-xs font-bold">
                                        <div className="text-gray-500 line-through">KES {offer.list_price?.toLocaleString()}</div>
                                        <div className="text-emerald-400">Offer: KES {offer.amount?.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Party Info */}
                                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                                    <img 
                                        src={subTab === 'received' ? offer.buyer_avatar : offer.seller_avatar} 
                                        className="w-8 h-8 rounded-full object-cover" 
                                        alt="Avatar"
                                    />
                                    <div>
                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{subTab === 'received' ? 'Buyer' : 'Seller'}</div>
                                        <div className="text-xs font-bold text-white">@{subTab === 'received' ? offer.buyer_name : offer.seller_name}</div>
                                    </div>
                                </div>

                                {/* Status / Actions */}
                                <div className="flex items-center gap-2 md:w-48 justify-end">
                                    {offer.status === 'pending' ? (
                                        subTab === 'received' ? (
                                            <>
                                                <button
                                                    disabled={!!processingId}
                                                    onClick={() => handleUpdateStatus(offer.id, 'accepted')}
                                                    className="flex-1 bg-emerald-500 text-black p-2 rounded-lg font-black text-[10px] uppercase hover:scale-105 transition-all disabled:opacity-50"
                                                >
                                                    <Check size={14} className="mx-auto" />
                                                </button>
                                                <button
                                                    disabled={!!processingId}
                                                    onClick={() => handleUpdateStatus(offer.id, 'rejected')}
                                                    className="flex-1 bg-red-500 text-white p-2 rounded-lg font-black text-[10px] uppercase hover:scale-105 transition-all disabled:opacity-50"
                                                >
                                                    <X size={14} className="mx-auto" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                Awaiting Response
                                            </div>
                                        )
                                    ) : (
                                        <div className={`px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                                            offer.status === 'accepted' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
                                        }`}>
                                            {offer.status === 'accepted' ? 'Accepted' : 'Rejected'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <MessageSquare className="mx-auto text-gray-800 mb-4" size={32} />
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No active negotiations detected</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OffersManager;
