
import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Search, Filter, X, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';

const Store: React.FC = () => {
  const { addToCart } = useCart();
  const { products, siteConfig } = useData();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [selectedOS, setSelectedOS] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Constants
  const categories = ['All', 'Laptops', 'Desktops', 'Components', 'Accessories', 'Software', 'Samples', 'Apparel'];
  const types = ['all', 'digital', 'physical'];
  const prices = ['All', 'Free', 'Paid'];
  const osOptions = ['All', 'macOS', 'Windows', 'Android'];
  const sortOptions = ['Newest', 'Hot', 'Price: Low', 'Price: High'];

  // Helper to map existing categories for demo consistency
  const getDisplayCategory = (prodCat: string) => {
    if (!prodCat) return '';
    if (prodCat === 'merch') return 'Apparel';
    if (prodCat === 'digital') return 'Software';
    if (prodCat === 'equipment') return 'Accessories';
    return prodCat;
  };

  const getProductType = (prod: any) => {
    const cat = prod.category || '';
    if (['Software', 'Samples', 'digital'].includes(cat) || cat === 'digital' || prod.type === 'digital') return 'digital';
    return 'physical';
  };

  // Filtering Logic
  const filteredProducts = products.filter(product => {
    if (!product) return false;

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
      case 'Price: Low': return a.price - b.price;
      case 'Price: High': return b.price - a.price;
      case 'Hot': return (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0);
      case 'Newest': return 0;
      default: return 0;
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
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">All <span className="text-brand-purple">Products</span></h1>
            <p className="text-gray-400">Browse our collection of tech, merch, and digital tools.</p>
          </div>
          <button
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-[#15151A] border border-white/10 rounded-lg text-sm font-bold mt-4 text-white"
            onClick={() => setIsMobileFiltersOpen(true)}
          >
            <Filter size={16} /> Filters
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar Filters */}
          <aside className={`
            fixed inset-0 z-50 bg-[#0B0B0F] p-6 overflow-y-auto transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto lg:w-64 lg:p-0 lg:block lg:bg-transparent
            ${isMobileFiltersOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="flex justify-between items-center lg:hidden mb-6">
              <h2 className="text-xl font-bold text-white">Filters</h2>
              <button onClick={() => setIsMobileFiltersOpen(false)}><X size={24} className="text-gray-500" /></button>
            </div>

            <div className="space-y-8">
              {/* Search */}
              <div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#15151A] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Sort By</h3>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-[#15151A] border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-brand-purple appearance-none"
                  >
                    {sortOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Categories</h3>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${selectedCategory === cat ? 'border-brand-purple' : 'border-gray-600'}`}>
                        {selectedCategory === cat && <div className="w-2 h-2 rounded-full bg-brand-purple" />}
                      </div>
                      <input
                        type="radio"
                        name="category"
                        className="hidden"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(cat)}
                      />
                      <span className={`text-sm ${selectedCategory === cat ? 'text-white font-bold' : 'text-gray-400 group-hover:text-gray-200'}`}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Price</h3>
                <div className="space-y-2">
                  {prices.map(p => (
                    <label key={p} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${selectedPrice === p ? 'border-brand-purple' : 'border-gray-600'}`}>
                        {selectedPrice === p && <div className="w-2 h-2 rounded-full bg-brand-purple" />}
                      </div>
                      <input
                        type="radio"
                        name="price"
                        className="hidden"
                        checked={selectedPrice === p}
                        onChange={() => setSelectedPrice(p)}
                      />
                      <span className={`text-sm ${selectedPrice === p ? 'text-white font-bold' : 'text-gray-400 group-hover:text-gray-200'}`}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* OS */}
              <div>
                <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">OS</h3>
                <div className="space-y-2">
                  {osOptions.map(os => (
                    <label key={os} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${selectedOS === os ? 'border-brand-purple' : 'border-gray-600'}`}>
                        {selectedOS === os && <div className="w-2 h-2 rounded-full bg-brand-purple" />}
                      </div>
                      <input
                        type="radio"
                        name="os"
                        className="hidden"
                        checked={selectedOS === os}
                        onChange={() => setSelectedOS(os)}
                      />
                      <span className={`text-sm ${selectedOS === os ? 'text-white font-bold' : 'text-gray-400 group-hover:text-gray-200'}`}>{os}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="w-full py-3 border border-white/10 text-gray-300 rounded-lg text-sm hover:bg-white/5 transition font-bold"
              >
                Clear All Filters
              </button>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {paginatedProducts.map((product) => (
                    <div key={product.id} className="bg-[#15151A] rounded-xl overflow-hidden border border-white/5 hover:border-brand-purple/50 transition group flex flex-col shadow-lg">
                      <Link to={`/store/${product.id}`} className="relative aspect-square bg-gray-800 block overflow-hidden">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />

                        {/* Tags */}
                        <div className="absolute top-2 left-2 flex flex-col gap-2">
                          {product.isHot && (
                            <div className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded shadow-lg uppercase tracking-wider">
                              HOT
                            </div>
                          )}
                          {product.price === 0 && (
                            <div className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded shadow-lg uppercase tracking-wider">
                              FREE
                            </div>
                          )}
                        </div>

                        {(getProductType(product) === 'digital') && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded shadow-lg uppercase tracking-wider">
                            DIGITAL
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 translate-y-full group-hover:translate-y-0 transition duration-300 bg-gradient-to-t from-black to-transparent">
                          <p className="text-white text-xs font-bold text-center">View Details</p>
                        </div>
                      </Link>

                      <div className="p-3 md:p-5 flex-1 flex flex-col">
                        <Link to={`/store/${product.id}`} className="block">
                          <h3 className="text-sm md:text-lg font-bold text-white mb-1 hover:text-brand-cyan transition line-clamp-1">{product.name}</h3>
                        </Link>
                        <div className="flex justify-between items-center mb-2 md:mb-4">
                          <p className="text-gray-400 text-[10px] md:text-xs capitalize">{getDisplayCategory(product.category)}</p>
                          {product.os && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300 hidden sm:inline">{product.os}</span>}
                        </div>

                        <div className="mt-auto pt-3 md:pt-4 border-t border-white/5">
                          <div className="text-base md:text-xl font-bold text-white mb-2 md:mb-3">
                            {product.price === 0 ? 'Free' : `KES ${product.price.toLocaleString()}`}
                          </div>
                          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                            <button
                              onClick={() => addToCart(product)}
                              className="flex items-center justify-center gap-1.5 py-2 bg-brand-purple text-white rounded-lg font-bold text-xs md:text-sm hover:bg-purple-600 transition"
                            >
                              <ShoppingCart size={14} className="md:w-4 md:h-4" /> {product.price === 0 ? 'Get' : 'Cart'}
                            </button>
                            <a
                              href={`https://wa.me/${siteConfig.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name}. Is it available?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 py-2 bg-[#25D366] text-white rounded-lg font-bold text-xs md:text-sm hover:bg-[#20bd5a] transition"
                            >
                              <MessageCircle size={14} className="md:w-4 md:h-4" /> <span className="sm:hidden lg:inline">Chat</span><span className="hidden sm:inline lg:hidden">WA</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center gap-4">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-[#15151A] border border-white/10 rounded-lg text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition"
                    >
                      Previous
                    </button>
                    <span className="flex items-center text-gray-400 text-sm">
                      Page <span className="text-white font-bold mx-1">{currentPage}</span> of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-[#15151A] border border-white/10 rounded-lg text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-[#15151A] rounded-2xl border border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Search size={32} className="text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
                <p className="text-gray-400 mb-6">Try adjusting your search or filters.</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-brand-purple text-white rounded-lg hover:bg-purple-600 transition font-bold"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Store;
