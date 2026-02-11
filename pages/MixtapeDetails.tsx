import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Download, Share2, Video, Music, Calendar, Clock, Star, MessageSquare, Send, User } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

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
  const mixtape = mixtapes.find(m => m.id === id) || mixtapes[0];
  const isCurrent = currentTrack?.id === mixtape.id;

  // Mock Comments State
  const [comments, setComments] = useState<Comment[]>([
    { id: '1', user: 'Brian M.', text: 'This transition at 15:00 is insane! 🔥', date: '2 days ago', rating: 5 },
    { id: '2', user: 'Sarah J.', text: 'Always bringing the best vibes. Love this set.', date: '1 week ago', rating: 5 },
    { id: '3', user: 'Club Hopper', text: 'Need the tracklist for the song at 45min please!', date: '1 week ago', rating: 4 },
  ]);
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
                <span className="flex items-center gap-2"><Calendar size={16} /> {mixtape.date || 'Oct 2023'}</span>
                <span className="flex items-center gap-2"><Clock size={16} /> {mixtape.duration}</span>
                <span className="flex items-center gap-1"><Star size={16} className="text-brand-purple" fill="currentColor"/> 4.8 (120 Reviews)</span>
             </div>

             <p className="text-gray-300 text-lg mb-8 leading-relaxed">
               {mixtape.description || "Experience the best musical journey carefully curated for your listening pleasure. This mix features high energy tracks blended to perfection."}
             </p>

             <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a href={mixtape.audioUrl} download className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-lg hover:bg-brand-cyan transition text-center flex items-center justify-center gap-2">
                   <Music size={20} /> Download Audio (MP3)
                </a>
                <a href={mixtape.videoDownloadUrl || '#'} className="flex-1 px-6 py-4 bg-[#15151A] border border-white/20 text-white font-bold rounded-lg hover:bg-white/10 transition text-center flex items-center justify-center gap-2">
                   <Video size={20} /> Download Video (MP4)
                </a>
                <button onClick={handleShare} className="px-6 py-4 bg-[#15151A] border border-white/20 text-gray-300 font-bold rounded-lg hover:text-white transition flex items-center justify-center">
                   <Share2 size={20} />
                </button>
             </div>

             {/* Tracklist Preview */}
             <div className="bg-[#15151A] rounded-xl p-6 border border-white/5">
                <h3 className="font-bold text-white mb-4">Tracklist Highlights</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                   <li className="flex justify-between"><span>1. Intro - Party Starter</span> <span>00:00</span></li>
                   <li className="flex justify-between"><span>2. Hit Song Remix - Artist A</span> <span>02:15</span></li>
                   <li className="flex justify-between"><span>3. Viral Sound - Artist B</span> <span>05:40</span></li>
                   <li className="pt-2 text-brand-purple cursor-pointer hover:underline">View full tracklist</li>
                </ul>
             </div>
          </div>
        </div>

        {/* Comments & Ratings Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-white/10 pt-16">
          <div className="lg:col-span-2">
             <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="text-brand-purple" size={24} />
                <h2 className="text-2xl font-bold text-white">Comments & Reviews</h2>
                <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-gray-300">{comments.length}</span>
             </div>

             {/* Comment Form */}
             <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5 mb-10">
                <div className="mb-4">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Rate this mix</label>
                   <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                         <button 
                           key={star} 
                           onClick={() => setUserRating(star)}
                           className="transition hover:scale-110"
                         >
                            <Star 
                              size={24} 
                              className={star <= userRating ? "text-yellow-500" : "text-gray-600"} 
                              fill={star <= userRating ? "currentColor" : "none"}
                            />
                         </button>
                      ))}
                   </div>
                </div>
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
                {comments.map((comment) => (
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
                            {comment.rating && (
                               <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                     <Star key={i} size={12} className={i < comment.rating! ? "text-yellow-500" : "text-gray-700"} fill={i < comment.rating! ? "currentColor" : "none"} />
                                  ))}
                               </div>
                            )}
                         </div>
                         <p className="text-gray-300 text-sm leading-relaxed">{comment.text}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Sidebar Stats */}
          <div className="lg:col-span-1">
             <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5 sticky top-24">
                <h3 className="font-bold text-white mb-6">Rating Summary</h3>
                <div className="text-center mb-6">
                   <div className="text-5xl font-bold text-white mb-2">4.8</div>
                   <div className="flex justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={20} className="text-yellow-500" fill="currentColor" />)}
                   </div>
                   <p className="text-sm text-gray-500">Based on 120 ratings</p>
                </div>
                
                <div className="space-y-2 mb-6">
                   {[5, 4, 3, 2, 1].map((num) => (
                      <div key={num} className="flex items-center gap-3 text-xs">
                         <span className="w-3 text-white font-bold">{num}</span>
                         <Star size={10} className="text-gray-500" />
                         <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500" style={{ width: num === 5 ? '70%' : num === 4 ? '20%' : '5%' }}></div>
                         </div>
                         <span className="w-8 text-right text-gray-500">{num === 5 ? '70%' : num === 4 ? '20%' : '5%'}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MixtapeDetails;