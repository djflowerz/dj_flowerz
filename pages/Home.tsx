import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, ShoppingBag, Youtube, Mail, Disc, Headphones, Music, Star } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import MusicPoolPreview from '../components/MusicPoolPreview';
import { CountdownTimer } from '../components/CountdownTimer';

const toEmbedUrl = (url: string): string => {
   if (!url) return '';
   if (url.includes('youtube.com/embed/')) return url;
   const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
   if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
   const watchMatch = url.match(/[?&]v=([^?&]+)/);
   if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
   return url;
};

import AuraHero from '../components/AuraHero';

const Home: React.FC = () => {
   const { user } = useAuth();
   const { siteConfig, mixtapes, products, youtubeVideos, addSubscriber } = useData();
   const { addToCart } = useCart();
   const { playTrack, currentTrack, isPlaying } = usePlayer();
   const { hero, home } = siteConfig;

   const featuredMixtapes = mixtapes.slice(0, 4);

   const [displayProducts, setDisplayProducts] = React.useState<any[]>(products.slice(0, 6));

   React.useEffect(() => {
      const activeProducts = products.filter(p => {
         if (user?.isAdmin) return true;
         return p.status !== 'hidden' && p.status !== 'draft';
      });

      const shuffleProducts = () => {
         if (activeProducts.length === 0) return;
         const shuffled = [...activeProducts].sort(() => 0.5 - Math.random());
         setDisplayProducts(shuffled.slice(0, 6));
      };

      shuffleProducts();
      const interval = setInterval(shuffleProducts, 5000);
      return () => clearInterval(interval);
   }, [products, user]);

   return (
      <div className="pb-20">
         {/* 1. Universal Aura Hero Section */}
         <AuraHero
            badge="The Official Audio Portal"
            title={hero.title}
            highlightWords={['mixtapes', 'future']}
            subtitle={hero.subtitle}
            ctas={[
               { label: hero.ctaText, path: '/music-pool', icon: Headphones, primary: true },
               { label: 'Visit Store', path: '/store', icon: ShoppingBag }
            ]}
         >
            {/* Newsletter Integration in Hero */}
            <div className="max-w-md mx-auto mt-10">
               <form
                  className="flex flex-col sm:flex-row gap-2"
                  onSubmit={async (e) => {
                     e.preventDefault();
                     const email = (e.currentTarget.elements[0] as HTMLInputElement).value;
                     if (!email) return;
                     try {
                        const { MailerLiteService } = await import('../services/MailerLiteService');
                        await MailerLiteService.subscribe({ email });
                        await addSubscriber(email, 'Hero Newsletter');
                        alert('Subscribed for exclusive updates!');
                        (e.target as HTMLFormElement).reset();
                     } catch (err) { }
                  }}
               >
                  <input
                     type="email"
                     placeholder="Get exclusive updates & deals..."
                     className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple/50 flex-grow backdrop-blur-md"
                  />
                  <button type="submit" className="bg-brand-purple text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-brand-purple/20">
                     Join Now
                  </button>
               </form>
               <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">5,000+ DJs Already Joined • No Spam • Unsubscribe Anytime</p>
            </div>

            {/* Stats / Proof (Centered) */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-12 border-t border-white/5 pt-10 w-full max-w-3xl mx-auto">
               <div className="text-center">
                  <div className="text-3xl font-black text-white mb-1">500+</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Exclusive Tracks</div>
               </div>
               <div className="text-center">
                  <div className="text-3xl font-black text-white mb-1">10K+</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Monthly Listeners</div>
               </div>
               <div className="text-center">
                  <div className="text-3xl font-black text-white mb-1">24/7</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Studio Access</div>
               </div>
            </div>
         </AuraHero>


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

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featuredMixtapes.map((mix) => (
                     <div key={mix.id} className="group relative bg-[#15151A] rounded-xl overflow-hidden hover:-translate-y-2 transition duration-300 border border-white/5 shadow-lg hover:shadow-brand-purple/10">
                        <div className="relative aspect-square">
                           <img src={mix.coverUrl} alt={mix.title} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 backdrop-blur-sm">
                              <button
                                 onClick={() => playTrack(mix)}
                                 className="w-10 h-10 rounded-full bg-brand-purple text-white flex items-center justify-center hover:scale-110 transition shadow-[0_0_20px_rgba(123,92,255,0.5)]"
                              >
                                 {currentTrack?.id === mix.id && isPlaying ? <div className="w-2 h-2 bg-white animate-pulse" /> : <Play size={16} fill="white" className="ml-0.5" />}
                              </button>
                           </div>
                        </div>
                        <div className="p-4">
                           <Link to={`/mixtapes/${mix.id}`} className="block hover:text-brand-cyan transition">
                              <h3 className="text-base font-bold text-white mb-2 truncate">{mix.title}</h3>
                           </Link>
                           <div className="flex justify-between items-center text-[10px] text-gray-400">
                              <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 uppercase tracking-wider">{mix.genre}</span>
                              <span className="flex items-center gap-1"><Music size={10} /> {mix.duration}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* 3. Weekly Best Deals (Store Promo) - Dribbble Concept Match */}
         <section className="py-24 bg-[#0F0F13] text-white overflow-hidden border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

               {/* Header Row */}
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                  <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">Weekly Best Deals</h2>
                  {siteConfig.promoTimer?.enabled && (
                     <div className="flex items-center gap-4">
                        <span className="text-sm font-medium tracking-wide">{siteConfig.promoTimer.label}</span>
                        <CountdownTimer expiryDate={siteConfig.promoTimer.endDate} variant="premium" />
                     </div>
                  )}
               </div>

               {/* Filters / Categories */}
               <div className="flex overflow-x-auto pb-4 mb-8 gap-3 scrollbar-hide">
                  <button className="whitespace-nowrap px-6 py-2.5 rounded-full border border-white/20 text-sm font-medium hover:bg-white/10 transition">Up to 90% off</button>
                  <button className="whitespace-nowrap px-6 py-2.5 rounded-full border border-white/20 text-sm font-medium hover:bg-white/10 transition">Under KES 1000</button>
                  <button className="whitespace-nowrap px-6 py-2.5 rounded-full bg-brand-cyan text-black border hover:bg-cyan-400 border-brand-cyan text-sm font-bold shadow-[0_0_15px_rgba(40,230,220,0.3)] transition">Almost Sold out</button>
                  <button className="whitespace-nowrap px-6 py-2.5 rounded-full border border-white/20 text-sm font-medium hover:bg-white/10 transition">DJ Equipment</button>
                  <button className="whitespace-nowrap px-6 py-2.5 rounded-full border border-white/20 text-sm font-medium hover:bg-white/10 transition">Audio & Wearables</button>
                  <button className="whitespace-nowrap px-6 py-2.5 rounded-full border border-white/20 text-sm font-medium hover:bg-white/10 transition">Software & Plugins</button>
               </div>

               {/* Top 4 Products Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  {displayProducts.slice(0, 4).map((product) => (
                     <Link to={`/store/${product.id}`} key={product.id} className="bg-[#15151A] rounded-[20px] overflow-hidden group shadow-xl hover:shadow-2xl hover:border-brand-purple/50 border border-white/5 hover:-translate-y-1 transition duration-300 flex flex-col relative h-[480px]">
                        <div className="absolute top-4 left-4 z-10">
                           <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md uppercase tracking-wider">Sale</span>
                        </div>
                        <div className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-black/80 hover:shadow-lg transition">
                           <span className="text-xl leading-none -mt-0.5">♡</span>
                        </div>

                        <div className="relative h-[280px] p-4 flex-shrink-0 bg-white border-b border-white/5 flex items-center justify-center">
                           <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition duration-500 drop-shadow-sm" />
                        </div>

                        <div className="p-5 flex flex-col flex-grow bg-[#15151A]">
                           <h3 className="text-white font-semibold text-[15px] line-clamp-2 leading-tight mb-2 group-hover:text-brand-purple transition">{product.name}</h3>

                           <div className="flex gap-1 mb-auto">
                              <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                              <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                              <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                              <Star size={12} className="text-[#E8C053] fill-[#E8C053]" />
                              <Star size={12} className="text-gray-500 fill-gray-500" />
                              <span className="text-[10px] text-gray-400 ml-1 font-medium">(24)</span>
                           </div>

                           <div className="mt-4">
                              <div className="flex items-end gap-2 mb-4">
                                 <span className="text-brand-cyan font-black text-xl leading-none">
                                    {product.discountPrice && product.discountPrice > 0 ? `KES ${product.discountPrice.toLocaleString()}` : (product.price === 0 ? 'Free' : `KES ${product.price.toLocaleString()}`)}
                                 </span>
                                 {product.discountPrice && product.discountPrice > 0 && (
                                    <span className="text-gray-500 line-through text-xs font-medium">KES {product.price.toLocaleString()}</span>
                                 )}
                              </div>

                              <button
                                 className="w-full bg-brand-purple text-white py-3 rounded-xl text-sm font-bold hover:bg-purple-600 transition-colors shadow-md submit-btn"
                                 onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addToCart(product);
                                 }}
                              >
                                 Add to Cart
                              </button>
                           </div>
                        </div>
                     </Link>
                  ))}
               </div>

               {/* Bottom Promo Banners */}
               {displayProducts.length > 4 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {displayProducts.slice(4, 6).map((product, idx) => {
                        const bgColors = ['bg-gradient-to-br from-[#1A1A24] to-[#0B0B0F] border border-white/5', 'bg-gradient-to-br from-[#15151A] to-[#0A0A0C] border border-white/5'];
                        return (
                           <Link to={`/store/${product.id}`} key={product.id} className={`${bgColors[idx]} rounded-[24px] p-8 flex flex-col sm:flex-row items-center justify-between relative overflow-hidden group hover:shadow-2xl hover:border-brand-purple/30 hover:-translate-y-1 transition duration-300`}>
                              <div className="relative z-10 sm:w-1/2 flex flex-col items-start gap-3">
                                 <span className="text-[10px] font-bold tracking-widest uppercase text-brand-purple bg-brand-purple/10 px-3 py-1 rounded-full shadow-sm">
                                    {idx === 0 ? 'DJ Equipment' : 'Studio Essentials'}
                                 </span>
                                 <h3 className="text-white font-black text-2xl lg:text-3xl uppercase leading-[1.1] mt-1">
                                    <span className="block mb-1">{idx === 0 ? 'PRO DJ GEAR' : 'PREMIUM AUDIO SETUP'}</span>
                                    SPECIAL OFFER
                                 </h3>
                                 <p className="text-gray-400 text-sm font-medium mt-1">
                                    Offers start from <span className="text-brand-cyan font-bold ml-1 bg-white/10 px-2 py-0.5 rounded">KES {product.discountPrice ? product.discountPrice.toLocaleString() : product.price.toLocaleString()}</span>
                                 </p>

                                 <button className="mt-4 bg-brand-purple text-white px-6 py-2.5 rounded-full text-xs font-black tracking-wider uppercase hover:bg-purple-600 transition shadow-lg w-max">
                                    Shop Now
                                 </button>
                              </div>
                              <div className="relative z-10 w-full max-w-[280px] h-[280px] mt-8 sm:mt-0 flex items-center justify-center bg-white rounded-3xl p-6 shadow-2xl border border-white/10">
                                 <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 group-hover:-rotate-6 transition duration-500 drop-shadow-xl relative z-20" />
                              </div>
                           </Link>
                        );
                     })}
                  </div>
               )}
            </div>
         </section>

         {/* 4. Music Pool Preview & Grid */}
         <MusicPoolPreview />

         {/* 5. YouTube Section (Dynamic) */}
         <section className="py-20 bg-[#15151A] border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                     <Youtube size={32} className="text-red-500" /> Latest Videos
                  </h2>
                  <a href="https://www.youtube.com/@dj_flowerz" target="_blank" rel="noopener noreferrer" className="hidden md:flex px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold hover:bg-red-700 transition">
                     Subscribe on YouTube
                  </a>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {youtubeVideos.map((video) => (
                     <div key={video.id} className="rounded-xl overflow-hidden bg-black/40 border border-white/10 group cursor-pointer hover:border-brand-purple/50 transition">
                        <div className="aspect-video relative">
                           <iframe
                              src={toEmbedUrl(video.url)}
                              title={video.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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


      </div>
   );
};

export default Home;