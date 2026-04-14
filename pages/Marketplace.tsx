
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Filter, Headphones, Music, Package, 
  Star, ShieldCheck, ArrowRight, Zap, Check, SlidersHorizontal, Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Marketplace() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchMarketplaceItems();
  }, []);

  const fetchMarketplaceItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_STORAGE_WORKER_URL}/api/marketplace`);
      setItems(res.data);
    } catch (e) {
      console.error("Failed to fetch marketplace items", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#050507] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Marketplace Hero */}
        <div className="relative rounded-[2.5rem] overflow-hidden mb-12 group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/20 via-black to-blue-500/10"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          
          <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                <Zap size={12} />
                Community Exchange
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight uppercase tracking-tighter">
                THE AURA <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-brand-purple">MARKETPLACE</span>
              </h1>
              <p className="text-gray-400 max-w-lg">
                The exclusive community bazaar where the best DJs trade their secret loops, transition samples, and custom presets. Vetted by DJ FLOWERZ.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link to="/vendor-dashboard" className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-brand-cyan transition flex items-center gap-2">
                  <Plus size={18} /> SELL YOUR SOUND
                </Link>
                <button className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black rounded-xl hover:bg-white/10 transition">
                  EXPLORE COLLECTIONS
                </button>
              </div>
            </div>

            <div className="hidden lg:block w-72 h-72 relative">
               <div className="absolute inset-0 bg-brand-purple/30 blur-[60px] rounded-full animate-pulse"></div>
               <div className="relative bg-[#15151A] border border-white/10 p-8 rounded-3xl rotate-6 group-hover:rotate-0 transition-transform duration-500">
                  <Package size={80} className="text-brand-purple mx-auto mb-4" />
                  <div className="text-center">
                    <p className="text-xs font-black text-white uppercase mb-1">Fresh Loops</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Starting KES 500</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-[#15151A]/50 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
              />
            </div>
            <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition">
              <SlidersHorizontal size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {['All', 'Loops', 'Samples', 'Presets', 'Services'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="glass-card group relative rounded-[2rem] border border-white/5 flex flex-col h-full overflow-hidden hover:border-brand-purple/30 transition duration-500">
                {/* Image / Preview area */}
                <div className="aspect-square bg-white p-6 relative overflow-hidden">
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=400"} 
                    alt={item.name} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-blue-500/90 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg uppercase">{item.category}</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-brand-cyan">
                      {[...Array(5)].map((_, i) => <Star key={i} size={8} fill="currentColor" />)}
                    </div>
                  </div>
                  <h3 className="font-black text-white text-sm uppercase mb-1 truncate">{item.name}</h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-4">By VIP Vendor</p>
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">Price</span>
                      <span className="text-lg font-black text-white">KES {item.price.toLocaleString()}</span>
                    </div>
                    <button className="p-3 bg-brand-purple text-white rounded-xl hover:bg-white hover:text-black transition shadow-lg shadow-brand-purple/20">
                      <ShoppingBag size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <Package size={60} className="mx-auto text-gray-700 mb-6" />
            <h3 className="text-xl font-black text-white">No items found</h3>
            <p className="text-gray-500 mt-2">Adjust your filters or search to see more exclusive content.</p>
          </div>
        )}

        {/* Call to action */}
        <div className="mt-32 rounded-[3rem] bg-gradient-to-br from-brand-purple via-[#0d0d12] to-blue-600 border border-white/10 p-12 flex flex-col items-center text-center">
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">MONETIZE YOUR SOUND</h2>
            <p className="text-white/60 max-w-xl mb-10 font-medium">Build your legacy on DJ FLOWERZ. Reach thousands of DJs across East Africa and sell your loops, samples, and presets as a verified vendor.</p>
            <Link to="/vendor-dashboard" className="px-12 py-5 bg-white text-black font-black rounded-2xl hover:bg-brand-cyan transition shadow-2xl flex items-center gap-3 group">
              APPLY FOR VENDOR STATUS <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>

      </div>
    </div>
  );
}
