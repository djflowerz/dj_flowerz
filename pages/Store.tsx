import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import {
  Filter, Search, X, Grid, Headphones, Disc, Laptop,
  Smartphone, Battery, Database, Music, Shirt, ShoppingCart,
  Star, ChevronLeft, ChevronRight, ChevronDown, Check, Copy,
  Facebook, Twitter, Mail, MessageCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { VirtuosoGrid } from 'react-virtuoso';
import { useCart } from '../context/CartContext';

export default function Products() {
  const { products, productsLoading } = useData();
  const { addToCart: addItem } = useCart();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || 'All';
  const typeFilter = searchParams.get('type') || 'all';
  const priceFilter = searchParams.get('price') || 'All';
  const ratingFilter = searchParams.get('rating') || 'All';
  const sortOption = searchParams.get('sort') || 'newest';

  useEffect(() => {
    let result = [...products];

    // Filter by Search
    if (searchQuery) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by Category
    if (categoryFilter !== 'All') {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Filter by Type
    if (typeFilter !== 'all') {
      result = result.filter(p => {
        const cat = p.category || '';
        const isDigital = ['Software', 'Samples', 'digital'].includes(cat) || p.type === 'digital';
        return typeFilter === 'digital' ? isDigital : !isDigital;
      });
    }

    // Filter by Price
    if (priceFilter !== 'All') {
      if (priceFilter === 'Free') {
        result = result.filter(p => p.price === 0);
      } else if (priceFilter === 'Paid') {
        result = result.filter(p => p.price > 0);
      }
    }

    // Filter by Rating
    if (ratingFilter !== 'All') {
      const minRating = parseInt(ratingFilter);
      result = result.filter(p => (p.rating || 0) >= minRating);
    }

    // Sort
    if (sortOption === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'hot') {
      result.sort((a, b) => (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0));
    } else if (sortOption === 'top-rated') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortOption === 'most-reviewed') {
      result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }
    // Default newest handled by DataContext or original order

    setFilteredProducts(result);
  }, [products, searchQuery, categoryFilter, typeFilter, priceFilter, ratingFilter, sortOption]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  if (productsLoading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
    </div>
  );

  const categoriesList = ['All', 'Audio Equipment', 'DJ Equipment', 'Laptops', 'Mobile Phones', 'Mobile Accessories', 'Software', 'Samples', 'Apparel', 'Accessories', 'Other'];

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

  const getDisplayCategory = (cat: string) => {
    if (!cat) return 'Other';
    if (['Head Phones & Ear Buds', 'Speakers', 'Studio Monitors', 'Microphones', 'Cables', 'Studio Furniture'].includes(cat)) return 'Audio Equipment';
    if (['DJ Controllers', 'Vinyl Records', 'DJ Lighting'].includes(cat)) return 'DJ Equipment';
    return cat;
  };

  if (productsLoading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
    </div>
  );

  return (
    <div className="bg-[#050507] min-h-screen pt-24 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">

        {/* Store Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 md:mb-12">
          <div className="md:col-span-2 relative h-[350px] md:h-[450px] rounded-3xl overflow-hidden bg-brand-purple flex flex-col justify-center p-8 md:p-12 border border-white/10 group shadow-lg">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.1] z-0 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-0"></div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 blur-[80px] rounded-full group-hover:bg-brand-cyan/20 transition duration-700 pointer-events-none"></div>

            <div className="relative z-10 max-w-lg text-left">
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

          <div className="md:col-span-1 flex flex-col gap-4 h-[350px] md:h-[450px]">
            <div
              onClick={() => { updateFilter('category', 'Audio Equipment'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}
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
                <div className="w-14 h-14 rounded-full border border-orange-500/50 flex items-center justify-center mb-3 bg-black/40 backdrop-blur-md text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                  <Star size={24} className="fill-current" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Pro Audio Gear</h3>
                <p className="text-sm font-medium text-white/90">Up to 20% off hardware</p>
              </div>
            </div>

            <div
              onClick={() => { updateFilter('category', 'Mobile Accessories'); document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); }}
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
                <div className="w-14 h-14 rounded-full border border-blue-500/50 flex items-center justify-center mb-3 bg-black/40 backdrop-blur-md text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <ShoppingCart size={24} />
                </div>
                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Mobile & Accessories</h3>
                <p className="text-sm font-medium text-white/90">Fresh products just dropped</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div id="products-section" className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 bg-[#15151A]/80 backdrop-blur-xl p-4 rounded-[32px] border border-white/10 shadow-2xl">
          <div className="w-full md:flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full bg-black/20 border-transparent rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-brand-purple/50 transition-all"
            />
          </div>

          <div className="w-full md:w-auto flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative w-full md:w-48">
              <select
                value={sortOption}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-3.5 pl-4 pr-10 text-sm text-gray-300 focus:outline-none focus:bg-black/40 appearance-none cursor-pointer"
              >
                <option value="newest" className="bg-[#15151A]">Newest Arrivals</option>
                <option value="hot" className="bg-[#15151A]">Hot & Popular</option>
                <option value="top-rated" className="bg-[#15151A]">Top Rated</option>
                <option value="most-reviewed" className="bg-[#15151A]">Most Reviewed</option>
                <option value="price-low" className="bg-[#15151A]">Price: Low to High</option>
                <option value="price-high" className="bg-[#15151A]">Price: High to Low</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Categories Slider */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">Shop by Category</h2>
            <div className="hidden md:flex gap-2 items-center">
              {['digital', 'physical'].map(type => (
                <button
                  key={type}
                  onClick={() => updateFilter('type', typeFilter === type ? 'all' : type)}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${typeFilter === type
                    ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                    : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {type}
                </button>
              ))}
              <div className="w-px h-4 bg-white/10 mx-2"></div>
              {['Free', 'Paid'].map(price => (
                <button
                  key={price}
                  onClick={() => updateFilter('price', priceFilter === price ? 'All' : price)}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${priceFilter === price
                    ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                    : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {price}
                </button>
              ))}
              <div className="w-px h-4 bg-white/10 mx-2"></div>
              {[4, 3].map(stars => (
                <button
                  key={stars}
                  onClick={() => updateFilter('rating', ratingFilter === stars.toString() ? 'All' : stars.toString())}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border flex items-center gap-1.5 ${ratingFilter === stars.toString()
                    ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                    : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Star size={12} className={ratingFilter === stars.toString() ? 'fill-brand-cyan' : ''} /> {stars}+ Stars
                </button>
              ))}
              {(searchQuery || categoryFilter !== 'All' || typeFilter !== 'all' || priceFilter !== 'All' || ratingFilter !== 'All') && (
                <button
                  onClick={() => {
                    const newParams = new URLSearchParams();
                    setSearchParams(newParams);
                  }}
                  className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 ml-4"
                >
                  <X size={14} /> Clear All
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
              className="absolute -left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white opacity-100 transition-opacity hover:bg-brand-purple hover:border-brand-purple shadow-xl"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('category-slider');
                if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
              }}
              className="absolute -right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white opacity-100 transition-opacity hover:bg-brand-purple hover:border-brand-purple shadow-xl"
            >
              <ChevronRight size={24} />
            </button>

            <div id="category-slider" className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar pb-6 px-2 -mx-2 scroll-smooth">
              {categoriesList.map(cat => {
                const asset = categoryAssets[cat] || categoryAssets['Other'];
                const isSelected = categoryFilter === cat;
                return (
                  <div
                    key={cat}
                    onClick={() => updateFilter('category', cat)}
                    className="flex flex-col items-center gap-4 cursor-pointer group flex-shrink-0"
                  >
                    <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden relative shadow-lg transition-all duration-300 border-[3px] ${isSelected ? 'border-brand-purple scale-110 shadow-[0_0_25px_rgba(157,78,221,0.5)]' : 'border-[#15151A] group-hover:border-white/20 group-hover:scale-105'}`}>
                      <img src={asset.img} alt={cat} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
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
          <div className="flex md:hidden gap-2 mt-4 overflow-x-auto pb-6 no-scrollbar">
            {['digital', 'physical'].map(type => (
              <button
                key={type}
                onClick={() => updateFilter('type', typeFilter === type ? 'all' : type)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${typeFilter === type
                  ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                  : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                {type}
              </button>
            ))}
            {['Free', 'Paid'].map(price => (
              <button
                key={price}
                onClick={() => updateFilter('price', priceFilter === price ? 'All' : price)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${priceFilter === price
                  ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(40,230,220,0.15)]'
                  : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                {price}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 w-full">
          {filteredProducts.length > 0 ? (
            <VirtuosoGrid
              useWindowScroll
              data={filteredProducts}
              listClassName="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6"
              itemContent={(index, product) => {
                const isDigital = ['Software', 'Samples', 'digital'].includes(product.category || '') || product.type === 'digital';
                const displayCategory = getDisplayCategory(product.category || '');

                return (
                  <div key={product.id} className="bg-[#15151A] rounded-[24px] overflow-hidden border border-white/5 hover:border-brand-purple/50 transition duration-300 group flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 relative h-full">
                    <Link to={`/store/${product.slug || product.id}`} className="relative h-[200px] md:h-[240px] flex-shrink-0 bg-white border-b border-white/5 flex items-center justify-center group/img p-4 overflow-hidden">
                      <img src={product.image || product.image_url || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-full object-contain group-hover/img:scale-110 transition duration-500 relative z-10" />

                      {/* Tags */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                        {product.isHot && (
                          <div className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider backdrop-blur-md">
                            HOT
                          </div>
                        )}
                        {product.discountPrice && (
                          <div className="bg-brand-cyan text-black text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-tighter backdrop-blur-md">
                            DISCOUNT
                          </div>
                        )}
                        {product.price === 0 && (
                          <div className="bg-green-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider backdrop-blur-md">
                            FREE
                          </div>
                        )}
                        {isDigital && (
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
                        <Link to={`/store/${product.slug || product.id}`} className="block flex-1">
                          <h3 className="text-white font-bold text-[14px] md:text-[16px] line-clamp-2 leading-tight hover:text-brand-purple transition">{product.name}</h3>
                        </Link>
                        <p className="text-gray-400 text-[10px] md:text-xs capitalize flex-shrink-0 border border-white/10 px-2 py-0.5 rounded-full">{displayCategory}</p>
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
                          {product.discountPrice && product.discountPrice > 0 ? (
                            <>
                              <span className="text-gray-500 line-through text-[10px] md:text-xs font-medium leading-none mb-1">
                                KES {product.price.toLocaleString()}
                              </span>
                              <span className="text-brand-cyan font-black text-lg md:text-xl leading-none">
                                KES {product.discountPrice.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <span className="text-brand-cyan font-black text-lg md:text-xl leading-none">
                              {product.price === 0 ? 'Free' : `KES ${product.price.toLocaleString()}`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              addItem(product);
                              alert(`${product.name} added to cart!`);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-purple text-white rounded-xl font-bold text-xs md:text-sm hover:bg-purple-600 transition shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
                          >
                            <ShoppingCart size={16} /> {product.price === 0 ? 'Download' : 'Add to Cart'}
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/store/${product.slug || product.id}`;
                                navigator.clipboard.writeText(url);
                                alert('Link copied!');
                              }}
                              className="w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-brand-purple hover:bg-white/10 transition h-10"
                              title="Copy Link"
                            >
                              <Copy size={14} />
                            </button>

                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/store/${product.slug || product.id}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${product.name} on DJ Flowerz! ${url}`)}`, '_blank');
                              }}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-bold text-[10px] hover:text-[#25D366] hover:bg-white/10 transition h-10"
                              title="Share on WhatsApp"
                            >
                              <MessageCircle size={14} /> WhatsApp
                            </button>

                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/store/${product.slug || product.id}`;
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                              }}
                              className="w-10 flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 rounded-xl hover:text-[#1877F2] hover:bg-white/10 transition h-10"
                              title="Share on Facebook"
                            >
                              <Facebook size={14} />
                            </button>

                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/store/${product.slug || product.id}`;
                                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out ${product.name} on DJ Flowerz!`)}`, '_blank');
                              }}
                              className="w-10 flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 rounded-xl hover:text-[#1DA1F2] hover:bg-white/10 transition h-10"
                              title="Share on X"
                            >
                              <Twitter size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <div className="text-center py-24 bg-[#15151A] rounded-[32px] border border-white/5">
              <div className="bg-white/5 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No products found</h3>
              <p className="text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="mt-8 px-8 py-3.5 bg-brand-purple text-white rounded-xl hover:bg-purple-600 transition font-bold"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

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
      </div>
    </div >
  );
}
