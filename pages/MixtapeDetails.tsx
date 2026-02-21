import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Download, Share2, Video, Music, Calendar, Clock, Star, MessageSquare, Send, User } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { getEmbedUrl, isStreamable } from '../utils/embedHelper';
import { downloadFileSecurely } from '../utils/downloadHelper';

interface Comment {
   id: string;
   user: string;
   text: string;
   date: string;
   avatar?: string;
   rating?: number;
}

const MixtapeDetails: React.FC = () => {
   const { id } = useParams<{ id: string }>();
   const { playTrack, currentTrack, isPlaying, pauseTrack, resumeTrack } = usePlayer();
   const { mixtapes } = useData();
   const { user } = useAuth();

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

   // Mock Comments State
   const [comments, setComments] = useState<Comment[]>([]);
   const [newComment, setNewComment] = useState('');
   const [userRating, setUserRating] = useState(0);

   const handleShare = () => {
      if (navigator.share) {
         navigator.share({
            title: mixtape.title,
            text: `Check out this mix by DJ Flowerz: ${mixtape.title}`,
            url: window.location.href,
         });
      } else {
         alert('Link copied to clipboard!');
      }
   };

   const handlePostComment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      const comment: Comment = {
         id: Date.now().toString(),
         user: user?.name || 'Guest User',
         text: newComment,
         date: 'Just now',
         avatar: user?.avatarUrl,
         rating: userRating > 0 ? userRating : undefined
      };

      setComments([comment, ...comments]);
      setNewComment('');
      setUserRating(0);
   };

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
                     <div className="mb-8 rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
                        <iframe
                           src={getEmbedUrl(mixtape.audioUrl) || ''}
                           width="100%"
                           height="150"
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
                  </div>

                  {/* Tracklist Preview */}
                  <div className="bg-[#15151A] rounded-xl p-6 border border-white/5">
                     <h3 className="font-bold text-white mb-4">Tracklist</h3>
                     {mixtape.tracklist && mixtape.tracklist.length > 0 ? (
                        <ul className="space-y-3 text-sm text-gray-400 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                           {mixtape.tracklist.map((track, index) => (
                              <li key={track.id || index} className="flex justify-between items-center gap-4 py-1 border-b border-white/5 last:border-0">
                                 <div className="flex gap-3">
                                    <span className="text-gray-600 w-4">{index + 1}.</span>
                                    <span className="text-gray-300 font-medium">{track.title} {track.artist ? `- ${track.artist}` : ''}</span>
                                 </div>
                                 <span className="text-xs font-mono">{track.timestamp}</span>
                              </li>
                           ))}
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
                     <h2 className="text-2xl font-bold text-white">Comments</h2>
                     <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-300">{comments.length}</span>
                  </div>

                  {/* Comment Form */}
                  <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5 mb-10">
                     <form onSubmit={handlePostComment} className="relative">
                        <textarea
                           value={newComment}
                           onChange={(e) => setNewComment(e.target.value)}
                           placeholder="Leave a comment..."
                           className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-brand-purple h-28"
                        ></textarea>
                        <button
                           type="submit"
                           className="absolute bottom-4 right-4 bg-brand-purple text-white p-2 rounded-lg hover:bg-purple-600 transition disabled:opacity-50"
                           disabled={!newComment.trim()}
                        >
                           <Send size={18} />
                        </button>
                     </form>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-6">
                     {comments.length > 0 ? comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                           <div className="flex-shrink-0">
                              {comment.avatar ? (
                                 <img src={comment.avatar} alt={comment.user} className="w-10 h-10 rounded-full" />
                              ) : (
                                 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400">
                                    <User size={20} />
                                 </div>
                              )}
                           </div>
                           <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                 <div>
                                    <h4 className="font-bold text-white text-sm">{comment.user}</h4>
                                    <p className="text-xs text-gray-500">{comment.date}</p>
                                 </div>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">{comment.text}</p>
                           </div>
                        </div>
                     )) : (
                        <p className="text-gray-500 italic text-center py-8">Be the first to comment!</p>
                     )}
                  </div>
               </div>

               {/* Sidebar Stats */}
               <div className="lg:col-span-1">
                  <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5 sticky top-24">
                     <h3 className="font-bold text-white mb-6">Share this Mix</h3>
                     <p className="text-gray-400 text-sm mb-6">Help us reach more listeners by sharing this mixtape with your friends.</p>
                     <button
                        onClick={handleShare}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-lg hover:bg-brand-purple/20 transition font-bold"
                     >
                        <Share2 size={20} /> Share Now
                     </button>
                  </div>
               </div>
            </div>

         </div>
      </div>
   );
};

export default MixtapeDetails;