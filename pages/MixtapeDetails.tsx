import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Download, Share2, Video, Music, Calendar, Clock, Star, MessageSquare, Send, User, Youtube, MessageCircle, Instagram, Twitter, Facebook, ChevronDown, ChevronRight, ThumbsUp, RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { getEmbedUrl, isStreamable } from '../utils/embedHelper';
import { downloadFileSecurely } from '../utils/downloadHelper';
import { Comment } from '../types';

const timestampToSeconds = (timestamp: string): number => {
   if (!timestamp) return 0;
   const parts = timestamp.split(':').map(Number);
   if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
   } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
   }
   return 0;
};

const MixtapeDetails: React.FC = () => {
   const { id } = useParams<{ id: string }>();
   const { playTrack, currentTrack, isPlaying, pauseTrack, resumeTrack, currentTime, seek } = usePlayer();
   const { mixtapes, siteConfig, comments, addComment } = useData();
   const { user, isAuthenticated } = useAuth();

   const [newComment, setNewComment] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);

   // Find mix (mock logic)
   // Find mix by ID or Slug
   const mixtape = mixtapes.find(m => m.id === id || m.slug === id) || mixtapes[0];
   const isCurrent = currentTrack?.id === mixtape.id;

   console.log(`[MixtapeDetails] Total mixtapes: ${mixtapes.length}`);
   console.log(`[MixtapeDetails] ID from URL: "${id}"`);
   if (mixtape) {
      console.log(`[MixtapeDetails] Found mix title: "${mixtape.title}", ID: "${mixtape.id}"`);
      console.log(`[MixtapeDetails] URLs - Audio: "${mixtape.audioUrl}", Download: "${mixtape.downloadUrl}"`);
      console.log(`[MixtapeDetails] Duration: "${mixtape.duration}"`);
   } else {
      console.log(`[MixtapeDetails] No mixtape found at all!`);
   }

   const handleShare = () => {
      if (navigator.share) {
         navigator.share({
            title: mixtape.title,
            text: `Check out this mix by DJ Flowerz: ${mixtape.title}`,
            url: window.location.href,
         });
      } else {
         navigator.clipboard.writeText(window.location.href);
         alert('Link copied to clipboard!');
      }
   };

   const handleSubmitComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim() || !isAuthenticated) return;

      setIsSubmitting(true);
      try {
         await addComment(mixtape.id, newComment);
         setNewComment('');
      } catch (error) {
         console.error("Failed to post comment:", error);
      } finally {
         setIsSubmitting(false);
      }
   };

   const mixtapeComments = (comments || []).filter((c: Comment) => c.mixtapeId === mixtape?.id && (c.status === 'published' || c.status === 'pending'));
   const socials = siteConfig?.socials || {};

   const handleDownload = async (url: string, type: 'mixtape_audio' | 'mixtape_video') => {
      if (!mixtape) return;

      const fileName = type === 'mixtape_audio'
         ? `${mixtape.artist || 'DJ Flowerz'} - ${mixtape.title}.mp3`
         : `${mixtape.artist || 'DJ Flowerz'} - ${mixtape.title}.mp4`;

      await downloadFileSecurely(url, {
         fileName,
         trackId: mixtape.id,
         artist: mixtape.artist || 'DJ Flowerz',
         title: mixtape.title,
         type
      });
   };

   return (
      <div className="pt-24 pb-20 bg-[#0B0B0F] min-h-screen">
         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Breadcrumb */}
            <div className="text-sm text-gray-500 mb-8">
               <Link to="/mixtapes" className="hover:text-white">Mixtapes</Link> / <span className="text-gray-300">{mixtape.title}</span>
            </div>

            <div className="flex flex-col md:flex-row gap-12 mb-16">
               {/* Cover Art */}
               <div className="w-full md:w-1/3">
                  <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-brand-purple/10 border border-white/5 relative group">
                     <img src={mixtape.coverUrl} alt={mixtape.title} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <button
                           onClick={() => isCurrent && isPlaying ? pauseTrack() : (isCurrent ? resumeTrack() : playTrack(mixtape))}
                           className="w-20 h-20 bg-brand-purple rounded-full flex items-center justify-center text-white hover:scale-110 transition shadow-lg"
                        >
                           {isCurrent && isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
                        </button>
                     </div>
                  </div>
               </div>

               {/* Info */}
               <div className="w-full md:w-2/3 flex flex-col justify-center">
                  <div className="flex flex-wrap gap-3 mb-4">
                     <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-white uppercase tracking-wider">{mixtape.genre}</span>
                     {mixtape.isExclusive && <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-full text-xs font-bold uppercase tracking-wider">Premium</span>}
                  </div>

                  <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 leading-tight">{mixtape.title}</h1>

                  <div className="flex items-center gap-6 text-gray-400 mb-8 text-sm">
                     <span className="flex items-center gap-2"><Calendar size={16} /> {mixtape.releaseDate ? new Date(mixtape.releaseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : (mixtape.date || 'New Mix')}</span>
                     <span className="flex items-center gap-2"><Clock size={16} /> {mixtape.duration}</span>
                     {mixtape.tracklist?.length > 0 && (
                        <span className="flex items-center gap-1"><Music size={16} className="text-brand-purple" /> {mixtape.tracklist.length} Tracks</span>
                     )}
                  </div>

                  <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                     {mixtape.description || "Experience the best musical journey carefully curated for your listening pleasure. This mix features high energy tracks blended to perfection."}
                  </p>

                  {/* Embed Player Section */}
                   {isStreamable(mixtape.audioUrl) && (
                      <div className="mb-8 rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl flex items-center justify-center">
                          <iframe
                             src={getEmbedUrl(mixtape.audioUrl) || ''}
                             width="100%"
                             height="600"
                             frameBorder="0"
                             scrolling="no"
                             allow="autoplay"
                             className="block"
                          ></iframe>
                      </div>
                   )}

                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                     <button onClick={handleShare} className="flex-1 px-6 py-4 bg-[#15151A] border border-white/20 text-white font-bold rounded-lg hover:bg-white/10 transition flex items-center justify-center gap-2">
                        <Share2 size={20} /> Share Mixtape
                     </button>
                     {mixtape.youtubeUrl && (
                        <a
                           href={mixtape.youtubeUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex-1 px-6 py-4 bg-red-600/10 border border-red-600/30 text-white font-bold rounded-lg hover:bg-red-600/20 transition flex items-center justify-center gap-2"
                        >
                           <Youtube size={20} className="text-red-500" /> Watch on YouTube
                        </a>
                     )}
                  </div>

                  {/* Tracklist Preview */}
                  <div className="bg-[#15151A] rounded-xl p-6 border border-white/5">
                     <h3 className="font-bold text-white mb-4">Tracklist</h3>
                     {mixtape.tracklist && mixtape.tracklist.length > 0 ? (
                        <ul className="space-y-3 text-sm text-gray-400 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                           {mixtape.tracklist.map((track, index) => {
                              const trackSeconds = timestampToSeconds(track.timestamp);
                              const isActive = isCurrent && currentTime >= trackSeconds && (index === mixtape.tracklist.length - 1 || currentTime < timestampToSeconds(mixtape.tracklist[index + 1].timestamp));

                              return (
                                 <li
                                    key={track.id || index}
                                    onClick={() => {
                                       if (!isCurrent) playTrack(mixtape);
                                       setTimeout(() => seek(trackSeconds), 100);
                                    }}
                                    className={`flex justify-between items-center gap-4 py-2 px-3 rounded-lg border-b border-white/5 last:border-0 cursor-pointer transition-all hover:bg-white/5 group ${isActive ? 'bg-brand-purple/10 border-brand-purple/20' : ''}`}
                                 >
                                    <div className="flex gap-3">
                                       <span className={`${isActive ? 'text-brand-purple' : 'text-gray-600'} w-4 font-black`}>{index + 1}.</span>
                                       <span className={`${isActive ? 'text-white' : 'text-gray-300'} font-medium group-hover:text-white transition-colors`}>{track.title} {track.artist ? `- ${track.artist}` : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       {isActive && isPlaying && <div className="flex gap-0.5 items-end h-3 mb-0.5"><div className="w-0.5 h-2 bg-brand-purple animate-pulse" /><div className="w-0.5 h-3 bg-brand-purple animate-pulse delay-75" /><div className="w-0.5 h-1 bg-brand-purple animate-pulse delay-150" /></div>}
                                       <span className={`text-xs font-mono ${isActive ? 'text-brand-purple' : 'text-gray-500'}`}>{track.timestamp}</span>
                                    </div>
                                 </li>
                              );
                           })}
                        </ul>
                     ) : (
                        <p className="text-sm text-gray-500 italic">No tracklist available for this mix.</p>
                     )}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-white/10 pt-16">
               <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-8">
                     <MessageSquare className="text-brand-purple" size={24} />
                     <h2 className="text-2xl font-bold text-white">Comments & Feedback</h2>
                  </div>

                  <div className="space-y-8">
                     {/* Comment Form */}
                     <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5">
                        <h3 className="font-bold text-white mb-4">Post a Comment</h3>
                        {isAuthenticated ? (
                           <form onSubmit={handleSubmitComment} className="space-y-4">
                              <textarea
                                 value={newComment}
                                 onChange={(e) => setNewComment(e.target.value)}
                                 placeholder="What do you think of this mix?"
                                 className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:border-brand-purple outline-none min-h-[100px] transition-all"
                                 required
                              ></textarea>
                              <div className="flex justify-end">
                                 <button
                                    type="submit"
                                    disabled={isSubmitting || !newComment.trim()}
                                    className="px-6 py-2.5 bg-brand-purple text-white font-bold rounded-xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
                                 >
                                    {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                    Post Comment
                                 </button>
                              </div>
                           </form>
                        ) : (
                           <div className="text-center py-6 bg-black/20 rounded-xl border border-dashed border-white/10">
                              <p className="text-gray-500 mb-4">Please log in to join the conversation.</p>
                              <Link to="/login" className="px-6 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition">Login</Link>
                           </div>
                        )}
                     </div>

                     {/* Comment List */}
                     <div className="space-y-6">
                        {mixtapeComments.length > 0 ? (
                           mixtapeComments.map((comment: any) => (
                              <div key={comment.id} className="bg-[#15151A] p-6 rounded-2xl border border-white/5 flex gap-4">
                                 <div className="w-10 h-10 rounded-full bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-brand-purple font-bold shrink-0">
                                    {comment.userName?.substring(0, 1).toUpperCase() || 'U'}
                                 </div>
                                 <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                       <span className="font-bold text-white">{comment.userName}</span>
                                       <span className="text-[10px] text-gray-500 uppercase tracking-widest">{new Date(comment.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed">{comment.text}</p>
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="text-center py-12 text-gray-600">
                              <MessageSquare size={48} className="mx-auto mb-4 opacity-10" />
                              <p>No comments yet. Be the first to share your thoughts!</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-1">
                  <div className="bg-[#15151A] p-8 rounded-[2.5rem] border border-white/5 space-y-10">
                     <div>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 pl-1 italic">Direct Transmission</h3>
                        <div className="flex flex-wrap gap-3">
                           <button
                              onClick={() => {
                                 const msg = encodeURIComponent(`Check out this mix by DJ Flowerz: ${mixtape.title}\n\nListen here: ${window.location.href}`);
                                 window.open(`https://wa.me/?text=${msg}`, '_blank');
                              }}
                              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/10 hover:border-[#25D366]/40 transition-all group"
                              title="Share on WhatsApp"
                           >
                              <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                           </button>
                           <button
                              onClick={() => {
                                 const msg = encodeURIComponent(`Vibing to ${mixtape.title} by DJ Flowerz! 🔥`);
                                 window.open(`https://twitter.com/intent/tweet?text=${msg}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                              }}
                              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all group"
                              title="Share on X"
                           >
                              <Twitter size={20} className="group-hover:scale-110 transition-transform" />
                           </button>
                           <button
                              onClick={() => {
                                 window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(mixtape.title)}`, '_blank');
                              }}
                              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#0088cc] hover:bg-[#0088cc]/10 hover:border-[#0088cc]/40 transition-all group"
                              title="Share on Telegram"
                           >
                              <Send size={20} className="group-hover:scale-110 transition-transform" />
                           </button>
                           <button
                              onClick={handleShare}
                              className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple hover:bg-brand-purple hover:text-white transition-all group"
                              title="Systems Share"
                           >
                              <Share2 size={20} className="group-hover:rotate-12 transition-transform" />
                           </button>
                        </div>
                     </div>

                     <div>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 pl-1 italic">Channel Subscription</h3>
                        <div className="grid grid-cols-1 gap-3">
                           {socials.instagram && (
                              <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-purple/30 group transition-all duration-300">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all">
                                       <Instagram size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-white font-black text-[10px] uppercase tracking-widest">Instagram</span>
                                       <span className="text-[9px] text-gray-600 font-bold">@dj_flowerz</span>
                                    </div>
                                 </div>
                                 <ChevronRight size={14} className="text-gray-700 group-hover:text-brand-purple transition-colors" />
                              </a>
                           )}
                           {socials.youtube && (
                              <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-purple/30 group transition-all duration-300">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                                       <Youtube size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-white font-black text-[10px] uppercase tracking-widest">YouTube</span>
                                       <span className="text-[9px] text-gray-600 font-bold">Official Channel</span>
                                    </div>
                                 </div>
                                 <ChevronRight size={14} className="text-gray-700 group-hover:text-brand-purple transition-colors" />
                              </a>
                           )}
                           {socials.telegram && (
                              <a href={socials.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-purple/30 group transition-all duration-300">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all">
                                       <Send size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-white font-black text-[10px] uppercase tracking-widest">Telegram</span>
                                       <span className="text-[9px] text-gray-600 font-bold">Community Link</span>
                                    </div>
                                 </div>
                                 <ChevronRight size={14} className="text-gray-700 group-hover:text-brand-purple transition-colors" />
                              </a>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </div>
   );
};

export default MixtapeDetails;