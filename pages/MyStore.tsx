import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, Tag, Eye, MessageSquare, Edit3, Trash2, 
  Plus, Search, Filter, ArrowLeft, MoreVertical,
  CheckCircle2, AlertCircle, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Listing {
  id: string;
  content: string;
  media_urls: string; // JSON string
  deal_metadata: string; // JSON string
  listing_status: 'available' | 'sold' | 'draft';
  created_at: string;
  like_count: number;
  reply_count: number;
}

export default function MyStore() {
  const { session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/seller/listings`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await resp.json();
      setListings(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchListings();
  }, [session]);

  const deleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
    
    toast.promise(async () => {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!resp.ok) throw new Error("Failed to delete");
      fetchListings();
    }, {
      loading: 'Deleting...',
      success: 'Listing removed',
      error: 'Delete failed'
    });
  };

  const filteredListings = listings.filter(l => {
    if (filter === 'all') return true;
    return l.listing_status === filter;
  });

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pb-20 pt-24">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
             <Link to="/seller/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4">
                <ArrowLeft size={14} /> Back to Dashboard
             </Link>
             <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
               My <span className="text-brand-cyan">Inventory</span>
             </h1>
             <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Manage your marketplace posts & products</p>
          </div>
          
          <Link to="/community" className="px-8 py-4 bg-brand-cyan text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-brand-cyan/20">
             <Plus size={18} /> New Listing
          </Link>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              {['all', 'available', 'sold', 'draft'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-brand-cyan text-black shadow-lg shadow-brand-cyan/20' : 'text-gray-500 hover:text-white'}`}
                >
                  {f}
                </button>
              ))}
           </div>
           
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="text" 
                placeholder="Search listings..."
                className="bg-white/5 border border-white/5 rounded-xl pl-12 pr-6 py-3 text-xs font-bold focus:outline-none focus:border-brand-cyan/30 transition-all"
              />
           </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="py-20 flex justify-center">
             <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
             <Package size={64} className="mx-auto text-gray-800 mb-6" />
             <h3 className="text-2xl font-black uppercase tracking-tight">No listings found</h3>
             <p className="text-gray-500 text-sm mt-2 uppercase tracking-widest font-bold">Start selling by creating a post in the Community Feed</p>
             <Link to="/community" className="mt-8 inline-block px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                Create First Listing
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredListings.map(listing => (
               <ListingCard key={listing.id} listing={listing} onDelete={deleteListing} />
             ))}
          </div>
        )}

      </div>
    </div>
  );
}

function ListingCard({ listing, onDelete }: { listing: Listing, onDelete: (id: string) => void }) {
  const metadata = JSON.parse(listing.deal_metadata || '{}');
  const media = JSON.parse(listing.media_urls || '[]');
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden group hover:border-white/10 transition-all"
    >
       <div className="aspect-square bg-gray-900 relative overflow-hidden">
          {media.length > 0 ? (
            <img src={media[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-800">
               <Package size={64} />
            </div>
          )}
          
          <div className="absolute top-4 left-4 flex gap-2">
             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
               listing.listing_status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' : 
               listing.listing_status === 'sold' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 
               'bg-gray-500/10 text-gray-400 border-gray-400/20'
             }`}>
                {listing.listing_status}
             </span>
             {metadata.condition && (
               <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                  {metadata.condition}
               </span>
             )}
          </div>

          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
             <button className="p-2 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 hover:bg-black/80 transition-all">
                <MoreVertical size={16} />
             </button>
          </div>
       </div>

       <div className="p-6">
          <div className="flex items-center justify-between mb-3">
             <h4 className="text-xl font-black tracking-tight truncate flex-1 mr-4">KES {Number(metadata.price).toLocaleString()}</h4>
             <div className="flex gap-4 text-gray-600">
                <div className="flex items-center gap-1.5">
                   <Eye size={12} />
                   <span className="text-[10px] font-black">{Math.floor(Math.random() * 1000)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <MessageSquare size={12} />
                   <span className="text-[10px] font-black">{listing.reply_count}</span>
                </div>
             </div>
          </div>
          
          <p className="text-xs text-gray-500 line-clamp-2 mb-6 font-medium leading-relaxed">
             {listing.content}
          </p>

          <div className="flex gap-3">
             <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <Edit3 size={14} /> Edit
             </button>
             <button 
               onClick={() => onDelete(listing.id)}
               className="p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-400/20"
             >
                <Trash2 size={14} />
             </button>
          </div>
       </div>
    </motion.div>
  );
}
