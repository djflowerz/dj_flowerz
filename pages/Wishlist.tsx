import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, ShoppingBag, ArrowRight, Trash2, 
  Package, ShoppingCart, Tag, User, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

interface WishlistItem {
  id: string;
  entity_id: string;
  entity_type: string;
  content: string;
  media_urls: string;
  author_handle: string;
  author_name: string;
  deal_metadata: string;
}

export default function Wishlist() {
  const { session } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/wishlist`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await resp.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchWishlist();
  }, [session]);

  const toggleWishlist = async (entity_id: string) => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/wishlist`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entity_id })
      });
      const data = await resp.json();
      if (data.success) {
        setItems(prev => prev.filter(item => item.entity_id !== entity_id));
        toast.success("Removed from wishlist");
      }
    } catch (e) {
      toast.error("Action failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pb-20 pt-24">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
           <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter flex items-center gap-4">
                My <span className="text-brand-pink text-glow-pink">Wishlist</span>
              </h1>
              <p className="text-gray-500 text-sm mt-2 uppercase tracking-widest font-bold">Items you've saved for later</p>
           </div>
           <Link to="/community?tab=marketplace" className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2">
              <Search size={16} /> Continue Shopping
           </Link>
        </header>

        {loading ? (
          <div className="py-20 flex justify-center">
             <div className="w-12 h-12 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart size={32} className="text-gray-700" />
             </div>
             <h3 className="text-2xl font-black uppercase tracking-tight">Your wishlist is empty</h3>
             <p className="text-gray-500 text-sm mt-2 uppercase tracking-widest font-bold">Save products or marketplace posts to see them here</p>
             <Link to="/community?tab=marketplace" className="mt-8 inline-block px-10 py-4 bg-brand-pink text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-pink/20">
                Explore Marketplace
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <AnimatePresence mode="popLayout">
                {items.map(item => (
                  <WishlistCard key={item.id} item={item} onRemove={toggleWishlist} />
                ))}
             </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}

const WishlistCard: React.FC<{ item: WishlistItem; onRemove: (id: string) => Promise<void> | void }> = ({ item, onRemove }) => {
  const metadata = JSON.parse(item.deal_metadata || '{}');
  const media = JSON.parse(item.media_urls || '[]');
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="group bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-brand-pink/30 transition-all hover:shadow-2xl hover:shadow-brand-pink/5"
    >
       <div className="aspect-[4/5] relative overflow-hidden bg-gray-900">
          {media.length > 0 ? (
            <img src={media[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-800">
               <Package size={80} />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60" />
          
          <button 
            onClick={() => onRemove(item.entity_id)}
            className="absolute top-6 right-6 p-3 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 text-white hover:text-brand-pink transition-all"
          >
             <Trash2 size={18} />
          </button>

          <div className="absolute bottom-6 left-6 right-6">
             <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-brand-pink text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                   {item.entity_type}
                </span>
                {metadata.condition && (
                   <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                      {metadata.condition}
                   </span>
                )}
             </div>
             <h4 className="text-2xl font-black tracking-tight leading-none mb-1">KES {Number(metadata.price).toLocaleString()}</h4>
             <div className="flex items-center gap-2 text-gray-400">
                <User size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">@{item.author_handle}</span>
             </div>
          </div>
       </div>

       <div className="p-8">
          <p className="text-sm text-gray-400 line-clamp-2 mb-8 font-medium leading-relaxed italic">
             "{item.content}"
          </p>

          <div className="flex gap-4">
             <Link 
               to={`/post/${item.entity_id}`}
               className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest text-center hover:bg-brand-pink hover:text-white transition-all shadow-xl"
             >
                View Details
             </Link>
             <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                <ShoppingCart size={18} />
             </button>
          </div>
       </div>
    </motion.div>
  );
}
