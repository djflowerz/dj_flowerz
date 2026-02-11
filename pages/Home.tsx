import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, ShoppingBag, Youtube, Mail, Disc, Headphones, Music, Star } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';

const Home: React.FC = () => {
  const { siteConfig, mixtapes, products, youtubeVideos } = useData();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { hero, home } = siteConfig;

  const featuredMixtapes = mixtapes.slice(0, 3);
  const displayProducts = [...products].sort((a, b) => (a.isHot === b.isHot ? 0 : a.isHot ? -1 : 1)).slice(0, 4);

  return (
    <div className="pb-20">
      {/* 1. Dynamic Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url("${hero.bgImage}")` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/70 to-black/40 z-0"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <div className="mb-6 animate-fade-in-up">
             <span className="bg-brand-purple/20 text-brand-purple border border-brand-purple/50 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                The Official Platform
             </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-display font-bold text-white mb-6 leading-tight drop-shadow-2xl">
            {hero.title}
          </h1>
          <p className="text-gray-200 text-lg md:text-2xl max-w-2xl mb-10 leading-relaxed font-light">
            {hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link to="/music-pool" className="px-8 py-4 bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(123,92,255,0.6)] transition transform hover:-translate-y-1 flex items-center justify-center gap-2">
              <Headphones size={20} /> {hero.ctaText}
            </Link>
            <Link to="/store" className="px-8 py-4 bg-white/10 border border-white/20 backdrop-blur-md rounded-full text-white font-bold text-lg hover:bg-white/20 transition flex items-center justify-center gap-2">
              <ShoppingBag size={20} /> Visit Store
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Featured Mixtapes (Dynamic) */}
      <section className="py-20 bg-[#0B0B0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white">{home.featuredMixtapes.title}</h2>
              <p className="text-gray-400 mt-2">{home.featuredMixtapes.subtitle}</p>
            </div>
            <Link to="/mixtapes" className="text-brand-cyan flex items-center gap-2 hover:underline font-bold">{home.featuredMixtapes.ctaText} <ArrowRight size={18} /></Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredMixtapes.map((mix) => (
              <div key={mix.id} className="group relative bg-[#15151A] rounded-xl overflow-hidden hover:-translate-y-2 transition duration-300 border border-white/5 shadow-lg hover:shadow-brand-purple/10">
                <div className="relative aspect-square">
                  <img src={mix.coverUrl} alt={mix.title} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 backdrop-blur-sm">
                    <button 
                      onClick={() => playTrack(mix)}
                      className="w-16 h-16 rounded-full bg-brand-purple text-white flex items-center justify-center hover:scale-110 transition shadow-[0_0_20px_rgba(123,92,255,0.5)]"
                    >
                      {currentTrack?.id === mix.id && isPlaying ? <div className="w-4 h-4 bg-white animate-pulse" /> : <Play size={28} fill="white" className="ml-1" />}
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <Link to={`/mixtapes/${mix.id}`} className="block hover:text-brand-cyan transition">
                      <h3 className="text-xl font-bold text-white mb-2 truncate">{mix.title}</h3>
                  </Link>
                  <div className="flex justify-between items-center text-sm text-gray-400">
                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10">{mix.genre}</span>
                    <span className="flex items-center gap-1"><Music size={14} /> {mix.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Store Highlights (Dynamic) */}
      <section className="py-20 bg-[#0F0F13]">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
               <div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">{home.storePromo.title}</h2>
                  <p className="text-gray-400">{home.storePromo.description}</p>
               </div>
               <Link to="/store" className="text-white hover:text-brand-purple transition font-bold uppercase tracking-wider flex items-center gap-2">
                  {home.storePromo.ctaText} <ArrowRight size={16} />
               </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
               {displayProducts.map((product) => (
                  <Link to={`/store/${product.id}`} key={product.id} className="group">
                     <div className="bg-[#15151A] rounded-xl overflow-hidden border border-white/5 hover:border-brand-purple/50 transition relative">
                        <div className="aspect-square bg-gray-800 relative">
                           <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                           {product.isHot && (
                              <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider z-10">
                                HOT
                              </div>
                           )}
                        </div>
                        <div className="p-4">
                           <h3 className="text-white font-bold truncate mb-1 group-hover:text-brand-purple transition">{product.name}</h3>
                           <p className="text-brand-cyan font-bold">KES {product.price.toLocaleString()}</p>
                        </div>
                     </div>
                  </Link>
               ))}
            </div>
         </div>
      </section>

      {/* 4. Music Pool Promo */}
      <section className="py-24 bg-[#0B0B0F] relative overflow-hidden">
         <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-purple/5 skew-x-12"></div>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-12">
               <div className="w-full md:w-1/2">
                  <span className="text-brand-cyan font-bold tracking-wider uppercase mb-2 block">For DJs & Audiophiles</span>
                  <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">{home.musicPool.title}</h2>
                  <p className="text-gray-300 text-lg mb-8">{home.musicPool.description}</p>
                  <ul className="space-y-4 mb-8">
                     {home.musicPool.benefits.map((item, i) => (
                        <li key={i} className="flex items-center text-gray-300 text-lg">
                           <span className="w-6 h-6 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center mr-3 text-xs">✓</span>
                           {item}
                        </li>
                     ))}
                  </ul>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Link to="/music-pool" className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-brand-cyan transition text-center">
                        {home.musicPool.ctaText}
                     </Link>
                     <Link to="/login" className="px-8 py-4 border border-white/20 text-white font-bold rounded-lg hover:bg-white/10 transition text-center">
                        Member Login
                     </Link>
                  </div>
               </div>
               <div className="w-full md:w-1/2 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-purple to-brand-cyan blur-[80px] opacity-20"></div>
                  <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop" alt="DJ Deck" className="relative rounded-2xl shadow-2xl border border-white/10 rotate-2 hover:rotate-0 transition duration-500" />
               </div>
            </div>
         </div>
      </section>

      {/* 5. YouTube Section (Dynamic) */}
      <section className="py-20 bg-[#15151A] border-y border-white/5">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                  <Youtube size={32} className="text-red-500" /> Latest Videos
               </h2>
               <a href="#" className="hidden md:flex px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold hover:bg-red-700 transition">
                  Subscribe on YouTube
               </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {youtubeVideos.map((video) => (
                  <div key={video.id} className="rounded-xl overflow-hidden bg-black/40 border border-white/10 group cursor-pointer hover:border-brand-purple/50 transition">
                     <div className="aspect-video relative">
                        <iframe 
                           src={video.url} 
                           title={video.title}
                           className="w-full h-full"
                           allowFullScreen
                        ></iframe>
                     </div>
                     <div className="p-4">
                        <h3 className="text-white font-bold text-lg truncate group-hover:text-brand-purple transition">{video.title}</h3>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* 6. Bookings & Sessions */}
      <section className="py-20 bg-[#0B0B0F]">
         <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-[#1A1A24] to-[#0B0B0F] p-8 md:p-12 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center gap-12">
               <div className="w-full md:w-1/2">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">{home.studioPromo.title}</h2>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                     {home.studioPromo.description}
                  </p>
                  <Link to="/bookings" className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition">
                     {home.studioPromo.ctaText}
                  </Link>
               </div>
               <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                  <Link to="/bookings" className="bg-[#15151A] p-6 rounded-2xl border border-white/5 text-center hover:border-brand-cyan/50 transition cursor-pointer group">
                     <Disc size={32} className="text-brand-cyan mx-auto mb-3 group-hover:scale-110 transition" />
                     <h3 className="text-white font-bold">DJ Sets</h3>
                     <p className="text-xs text-gray-500 mt-1">Weddings, Clubs, Corporate</p>
                  </Link>
                  <Link to="/sessions" className="bg-[#15151A] p-6 rounded-2xl border border-white/5 text-center hover:border-brand-purple/50 transition cursor-pointer group">
                     <Music size={32} className="text-brand-purple mx-auto mb-3 group-hover:scale-110 transition" />
                     <h3 className="text-white font-bold">Studio</h3>
                     <p className="text-xs text-gray-500 mt-1">Mixing & Mastering</p>
                  </Link>
               </div>
            </div>
         </div>
      </section>

      {/* 7. Tip Jar */}
      <section className="py-20 bg-[#0F0F13]">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-16">
               <Star size={40} className="text-brand-cyan mx-auto mb-4" />
               <h2 className="text-3xl font-bold text-white mb-4">{home.tipJar.title}</h2>
               <p className="text-gray-400 max-w-lg mx-auto mb-8">
                  {home.tipJar.message}
               </p>
               <Link to="/tip-jar" className="px-8 py-3 border-2 border-brand-cyan text-brand-cyan font-bold rounded-full hover:bg-brand-cyan hover:text-black transition">
                  {home.tipJar.ctaText}
               </Link>
            </div>
         </div>
      </section>

      {/* 8. Newsletter */}
      <section className="py-20 bg-gradient-to-b from-[#0B0B0F] to-[#15151A] border-t border-white/5">
         <div className="max-w-3xl mx-auto px-4 text-center">
            <Mail size={48} className="text-brand-purple mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">Join The Community</h2>
            <p className="text-gray-400 mb-8">Get exclusive access to free downloads, event updates, and discount codes.</p>
            <form className="flex flex-col sm:flex-row gap-4">
               <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-6 py-4 text-white focus:outline-none focus:border-brand-purple"
               />
               <button className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-brand-cyan transition">
                  Subscribe
               </button>
            </form>
         </div>
      </section>
    </div>
  );
};

export default Home;