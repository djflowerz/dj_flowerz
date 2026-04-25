
import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, Wallet, Shield, Heart, PersonStanding, 
  LayoutGrid, ListFilter, Verified, Zap, ArrowRight, 
  ArrowUpRight, Plus, MapPin 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { STORAGE_WORKER_URL } from '../utils/r2';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface MarketplacePulse {
  id: string;
  content: string;
  author_id: string;
  author_handle: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  author_verified: number;
  media_url?: string;
  price?: number;
  condition?: string;
  category?: string;
  created_at: string;
  reaction_count: number;
  comment_count: number;
  is_marketplace: number;
}

const MarketplaceStorefront: React.FC = () => {
  const [items, setItems] = useState<MarketplacePulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const { user } = useAuth();
  const navigate = useNavigate();

  const categories = ['ALL', 'CONTROLLERS', 'AUDIO GEAR', 'APPAREL', 'SERVICES'];

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${STORAGE_WORKER_URL}/api/marketplace/storefront`);
        if (!res.ok) throw new Error('Failed to fetch marketplace');
        const data = await res.json();
        setItems(data || []);
      } catch (error) {
        console.error('Marketplace fetch error:', error);
        toast.error('Failed to load marketplace');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.content?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.author_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'ALL' || item.category?.toUpperCase() === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#050508] text-[#e5e1e7] font-sans selection:bg-[#7c3aed]/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-black/80 backdrop-blur-2xl border-b border-white/12">
        <div className="text-2xl font-black italic tracking-tighter text-white font-['Space_Grotesk']">
          <Link to="/">NOCTURNAL PULSE</Link>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block group">
            <Search className="absolute left-4 top-2.5 text-white/40 group-focus-within:text-[#7c3aed] transition-colors" size={20} />
            <input 
              className="bg-white/5 border border-white/10 rounded-full px-12 py-2.5 w-[400px] focus:outline-none focus:border-[#7c3aed]/50 focus:bg-white/10 transition-all text-sm text-white" 
              placeholder="Search the global pulse network..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/marketplace/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60">
              <Wallet size={24} />
            </Link>
            <div className="w-10 h-10 rounded-full border-2 border-[#7c3aed]/30 p-0.5 overflow-hidden cursor-pointer hover:border-[#7c3aed] transition-all">
              <img src={user?.user_metadata?.avatar_url || 'https://via.placeholder.com/40'} alt="Profile" className="w-full h-full rounded-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-20 h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col h-full py-8 bg-[#050508] border-r border-white/10 w-72 shrink-0">
          <div className="px-8 mb-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-[#7c3aed] flex items-center justify-center font-black text-xl text-white shadow-lg shadow-[#7c3aed]/20">
                {user?.user_metadata?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-xl font-black text-white font-['Space_Grotesk'] tracking-tighter truncate w-32">
                  {user?.user_metadata?.full_name || 'User'}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[#7c3aed] font-bold">Aura Rank: Elite</div>
              </div>
            </div>
            <nav className="space-y-1">
              <button 
                onClick={() => setCategory('ALL')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-['Space_Grotesk'] uppercase font-bold text-xs tracking-widest transition-all ${category === 'ALL' ? 'bg-[#7c3aed]/10 text-[#7c3aed] border-l-4 border-[#7c3aed]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
              >
                <LayoutGrid size={18} />
                <span>Browse Pulse Grid</span>
              </button>
              <Link to="/marketplace/dashboard" className="flex items-center gap-4 px-4 py-3 rounded-xl font-['Space_Grotesk'] uppercase font-bold text-xs tracking-widest transition-all text-white/40 hover:text-white/80 hover:bg-white/5">
                <Wallet size={18} />
                <span>Active Shield Escrows</span>
              </Link>
            </nav>
          </div>
          
          <div className="px-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 pb-10">
            {/* Categories */}
            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                SYSTEM CATEGORIES
                <ListFilter size={14} className="text-[#7c3aed]" />
              </h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${category === cat ? 'bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-white' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-tight">{cat}</span>
                    {category === cat && <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6">PRICE RANGE</h3>
              <div className="px-2">
                <div className="h-1.5 bg-white/10 rounded-full relative mb-8">
                  <div className="absolute left-0 right-1/4 h-full bg-[#7c3aed] rounded-full"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-[#7c3aed]/40 cursor-pointer"></div>
                  <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-[#7c3aed]/40 cursor-pointer"></div>
                </div>
                <div className="flex justify-between items-center bg-black/40 rounded-lg p-2 border border-white/5">
                  <div className="text-[10px] font-black text-[#7c3aed]">0</div>
                  <div className="w-[1px] h-3 bg-white/10"></div>
                  <div className="text-[10px] font-black text-white">500K+</div>
                </div>
              </div>
            </div>

            {/* Verification */}
            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">INTEGRITY SYNC</h3>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative w-10 h-5 bg-[#4cd7f6]/10 rounded-full transition-colors group-hover:bg-[#4cd7f6]/20 border border-[#4cd7f6]/20">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-[#4cd7f6] rounded-full shadow-[0_0_8px_rgba(76,215,246,0.8)]"></div>
                </div>
                <span className="text-[10px] font-black text-[#4cd7f6] tracking-widest uppercase">Aura Verified Only</span>
              </label>
            </div>
          </div>
          
          <div className="px-8 py-6 border-t border-white/5">
            <button 
              onClick={() => navigate('/community')}
              className="w-full py-4 bg-[#4cd7f6] text-[#003640] rounded-full font-black text-[11px] tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(76,215,246,0.3)] transition-all group shadow-xl"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              POST DEAL
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-8 py-10 pb-32 lg:pb-10 custom-scrollbar">
          <div className="max-w-[1440px] mx-auto">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#7c3aed] font-bold text-[10px] tracking-[0.3em] uppercase">
                  <span className="w-8 h-[1px] bg-[#7c3aed]/40"></span>
                  Aura Identity Storefront
                </div>
                <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none font-['Space_Grotesk']">Pulse Grid</h1>
                <p className="text-white/40 text-lg max-w-xl">Secure artifact exchange for the Nocturnal Pulse network. Powered by Shield Escrow.</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1 flex">
                  <button className="px-6 py-2 bg-white/10 text-white rounded-full font-black text-[10px] tracking-widest transition-all">ALL ARTIFACTS</button>
                  <button className="px-6 py-2 text-white/40 hover:text-white rounded-full font-black text-[10px] tracking-widest transition-all">NEW TRANSMISSIONS</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-12 h-12 border-4 border-[#7c3aed]/20 border-t-[#7c3aed] rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7c3aed]">Syncing Pulse Grid...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-[3rem] p-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-6">
                  <ShoppingCart size={40} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Market Quiet</h3>
                <p className="text-white/40 text-sm mt-2 max-w-md">No pulses found matching your frequency. Try adjusting your search filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden group hover:border-[#7c3aed]/50 transition-all duration-500 flex flex-col shadow-2xl">
                    <div className="relative h-72 overflow-hidden">
                      <img src={item.media_url || 'https://via.placeholder.com/600x400?text=No+Image'} alt={item.content} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute top-4 left-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-[#4cd7f6]/50 rounded-lg shadow-2xl">
                          <Shield className="text-[#4cd7f6]" size={14} />
                          <span className="text-[9px] font-black text-[#4cd7f6] tracking-widest uppercase">SHIELD PROTECTED</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                         <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full border border-[#4cd7f6]/30 overflow-hidden">
                                  <img src={item.author_avatar} className="w-full h-full object-cover" />
                                </div>
                               <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-tighter">{item.author_name}</p>
                                  <p className="text-[9px] text-[#4cd7f6] font-bold uppercase tracking-widest">Aura Rank: 98</p>
                               </div>
                            </div>
                            <div className="px-3 py-1 bg-[#7c3aed]/20 border border-[#7c3aed]/40 rounded-full text-[9px] font-black text-[#7c3aed] uppercase tracking-widest">
                               {item.condition || 'MINT'}
                            </div>
                         </div>
                      </div>
                    </div>
                    
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1 flex-1 mr-4">
                          <h4 className="text-2xl font-black text-white group-hover:text-[#7c3aed] transition-colors leading-tight uppercase font-['Space_Grotesk'] tracking-tight">
                            {item.content.length > 50 ? item.content.substring(0, 47) + '...' : item.content}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            <MapPin size={12} className="text-[#7c3aed]" />
                            {item.author_handle} Operational Sector
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-3xl font-black text-white font-['Space_Grotesk'] leading-none">
                            {item.price ? `${(item.price / 1000).toFixed(0)}K` : '??K'}
                          </div>
                          <div className="text-[10px] font-black text-[#7c3aed] tracking-widest uppercase mt-1">KES</div>
                        </div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/5 flex gap-4">
                        <Link 
                          to={`/pulse/${item.id}`}
                          className="flex-1 py-4 bg-[#7c3aed] text-white rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all active:scale-95"
                        >
                          INITIATE ESCROW
                          <ArrowUpRight size={14} />
                        </Link>
                        <button className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl hover:border-[#4cd7f6] transition-all text-white/40 hover:text-[#4cd7f6] active:scale-95">
                          <Heart size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MarketplaceStorefront;
