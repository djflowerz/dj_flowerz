import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gavel, TrendingUp, Users, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuctionTimer } from './AuctionTimer';

interface Bid {
  id: string;
  bidder_id: string;
  bidder_name: string;
  bidder_handle: string;
  bidder_avatar: string;
  amount: number;
  status: string;
  created_at: string;
}

interface BidModalProps {
  pulse: {
    id: string;
    author_id: string;
    author_name: string;
    content: string;
    auction_end_at?: string;
    auction_start_price?: number;
    highest_bid?: number;
    bid_count?: number;
    listing_status?: string;
  };
  onClose: () => void;
  onBidPlaced: (newHighestBid: number) => void;
}

export const BidModal: React.FC<BidModalProps> = ({ pulse, onClose, onBidPlaced }) => {
  const { user, session } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingBids, setFetchingBids] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [localHighest, setLocalHighest] = useState(pulse.highest_bid || pulse.auction_start_price || 0);

  const minNext = localHighest + 50;

  useEffect(() => {
    fetchBids();
  }, []);

  const fetchBids = async () => {
    setFetchingBids(true);
    try {
      const res = await fetch(`/api/marketplace/bids/${pulse.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'X-Actor-Id': user?.id || '',
        }
      });
      if (res.ok) {
        const data = await res.json() as Bid[];
        setBids(data);
      }
    } finally {
      setFetchingBids(false);
    }
  };

  const handleBid = async () => {
    const amount = Number(bidAmount);
    if (isNaN(amount) || amount < minNext) {
      setError(`Minimum bid is KES ${minNext.toLocaleString()}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/marketplace/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'X-Actor-Id': user?.id || '',
        },
        body: JSON.stringify({ pulse_id: pulse.id, amount }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        setError(data.error || 'Failed to place bid');
      } else {
        setLocalHighest(amount);
        setSuccess(true);
        onBidPlaced(amount);
        await fetchBids();
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSeller = user?.id === pulse.author_id;
  const auctionExpired = pulse.auction_end_at && new Date(pulse.auction_end_at) < new Date();
  const soldOut = pulse.listing_status === 'sold' || pulse.listing_status === 'reserved';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-hidden"
          initial={{ scale: 0.92, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-amber-900/30 to-orange-900/20">
            <div className="flex items-center gap-2">
              <Gavel size={18} className="text-amber-400" />
              <span className="font-bold text-white text-sm">Live Auction</span>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Listing info */}
            <div className="space-y-1">
              <p className="text-white/80 text-sm line-clamp-2">{pulse.content?.slice(0, 80)}...</p>
              <p className="text-white/40 text-xs">by {pulse.author_name}</p>
            </div>

            {/* Live stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Current Bid</p>
                <p className="text-amber-400 font-black text-sm">
                  {localHighest > 0 ? `KES ${localHighest.toLocaleString()}` : 'None'}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Bids</p>
                <div className="flex items-center justify-center gap-1">
                  <Users size={12} className="text-brand-cyan" />
                  <p className="text-white font-black text-sm">{pulse.bid_count || bids.length}</p>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Ends In</p>
                {pulse.auction_end_at ? (
                  <AuctionTimer endAt={pulse.auction_end_at} />
                ) : (
                  <span className="text-white/50 text-xs">—</span>
                )}
              </div>
            </div>

            {/* Bid input — hide if expired/sold/seller */}
            {!isSeller && !auctionExpired && !soldOut && !success && (
              <div className="space-y-2">
                <label className="text-white/60 text-xs">Your Bid (KES)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => { setBidAmount(e.target.value); setError(''); }}
                    placeholder={`Min KES ${minNext.toLocaleString()}`}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-amber-500/50 placeholder:text-white/25"
                    min={minNext}
                  />
                  <motion.button
                    onClick={handleBid}
                    disabled={loading || !bidAmount}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
                    Bid
                  </motion.button>
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 text-red-400 text-xs">
                    <AlertCircle size={12} /> {error}
                  </div>
                )}
                <p className="text-white/30 text-[10px]">Minimum increment: KES 50 above current highest bid</p>
              </div>
            )}

            {/* Success state */}
            {success && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-center">
                <Gavel size={24} className="text-green-400 mx-auto mb-1" />
                <p className="text-green-400 font-bold text-sm">Bid Placed! KES {Number(bidAmount).toLocaleString()}</p>
                <p className="text-white/50 text-xs mt-0.5">You'll be notified if you're outbid.</p>
              </div>
            )}

            {/* Locked states */}
            {(auctionExpired || soldOut) && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-center">
                <p className="text-red-400 font-bold text-xs uppercase tracking-wide">
                  {soldOut ? '🔒 Auction Reserved / Sold' : '⏰ Auction Ended'}
                </p>
              </div>
            )}

            {isSeller && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center text-white/50 text-xs">
                You are the seller — you cannot bid on your own listing.
              </div>
            )}

            {/* Bid history */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={12} className="text-brand-cyan" />
                <span className="text-white/50 text-[11px] uppercase tracking-wider">Bid History</span>
              </div>
              {fetchingBids ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-white/30" />
                </div>
              ) : bids.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">No bids yet. Be the first!</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bids.map((bid, i) => (
                    <div key={bid.id} className={`flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/3'}`}>
                      <img src={bid.bidder_avatar} alt={bid.bidder_name} className="w-6 h-6 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-xs font-semibold truncate">
                          {bid.bidder_id === user?.id ? 'You' : `@${bid.bidder_handle}`}
                          {i === 0 && <span className="ml-1 text-amber-400 text-[9px]">👑 Highest</span>}
                        </p>
                      </div>
                      <p className={`text-xs font-black ${i === 0 ? 'text-amber-400' : 'text-white/60'}`}>
                        KES {Number(bid.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
