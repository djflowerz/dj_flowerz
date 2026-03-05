import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Search, Filter, X, ChevronDown, ChevronLeft, ChevronRight, Share2, Star, Grid, Headphones, Disc, Laptop, Smartphone, Battery, Database, Music, Shirt, Mail } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { VirtuosoGrid } from 'react-virtuoso';

const Store: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { products, siteConfig, productsError } = useData();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [selectedOS, setSelectedOS] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Constants
  const categories = ['All', 'Audio Equipment', 'DJ Equipment', 'Laptops', 'Mobile Phones', 'Mobile Accessories', 'Software', 'Samples', 'Apparel', 'Accessories', 'Other'];

  const categoryAssets: Record<string, { icon: React.ReactNode, img: string }> = {
    'All': { icon: <Grid size={24} />, img: 'https://images.unsplash.com/photo-1543967623-010453d4fba7?auto=format&fit=crop&q=80&w=200' },
    'Audio Equipment': { icon: <Headphones size={24} />, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200' },
    'DJ Equipment': { icon: <Disc size={24} />, img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=200' },
    'Laptops': { icon: <Laptop size={24} />, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200' },
    'Mobile Phones': { icon: <Smartphone size={24} />, img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=200' },
    'Mobile Accessories': { icon: <Battery size={24} />, img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=200' },
    'Software': { icon: <Database size={24} />, img: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=200' },
    'Samples': { icon: <Music size={24} />, img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=200' },
    'Apparel': { icon: <Shirt size={24} />, img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=200' },
    'Accessories': { icon: <ShoppingCart size={24} />, img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=200' },
    'Other': { icon: <Search size={24} />, img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200' }
  };
  const types = ['all', 'digital', 'physical'];
  const prices = ['All', 'Free', 'Paid'];
  const osOptions = ['All', 'macOS', 'Windows', 'Android'];
  const sortOptions = ['Newest', 'Hot', 'Price: Low', 'Price: High'];

  // Helper to map existing categories for demo consistency
  const getDisplayCategory = (cat: string) => {
    if (!cat) return 'Other';
    if (['Head Phones & Ear Buds', 'Speakers', 'Studio Monitors', 'Microphones', 'Cables', 'Studio Furniture'].includes(cat)) return 'Audio Equipment';
    if (['DJ Controllers', 'Vinyl Records', 'DJ Lighting'].includes(cat)) return 'DJ Equipment';

    // Legacy mappings
    if (cat === 'merch') return 'Apparel';
    if (cat === 'digital') return 'Software';
    if (cat === 'equipment') return 'Accessories';
    return cat;
  };

  const getProductType = (prod: any) => {
    const cat = prod.category || '';
    if (['Software', 'Samples', 'digital'].includes(cat) || cat === 'digital' || prod.type === 'digital') return 'digital';
    return 'physical';
  };

  // Filtering Logic
  const filteredProducts = (products || []).filter(product => {
    if (!product) return false;

    // Status Filtering: Guest/User can ONLY see 'published' products.
    // Admin can see 'draft' and 'hidden' products to verify uploads.
    if (!user?.isAdmin) {
      if (product.status === 'hidden' || product.status === 'draft') return false;
      if (product.isActive === false) return false;
    }

    // Search - Defensive check for name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = product.name?.toLowerCase().includes(query);
      const matchCategory = product.category?.toLowerCase().includes(query);
      const matchDesc = product.description?.toLowerCase().includes(query);

      if (!matchName && !matchCategory && !matchDesc) return false;
    }

    // Category - Defensive check for category
    const displayCat = getDisplayCategory(product.category || '');
    if (selectedCategory !== 'All' && displayCat !== selectedCategory && product.category !== selectedCategory) return false;

    // Type
    const pType = getProductType(product);
    if (selectedType !== 'all' && pType !== selectedType) return false;

    // Price
    if (selectedPrice === 'Free' && product.price > 0) return false;
    if (selectedPrice === 'Paid' && product.price === 0) return false;

    // OS
    if (selectedOS !== 'All' && product.os !== selectedOS) return false;

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'Price: Low': return a.price - b.price || a.name.localeCompare(b.name);
      case 'Price: High': return b.price - a.price || a.name.localeCompare(b.name);
      case 'Hot': return (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0) || a.name.localeCompare(b.name);
      case 'Newest':
      default:
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return a.name.localeCompare(b.name); // Ensure consistent alignment
    }
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategory, selectedType, selectedPrice, selectedOS, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedType('all');
    setSelectedPrice('All');
    setSelectedOS('All');
    setSortBy('Newest');
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#050507]">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">

        {/* Store Hero Section (Vercel Match) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 md:mb-12">
          {/* Main Large Card */}
          <div className="md:col-span-2 relative h-[350px] md:h-[450px] rounded-3xl overflow-hidden bg-brand-purple flex flex-col justify-center p-8 md:p-12 border border-white/10 group shadow-lg">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.1] z-0 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-0"></div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 blur-[80px] rounded-full group-hover:bg-brand-cyan/20 transition duration-700 pointer-events-none"></div>

            <div className="relative z-10 max-w-lg">
              <span className="inline-block px-4 py-1.5 rounded-full bg-brand-cyan text-black text-[10px] md:text-xs font-bold uppercase tracking-wider mb-4 md:mb-6 shadow-sm">
                SPECIAL OFFER
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white leading-[1.05] tracking-tight mb-4 md:mb-6">
                Elevate Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-white">Creative Arsenal</span>
              </h1>
              <p className="text-white/80 text-sm md:text-base lg:text-lg mb-8 max-w-sm leading-relaxed">
                Discover premium sample packs, pro audio gear, and exclusive merch dropping this week.
              </p>
              <button
                onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Start Exploring
              </button>
            </div>
          </div>

          {/* Right Stacked Cards */}
          <div className="md:col-span-1 flex flex-col gap-4 h-[350px] md:h-[450px]">
            {/* Top Card */}
            <div
              onClick={() => { setSelectedCategory('Audio Equipment'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="flex-1 relative rounded-3xl overflow-hidden bg-[#15151A] border border-white/5 group cursor-pointer shadow-lg"
            >
              <img src="https://images.unsplash.com/photo-1543967623-010453d4fba7?auto=format&fit=crop&q=80&w=400" alt="Audio" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

              <div className="absolute top-5 left-5 z-20">
                <span className="px-3 py-1.5 rounded-md bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Trending
                </span>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pt-10">
                <div className="w-14 h-14 rounded-full border border-orange-500/50 flex items-center justify-center mb-3 bg-black/40 backdrop-blur-md text-orange-400 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                  <Star size={24} className="fill-current" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1 shadow-sm uppercase tracking-tight">Pro Audio Gear</h3>
                <p className="text-sm font-medium text-white/90 drop-shadow-md">Up to 20% off hardware</p>
              </div>
            </div>

            {/* Bottom Card */}
            <div
              onClick={() => { setSelectedCategory('Mobile Accessories'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="flex-1 relative rounded-3xl overflow-hidden bg-[#15151A] border border-white/5 group cursor-pointer shadow-lg"
            >
              <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400" alt="Mobile" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

              <div className="absolute top-5 left-5 z-20">
                <span className="px-3 py-1.5 rounded-md bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  New
                </span>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pt-10">
                <div className="w-14 h-14 rounded-full border border-blue-500/50 flex items-center justify-center mb-3 bg-black/40 backdrop-blur-md text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <ShoppingCart size={24} />
                </div>
                <h3 className="text-2xl font-black text-white mb-1 shadow-sm uppercase tracking-tight">Mobile & Accessories</h3>
                <p className="text-sm font-medium text-white/90 drop-shadow-md">Fresh products just dropped</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls: Search, Sort & Mobile Filters Toggle */}
        <div id="products-section" className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 bg-[#15151A]/80 backdrop-blur-xl p-4 rounded-[32px] border border-white/10 shadow-2xl">
          <div className="w-full md:flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border-transparent rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-brand-purple/50 transition-all"
            />
          </div>

          <div className="w-full md:w-auto flex flex-wrap items-center gap-2 md:gap-3">
            {/* Category Filter for Search */}
            <div className="relative w-full md:w-48 flex-shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-3.5 pl-4 pr-10 text-sm text-gray-300 focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-brand-purple/50 appearance-none transition-all cursor-pointer"
              >
                {categories.map(cat => <option key={cat} value={cat} className="bg-[#15151A]">{cat}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            <div className="relative w-full md:w-48 flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-3.5 pl-4 pr-10 text-sm text-gray-300 focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-brand-purple/50 appearance-none transition-all cursor-pointer"
              >
                {sortOptions.map(opt => <option key={opt} value={opt} className="bg-[#15151A]">{opt}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            <button
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3.5 bg-black/20 border border-white/5 rounded-xl text-sm font-bold text-gray-300 hover:text-white transition-colors flex-shrink-0"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            >
              <Filter size={16} /> Filters
            </button>
          </div>
        </div >

        {/* Shop By Category - TopStore Pro Style */}
        <div className={`mb-12 w-full pt-4 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">Shop by Category</h2>
            {/* Extended Filters toggle (Types, Prices) */}
            <div className="hidden md:flex gap-2 items-center">
              {types.filter(t => t !== 'all').map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${selectedType === type
                    ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                    : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {type}
                </button>
              ))}
              <div className="w-px h-4 bg-white/10 mx-2"></div>
              {prices.filter(p => p !== 'All').map(price => (
                <button
                  key={price}
                  onClick={() => setSelectedPrice(selectedPrice === price ? 'All' : price)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${selectedPrice === price
                    ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                    : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {price}
                </button>
              ))}
              {(searchQuery || selectedCategory !== 'All' || selectedType !== 'all' || selectedPrice !== 'All' || selectedOS !== 'All' || sortBy !== 'Newest') && (
                <button
                  onClick={clearFilters}
                  className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 ml-2"
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="relative group/slider">
            <button
              onClick={() => {
                const el = document.getElementById('category-slider');
                if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
              }}
              className="absolute -left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white opacity-100 md:group-hover/slider:opacity-100 transition-opacity hover:bg-brand-purple hover:border-brand-purple shadow-xl flex"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('category-slider');
                if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
              }}
              className="absolute -right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white opacity-100 md:group-hover/slider:opacity-100 transition-opacity hover:bg-brand-purple hover:border-brand-purple shadow-xl flex"
            >
              <ChevronRight size={24} />
            </button>

            <div id="category-slider" className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar pb-6 px-2 -mx-2 scroll-smooth">
              {categories.map(cat => {
                const asset = categoryAssets[cat] || categoryAssets['Other'];
                const isSelected = selectedCategory === cat;
                return (
                  <div
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="flex flex-col items-center gap-4 cursor-pointer group flex-shrink-0"
                  >
                    <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden relative shadow-lg transition-all duration-300 border-[3px] ${isSelected ? 'border-brand-purple scale-110 shadow-[0_0_25px_rgba(157,78,221,0.5)]' : 'border-[#15151A] group-hover:border-white/20 group-hover:scale-105'}`}>
                      <img src={asset.img} alt={cat} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors duration-500" />
                      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isSelected ? 'text-white scale-110' : 'text-gray-300 group-hover:text-white group-hover:scale-110'}`}>
                        {asset.icon}
                      </div>
                    </div>
                    <span className={`text-[11px] md:text-sm font-bold text-center w-20 md:w-28 break-words transition-colors ${isSelected ? 'text-brand-purple' : 'text-gray-400 group-hover:text-white'}`}>
                      {cat}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Types/Prices toggle */}
          <div className="flex md:hidden gap-2 mt-4 overflow-x-auto pb-2">
            {types.filter(t => t !== 'all').map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                className={`flex-shrink-0 whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${selectedType === type
                  ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                  : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                {type}
              </button>
            ))}
            {prices.filter(p => p !== 'All').map(price => (
              <button
                key={price}
                onClick={() => setSelectedPrice(selectedPrice === price ? 'All' : price)}
                className={`flex-shrink-0 whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${selectedPrice === price
                  ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                  : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                {price}
              </button>
            ))}
            {(searchQuery || selectedCategory !== 'All' || selectedType !== 'all' || selectedPrice !== 'All' || selectedOS !== 'All' || sortBy !== 'Newest') && (
              <button
                onClick={clearFilters}
                className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 ml-auto"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        < div className="flex-1 w-full" >
          {productsError && (
            <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <p className="font-bold flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Store Error
              </p>
              <p className="text-sm opacity-80">Unable to load the store products. Please try again later or contact us if the issue persists.</p>
            </div>
          )}
          {
            filteredProducts.length > 0 ? (
              <>
                <VirtuosoGrid
                  useWindowScroll
                  data={paginatedProducts}
                  listClassName="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 md:gap-6"
                  itemContent={(index, product) => (
                    <div className="bg-[#15151A] rounded-[24px] overflow-hidden border border-white/5 hover:border-brand-purple/50 transition duration-300 group flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 relative h-full">

                      <Link to={`/store/${product.id}`} className="relative h-[200px] md:h-[240px] flex-shrink-0 bg-white border-b border-white/5 flex items-center justify-center group/img">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover/img:scale-110 transition duration-500" />

                        {/* Tags */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                          {product.isHot && (
                            <div className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider backdrop-blur-md">
                              HOT
                            </div>
                          )}
                          {product.price === 0 && (
                            <div className="bg-green-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider backdrop-blur-md">
                              FREE
                            </div>
                          )}
                          {(getProductType(product) === 'digital') && (
                            <div className="bg-blue-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider backdrop-blur-md">
                              DIGITAL
                            </div>
                          )}
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 p-2 md:p-4 opacity-0 group-hover/img:opacity-100 transition duration-300">
                          <p className="text-white bg-black/60 backdrop-blur w-max mx-auto px-4 py-1.5 rounded-full text-xs font-bold text-center border border-white/10 shadow-lg">View Details</p>
                        </div>
                      </Link>

                      <div className="p-4 md:p-5 flex-1 flex flex-col bg-[#15151A]">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <Link to={`/store/${product.id}`} className="block flex-1">
                            <h3 className="text-white font-bold text-[14px] md:text-[16px] line-clamp-2 leading-tight hover:text-brand-purple transition">{product.name}</h3>
                          </Link>
                          <p className="text-gray-400 text-[10px] md:text-xs capitalize flex-shrink-0 border border-white/10 px-2 py-0.5 rounded-full">{getDisplayCategory(product.category)}</p>
                        </div>

                        <div className="flex gap-1 mb-3 items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={i < Math.round(product.rating || 4.5) ? "text-[#E8C053] fill-[#E8C053]" : "text-gray-600 fill-gray-600"}
                            />
                          ))}
                          <span className="text-[10px] text-gray-500 ml-1 font-medium">({product.reviewCount || 24})</span>
                        </div>

                        <div className="flex justify-between items-center mt-auto pt-3">
                          <div className="flex flex-col">
                            {product.discountPrice && product.discountPrice > 0 && (
                              <span className="text-gray-500 line-through text-[10px] md:text-xs font-medium leading-none mb-1">
                                KES {product.price.toLocaleString()}
                              </span>
                            )}
                            <span className="text-brand-cyan font-black text-lg md:text-xl leading-none shadow-brand-cyan/20">
                              {product.discountPrice && product.discountPrice > 0
                                ? `KES ${product.discountPrice.toLocaleString()}`
                                : (product.price === 0 ? 'Free' : `KES ${product.price.toLocaleString()}`)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                addToCart(product);
                              }}
                              className="sm:col-span-2 flex items-center justify-center gap-2 py-3 bg-brand-purple text-white rounded-xl font-bold text-xs md:text-sm hover:bg-purple-600 transition shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
                            >
                              <ShoppingCart size={16} /> {product.price === 0 ? 'Download' : 'Add to Cart'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                />

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 mb-8 flex justify-center gap-3">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-5 py-2.5 bg-[#15151A] border border-white/10 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 hover:border-white/20 transition-all flex items-center"
                    >
                      Previous
                    </button>
                    <div className="flex items-center bg-[#15151A] border border-white/10 rounded-xl px-4 py-2 text-gray-400 text-sm font-medium">
                      <span className="text-white font-bold mx-1">{currentPage}</span> / {totalPages}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-5 py-2.5 bg-[#15151A] border border-white/10 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 hover:border-white/20 transition-all flex items-center"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-[#15151A] rounded-[32px] border border-white/5 shadow-inner">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                  <Search size={32} className="text-gray-500" />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-2">No products found</h3>
                <p className="text-gray-400 mb-8 max-w-sm text-center">We couldn't find what you're looking for. Try adjusting your search term or filters.</p>
                <button
                  onClick={clearFilters}
                  className="px-8 py-3.5 bg-brand-purple text-white rounded-xl hover:bg-purple-600 transition font-bold shadow-[0_0_20px_rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.5)]"
                >
                  Clear All Filters
                </button>
              </div>
            )
          }
        </div >

        {/* Newsletter Section */}
        <section className="mt-20 mb-10 w-full rounded-[40px] bg-gradient-to-br from-[#15151A] to-[#0B0B0F] border border-white/5 overflow-hidden shadow-2xl relative flex flex-col items-center justify-center p-8 md:p-16 text-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] z-0 pointer-events-none"></div>
          <div className="absolute top-0 right-10 w-64 h-64 bg-brand-purple/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>
          <div className="absolute bottom-0 left-10 w-64 h-64 bg-brand-cyan/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 mx-auto shadow-inner">
              <Mail className="text-brand-purple w-8 h-8" />
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">Stay in the Loop</h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium">Join our newsletter to get exclusive deals, early access to new drops, and the latest gear news straight to your inbox.</p>

            <form className="flex flex-col sm:flex-row gap-3 w-full max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Subscribed successfully!'); }}>
              <input
                type="email"
                placeholder="Enter your email address..."
                required
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:bg-black/60 focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50 transition-all font-medium placeholder:text-gray-500 shadow-inner"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-brand-purple text-white font-bold rounded-2xl hover:bg-purple-600 transition-colors shadow-[0_0_20px_rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.5)] active:scale-95 whitespace-nowrap"
              >
                Subscribe Now
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-6 font-medium">We respect your privacy. No spam, ever.</p>
          </div>
        </section>

      </div >
    </div >
  );
};

export default Store;
