import React from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, ShoppingBag, Youtube, Mail, Disc, Headphones, Music, Star } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import MusicPoolPreview from '../components/MusicPoolPreview';
import { CountdownTimer } from '../components/CountdownTimer';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';

const toEmbedUrl = (url: string): string => {
   if (!url) return '';
   if (url.includes('youtube.com/embed/')) return url;
   const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
   if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
   const watchMatch = url.match(/[?&]v=([^?&]+)/);
   if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
   return url;
};

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

      const featured = activeProducts.filter(p => p.isFeatured);
      const others = activeProducts.filter(p => !p.isFeatured);
      
      const shuffle = (arr: any[]) => [...arr].sort(() => 0.5 - Math.random());
      
      const combined = [...featured, ...shuffle(others)];
      setDisplayProducts(combined.slice(0, 8));
   }, [products, user]);

   return (
      <div className="pb-20">

         {/* 1. Hero Section */}
         <Hero 
            badge="The Official Audio Portal"
            title={
               <>
                  DJ <span className="text-brand-purple">FLOWERZ</span>
               </>
            }
            subtitle={hero.subtitle}
            cta1Text="Join The Community"
            cta1Link="/community"
            cta2Text="Visit Store"
            cta2Link="/store"
            bgImage={hero.bgImage}
         />

         {/* 2. Store Preview Section */}
         <section className="py-24 bg-[#0B0B0F] border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                  <div>
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-black uppercase tracking-widest mb-4">
                        <ShoppingBag size={12} /> Premium Gear
                     </div>
                     <h2 className="text-4xl md:text-5xl font-outfit font-black text-white uppercase italic tracking-tighter">
                        Featured <span className="text-brand-cyan">Products</span>
                     </h2>
                     <p className="text-gray-400 mt-4 font-medium max-w-xl leading-relaxed">
                        Elevate your performance with our curated selection of professional DJ equipment and exclusive merchandise.
                     </p>
                  </div>
                  <Link to="/store" className="btn-premium px-8 py-4 text-xs uppercase tracking-widest group">
                     <span className="flex items-center gap-2">
                        Browse Full Store
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                     </span>
                  </Link>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {displayProducts.slice(0, 4).map((product) => (
                     <ProductCard key={product.id} product={product} viewMode="grid" />
                  ))}
               </div>
            </div>
         </section>

         {/* 4. Featured Mixtapes (Re-integrated) */}
         <section className="py-20 bg-[#0B0B0F]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex justify-between items-end mb-12">
                  <div>
                     <h2 className="text-3xl md:text-4xl font-outfit font-black text-white uppercase italic">Featured Mixtapes</h2>
                     <p className="text-gray-400 mt-2 font-medium">Curated sets for the ultimate listening experience.</p>
                  </div>
                  <Link to="/mixtapes" className="text-brand-pink flex items-center gap-2 hover:underline font-black uppercase text-xs tracking-widest transition">
                     Explore All <ArrowRight size={16} />
                  </Link>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {featuredMixtapes.map((mix) => (
                     <div key={mix.id} className="group relative glass-card rounded-2xl overflow-hidden hover:-translate-y-2 transition-all duration-500 hover:shadow-brand-purple/20">
                        <div className="relative aspect-[4/5] overflow-hidden">
                           <img loading="lazy" src={mix.coverUrl} alt={mix.title} className="w-full h-full object-cover transition duration-700 group-hover:scale-110 group-hover:rotate-2 opacity-80 group-hover:opacity-100" />
                           <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60" />
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                              <button
                                 onClick={() => playTrack(mix)}
                                 className="w-14 h-14 rounded-full bg-brand-purple text-white flex items-center justify-center hover:scale-110 transition shadow-[0_0_30px_rgba(123,92,255,0.6)] border border-white/20"
                              >
                                 {currentTrack?.id === mix.id && isPlaying ? <div className="w-3 h-3 bg-white animate-pulse rounded-sm" /> : <Play size={20} fill="white" className="ml-1" />}
                              </button>
                           </div>
                           <div className="absolute top-4 left-4">
                              <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-brand-cyan">
                                 {mix.genre}
                              </span>
                           </div>
                        </div>
                        <div className="p-6">
                           <Link to={`/mixtapes/${mix.id}`} className="block hover:text-brand-purple transition-colors mb-3">
                              <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{mix.title}</h3>
                           </Link>
                           <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                               <span className="flex items-center gap-1.5"><Disc size={12} className="text-brand-pink" /> {mix.tracksCount || 12} Tracks</span>
                               <span className="flex items-center gap-1.5"><Headphones size={12} className="text-brand-cyan" /> {mix.duration}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* 5. Music Pool Preview & Grid - Removed per request to hide from public UI */}

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
                     <h2 className="text-3xl md:text-4xl font-outfit font-black text-white mb-4">{home.studioPromo.title}</h2>
                     <p className="text-gray-400 mb-8 leading-relaxed">
                        {home.studioPromo.description}
                     </p>
                     <Link to="/bookings" className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition">
                        {home.studioPromo.ctaText}
                     </Link>
                  </div>
                  <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                     <Link to="/bookings" className="bg-[#15151A] p-6 rounded-2xl border border-white/5 text-center hover:border-brand-pink/50 transition cursor-pointer group">
                        <Disc size={32} className="text-brand-pink mx-auto mb-3 group-hover:scale-110 transition" />
                        <h3 className="text-white font-bold">DJ Sets</h3>
                        <p className="text-xs text-gray-500 mt-1">Weddings, Clubs, Corporate</p>
                     </Link>
                     <Link to="/sessions" className="bg-[#15151A] p-6 rounded-2xl border border-white/5 text-center hover:border-brand-cyan/50 transition cursor-pointer group">
                        <Music size={32} className="text-brand-cyan mx-auto mb-3 group-hover:scale-110 transition" />
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
                  <h2 className="text-3xl font-outfit font-black text-white mb-4">{home.tipJar.title}</h2>
                  <p className="text-gray-400 max-w-lg mx-auto mb-8">
                     {home.tipJar.message}
                  </p>
                   <Link to="/tip-jar" className="px-8 py-3 border-2 border-brand-pink text-brand-pink font-bold rounded-full hover:bg-brand-pink hover:text-white transition">
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
               <form
                  className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto"
                  onSubmit={async (e) => {
                     e.preventDefault();
                     const email = (e.currentTarget.elements[0] as HTMLInputElement).value;
                     if (!email) return;

                     const btn = e.currentTarget.querySelector('button');
                     if (btn) {
                        btn.disabled = true;
                        btn.textContent = 'Joining...';
                     }

                     try {
                        await addSubscriber(email, 'Homepage Newsletter');
                        alert('Successfully joined the community!');
                        (e.target as HTMLFormElement).reset();
                     } catch (err) {
                        alert('Something went wrong. Please try again.');
                     } finally {
                        if (btn) {
                           btn.disabled = false;
                           btn.textContent = 'Join Now';
                        }
                     }
                  }}
               >
                  <div className="flex-1 flex items-center glass-panel rounded-xl px-5 border border-white/10 group focus-within:border-brand-purple transition-all">
                     <Mail className="text-gray-500 group-focus-within:text-brand-purple transition-colors" size={20} />
                     <input
                        type="email"
                        id="newsletter-email"
                        name="email"
                        required
                        placeholder="Your terminal address (guest@djflowerz.com)"
                        className="flex-1 bg-transparent border-none py-5 text-white focus:ring-0 placeholder:text-gray-600 outline-none font-medium ml-3"
                     />
                  </div>
                  <button type="submit" className="btn-premium px-10 py-5 uppercase tracking-[0.2em] text-xs font-black min-w-[180px]">
                     Join Community
                  </button>
               </form>
            </div>
         </section>
      </div>
   );
};

export default Home;