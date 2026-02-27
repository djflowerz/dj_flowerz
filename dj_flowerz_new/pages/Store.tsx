
import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Search, Filter, X, ChevronDown, Share2, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

import Hero from '../components/Hero';

const Store: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { products, siteConfig, productsError, hasQuotaExceeded } = useData();

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

    <div className="pb-20 min-h-screen bg-[#050507]">
      <Hero
        badge="Premium Equipment"
        title={<>PROFESSIONAL <span className="text-brand-purple">GEAR</span></>}
        subtitle="Explore our curated selection of high-fidelity audio gear, sample packs, and exclusive DJ controllers."
        cta1Text="Explore Now"
        cta1Link="#products"
        bgImage={siteConfig.hero.bgImage}
        showNewsletter={true}
      />


      <div id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">

        {/* 2. Featured Category Promo Grid */}
        < div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12" >
          {
            [
              { title: 'Audio Essentials', subtitle: 'Studio Monitoring', img: 'https://images.unsplash.com/photo-1543967623-010453d4fba7?auto=format&fit=crop&q=80&w=400', color: 'from-blue-500/20' },
              { title: 'DJ Setup', subtitle: 'Performance Gear', img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=400', color: 'from-brand-purple/20' },
              { title: 'Merchandise', subtitle: 'Official Apparel', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400', color: 'from-orange-500/20' }
            ].map((promo, i) => (
              <div key={i} className={`group relative h-64 rounded-3xl overflow-hidden border border-white/5 cursor-pointer`}>
                <img src={promo.img} alt={promo.title} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className={`absolute inset-0 bg-gradient-to-br ${promo.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                <div className="absolute bottom-6 left-6 relative z-10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{promo.subtitle}</div>
                  <h3 className="text-xl font-black text-white uppercase">{promo.title}</h3>
                </div>

                <div className="absolute top-6 right-6 w-10 h-10 rounded-full glass-effect flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition translate-x-4 group-hover:translate-x-0">
                  <Share2 size={16} />
                </div>
              </div>
            ))
          }
        </div >

        {/* Controls: Search, Sort & Mobile Filters Toggle */}
        < div id="products-section" className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-[#15151A] p-2 md:p-3 rounded-2xl md:rounded-[20px] border border-white/5 shadow-lg" >
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

          <div className="w-full md:w-auto flex items-center gap-2 md:gap-3">
            <div className="relative w-full md:w-48 flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-black/20 border border-transparent rounded-xl py-3.5 pl-4 pr-10 text-sm text-gray-300 focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-brand-purple/50 appearance-none transition-all cursor-pointer"
              >
                {sortOptions.map(opt => <option key={opt} value={opt} className="bg-[#15151A]">{opt}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            <button
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3.5 bg-black/20 border border-transparent rounded-xl text-sm font-bold text-gray-300 hover:text-white transition-colors flex-shrink-0"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            >
              <Filter size={16} /> Filters
            </button>
          </div>
        </div >

        {/* Horizontal Category Pills */}
        < div className={`mb-10 flex gap-2 overflow-x-auto no-scrollbar pb-2 ${isMobileFiltersOpen ? 'flex flex-wrap md:flex-nowrap' : 'hidden md:flex'}`}>
          {
            categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${selectedCategory === cat
                  ? 'bg-brand-purple text-white border-brand-purple shadow-[0_4px_15px_rgba(157,78,221,0.3)]'
                  : 'bg-[#15151A] border-white/5 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                  }`}
              >
                {cat}
              </button>
            ))
          }
          < div className="hidden md:block w-px bg-white/10 mx-2 flex-shrink-0 self-stretch my-1" ></div >
          {
            types.filter(t => t !== 'all').map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold capitalize transition-all duration-300 border ${selectedType === type
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
              >
                {type}
              </button>
            ))
          }
          {
            prices.filter(p => p !== 'All').map(price => (
              <button
                key={price}
                onClick={() => setSelectedPrice(selectedPrice === price ? 'All' : price)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${selectedPrice === price
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
              >
                {price}
              </button>
            ))
          }

          {
            (searchQuery || selectedCategory !== 'All' || selectedType !== 'all' || selectedPrice !== 'All' || selectedOS !== 'All' || sortBy !== 'Newest') && (
              <button
                onClick={clearFilters}
                className="whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 ml-auto md:ml-2"
              >
                <X size={14} /> Clear
              </button>
            )
          }
        </div >

        {/* Product Grid */}
        < div className="flex-1 w-full" >
          {(productsError || hasQuotaExceeded) && (
            <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <p className="font-bold flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Service Interruption
              </p>
              <p className="text-sm opacity-80">Our database is currently experiencing high traffic and has hit its daily usage quota. Some products may not be visible. Please try again later or contact us if you need help with an order!</p>
            </div>
          )}
          {
            filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {paginatedProducts.map((product) => (
                    <div key={product.id} className="bg-[#15151A] rounded-[24px] overflow-hidden border border-white/5 hover:border-brand-purple/50 transition duration-300 group flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 relative h-full">

                      <Link to={`/store/${product.id}`} className="relative h-[200px] md:h-[240px] p-4 md:p-6 flex-shrink-0 bg-white border-b border-white/5 flex items-center justify-center group/img">
                        <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain group-hover/img:scale-110 transition duration-500 drop-shadow-md" />

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

                        <div className="flex gap-1 mb-3">
                          <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                          <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                          <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                          <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                          <Star size={12} className="text-brand-purple fill-brand-purple opacity-50" />
                          <span className="text-[10px] text-gray-500 ml-1 font-medium">(24)</span>
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
                  ))}
                </div>

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
      </div >
    </div >
  );
};

export default Store;
