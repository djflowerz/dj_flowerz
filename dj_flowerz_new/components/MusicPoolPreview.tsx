import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Play, Pause, Headphones, Music, Lock, ArrowRight, Clock, Zap, Shield, PlayCircle, Star, X, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { isUserSubscriber } from '../utils/authHelpers';

const MusicPoolPreview: React.FC = () => {
    const { poolTracks, poolLoading } = useData();
    const { pauseTrack: pauseGlobalTrack } = usePlayer();
    const { user } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Convert any YouTube URL format to a proper embed URL
    const toEmbedUrl = (url: string): string => {
        if (!url) return '';
        // Already an embed URL
        if (url.includes('youtube.com/embed/')) return url;
        // youtu.be short link
        const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
        if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
        // youtube.com/watch?v=
        const watchMatch = url.match(/[?&]v=([^?&]+)/);
        if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
        // Return as-is (could already be an embed or other player)
        return url;
    };

    const recentTracks = useMemo(() => {
        const query = searchQuery.toLowerCase();

        // Filter out invalid tracks
        const validTracks = poolTracks.filter(t => t.title && t.artist);

        // Sort strategy: 
        // 1. Prioritize tracks that contain "2026" and "Feb" in title/artist/genre/category
        // 2. Then sort by dateAdded (newest first)
        const results = [...validTracks].sort((a, b) => {
            const isFeb2026 = (t: any) => {
                const searchStr = `${t.title} ${t.artist} ${t.genre} ${(t.category || []).join(' ')}`.toLowerCase();
                const has2026 = searchStr.includes('2026');
                const hasFeb = searchStr.includes('feb') || searchStr.includes('february') || (t.dateAdded && t.dateAdded.includes('-02-')) || (t.createdAt && t.createdAt.includes('-02-'));
                return has2026 && hasFeb;
            };

            const isAFeb2026 = isFeb2026(a);
            const isBFeb2026 = isFeb2026(b);

            if (isAFeb2026 && !isBFeb2026) return -1;
            if (!isAFeb2026 && isBFeb2026) return 1;

            // Fallback to year if dateAdded is missing
            const getSortTime = (t: any) => {
                if (t.dateAdded) return new Date(t.dateAdded).getTime();
                if (t.createdAt) return new Date(t.createdAt).getTime();
                if (t.year) return new Date(`${t.year}-01-01`).getTime();
                return 0;
            };

            return getSortTime(b) - getSortTime(a);
        });

        if (query) {
            return results.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.artist.toLowerCase().includes(query) ||
                t.genre?.toLowerCase().includes(query) ||
                (t.category || []).some((c: string) => c.toLowerCase().includes(query))
            ).slice(0, 24); // Show up to 24 results when searching
        }

        return results.slice(0, 12); // Show top 12 for default preview
    }, [poolTracks, searchQuery]);

    // Detect if a URL is a direct MP4 video file (from VickNick CDN or similar)
    const isMp4Url = (url?: string): boolean => {
        if (!url) return false;
        const lower = url.toLowerCase();
        return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') ||
            lower.includes('vicknickvideopool.com') || lower.includes('cdn.vicknick');
    };

    const handleTogglePlay = (track: any) => {
        if (playingId === track.id) {
            setPlayingId(null);
            if (audioRef.current) audioRef.current.pause();
        } else {
            setPlayingId(track.id);
            // Ensure global player is paused
            pauseGlobalTrack();
        }
    };

    useEffect(() => {
        // Only auto-play the audio ref for pure audio (not mp4, not YouTube)
        const track = recentTracks.find(t => t.id === playingId);
        if (playingId && audioRef.current && track) {
            const previewUrl = track.previewUrl || track.versions?.[0]?.downloadUrl;
            if (!track.videoUrl && !isMp4Url(previewUrl)) {
                audioRef.current.play().catch(err => {
                    console.error("Audio playback error:", err);
                    setPlayingId(null);
                });
            }
        }
    }, [playingId, recentTracks]);

    if (poolLoading && poolTracks.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center py-32 bg-[#0B0B0F]">
                <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-purple"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Music className="text-brand-purple animate-pulse" size={24} />
                    </div>
                </div>
                <p className="mt-6 text-gray-500 font-display font-medium animate-pulse">Scanning the airwaves...</p>
            </div>
        );
    }

    return (
        <section className="py-24 bg-[#0B0B0F] relative overflow-hidden border-t border-white/5">
            {/* Background elements for premium feel */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[140px] -z-10"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[140px] -z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header with Title & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-8">
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-brand-purple/10 border border-brand-purple/20 px-3 py-1 rounded-full mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse"></div>
                            <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest">Live Previews</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight">
                            Music <span className="text-brand-purple">Pool</span> Preview
                        </h2>
                        <p className="text-gray-400 text-lg max-w-xl md:max-w-none">
                            Listen to high-quality snippets. Join the pool to unlock unlimited downloads.
                        </p>
                    </div>

                    <div className="relative w-full md:w-96 group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-cyan transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search artist or track title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="relative w-full bg-[#15151A] border border-white/10 rounded-full py-4.5 pl-14 pr-6 text-white text-lg focus:border-brand-purple/50 focus:outline-none placeholder:text-gray-600 shadow-2xl transition-all"
                        />
                    </div>
                </div>



                {/* Track Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {recentTracks.map((track) => {
                        const isThisPlaying = playingId === track.id;
                        const previewUrl = track.previewUrl || track.versions?.[0]?.downloadUrl;
                        // hasVideo = has YouTube URL OR direct MP4/video CDN URL
                        const hasYouTube = !!track.videoUrl;
                        const hasMp4 = isMp4Url(previewUrl);
                        const hasVideo = hasYouTube || hasMp4;

                        return (
                            <div
                                key={track.id}
                                className={`group relative bg-[#15151A]/40 backdrop-blur-sm rounded-3xl overflow-hidden border border-white/[0.03] hover:border-brand-purple/40 transition-all duration-500 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-brand-purple/20 ${isThisPlaying && hasVideo ? 'sm:col-span-2' : ''}`}
                            >
                                {/* Thumbnail / Image Area / Video Player */}
                                <div className="relative aspect-video bg-[#050507] overflow-hidden">
                                    {isThisPlaying && hasYouTube ? (
                                        <div className="absolute inset-0 bg-black">
                                            <iframe
                                                src={`${toEmbedUrl(track.videoUrl)}?autoplay=1&rel=0&modestbranding=1`}
                                                className="w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                                title={track.title}
                                            ></iframe>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlayingId(null); }}
                                                className="absolute top-4 right-4 bg-black/60 shadow-xl backdrop-blur-md p-2 rounded-full text-white hover:bg-brand-purple hover:text-white transition-colors z-30"
                                                title="Close Player"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : isThisPlaying && hasMp4 ? (
                                        <div className="absolute inset-0 bg-black">
                                            <video
                                                src={previewUrl}
                                                autoPlay
                                                controls
                                                playsInline
                                                controlsList="nodownload noplaybackrate"
                                                disablePictureInPicture
                                                onContextMenu={(e) => e.preventDefault()}
                                                className="w-full h-full object-contain pointer-events-auto"
                                                onEnded={() => setPlayingId(null)}
                                            />
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlayingId(null); }}
                                                className="absolute top-4 right-4 bg-black/60 shadow-xl backdrop-blur-md p-2 rounded-full text-white hover:bg-brand-purple hover:text-white transition-colors z-30"
                                                title="Close Player"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {isThisPlaying && !hasVideo && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlayingId(null); }}
                                                    className="absolute top-4 right-4 bg-black/60 shadow-xl backdrop-blur-md p-2 rounded-full text-white hover:bg-brand-purple hover:text-white transition-colors z-30"
                                                    title="Close Player"
                                                >
                                                    <X size={20} />
                                                </button>
                                            )}
                                            <img
                                                src={track.thumbnailUrl || `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop&sig=${track.id}`}
                                                alt={track.title}
                                                className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-1000"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#15151A] via-transparent to-black/30"></div>

                                            {/* Hover Overlay Play Button */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    onClick={() => handleTogglePlay(track)}
                                                    className="relative w-16 h-16 flex items-center justify-center group/play"
                                                >
                                                    <div className="absolute inset-0 bg-brand-purple rounded-full blur-md opacity-50 group-hover/play:scale-125 transition-transform"></div>
                                                    <div className="relative w-full h-full rounded-full bg-brand-purple text-white flex items-center justify-center shadow-2xl transform transition group-active/play:scale-95">
                                                        {isThisPlaying ? <Pause size={28} fill="white" /> : (hasVideo ? <PlayCircle size={32} fill="white" /> : <Play size={28} fill="white" className="ml-1" />)}
                                                    </div>
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    <div className="absolute top-4 left-4 flex gap-2 z-10">
                                        <span className="bg-black/60 backdrop-blur-md text-brand-purple text-[10px] font-black px-2.5 py-1 rounded-lg border border-brand-purple/30 uppercase tracking-[0.2em] shadow-xl">
                                            {track.genre || 'MIX'}
                                        </span>
                                        {hasVideo && (
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                                                <Play size={10} fill="currentColor" /> VIDEO
                                            </span>
                                        )}
                                    </div>

                                    {/* Playing Indicator */}
                                    {isThisPlaying && !hasVideo && (
                                        <div className="absolute bottom-4 left-4 flex items-end gap-0.5 h-4 z-10">
                                            <div className="w-1 bg-brand-purple h-2 animate-[music-bar_0.8s_ease-in-out_infinite]"></div>
                                            <div className="w-1 bg-brand-purple h-4 animate-[music-bar_1.2s_ease-in-out_infinite]"></div>
                                            <div className="w-1 bg-brand-purple h-2.5 animate-[music-bar_1.0s_ease-in-out_infinite]"></div>
                                            <div className="w-1 bg-brand-purple h-3 animate-[music-bar_0.9s_ease-in-out_infinite]"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Content Area */}
                                <div className="p-6 flex flex-col flex-grow relative">
                                    <h3 className="text-white font-display font-bold text-lg line-clamp-1 mb-1 group-hover:text-brand-cyan transition-colors duration-300">
                                        {track.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm font-medium mb-6 italic opacity-80 group-hover:opacity-100 transition-opacity">
                                        {track.artist}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-white/[0.03] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isThisPlaying ? 'bg-brand-cyan shadow-[0_0_8px_#28E6DC]' : 'bg-gray-700'}`}></div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-300 transition-colors">
                                                {isThisPlaying ? 'Playing' : 'Ready'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isUserSubscriber(user) ? (
                                                <button
                                                    onClick={() => window.open(previewUrl, '_blank')}
                                                    className="p-2 bg-brand-purple/10 text-brand-purple hover:bg-brand-purple hover:text-white rounded-lg transition-colors group/dl relative"
                                                    title="Download Original"
                                                >
                                                    <Download size={18} />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/80 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/dl:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                        Download Original
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="text-gray-600 hover:text-brand-purple transition-colors cursor-help group/lock relative">
                                                    <Lock size={16} />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-brand-purple text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/lock:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                                                        Subscribers Only
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Audio Element (Hidden) — only for pure audio tracks */}
                                {isThisPlaying && !hasYouTube && !hasMp4 && (
                                    <audio
                                        ref={audioRef}
                                        src={previewUrl}
                                        onEnded={() => setPlayingId(null)}
                                        className="hidden"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {!poolLoading && recentTracks.length === 0 && (
                    <div className="bg-[#15151A] rounded-[40px] p-24 text-center border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/5 to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                <Music className="text-gray-600 group-hover:text-brand-purple transition-colors" size={48} />
                            </div>
                            <h3 className="text-3xl font-display font-bold text-white mb-4">No Tracks Found</h3>
                            <p className="text-gray-400 max-w-md mx-auto text-lg mb-10">
                                {searchQuery ? `We couldn't find any tracks matching "${searchQuery}".` : `We don't have any tracks available yet.`} Try a broader search or browse the full collection.
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="px-8 py-3 bg-brand-purple/10 text-brand-purple font-bold rounded-full border border-brand-purple/20 hover:bg-brand-purple hover:text-white transition-all duration-300"
                            >
                                Reset View
                            </button>
                        </div>
                    </div>
                )}

                {/* Premium CTA Section */}
                <div className="mt-24 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/20 via-brand-cyan/10 to-brand-purple/20 blur-[100px] opacity-30"></div>
                    <div className="relative bg-[#15151A]/80 backdrop-blur-xl rounded-[40px] p-10 md:p-16 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-3xl lg:text-4xl font-display font-bold text-white mb-4">Wanna Download These Tracks?</h3>
                            <p className="text-gray-300 text-lg max-w-lg mb-0" id="unlock-cta-desc">
                                Grab the full versions in high fidelity (320kbps). Join Kenyan's #1 Music Pool for professional DJs.
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <Link
                                to="/music-pool"
                                className="relative group overflow-hidden px-12 py-5 rounded-2xl bg-white text-black font-black text-xl hover:text-white transition-colors duration-300"
                                aria-describedby="unlock-cta-desc"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-purple to-brand-cyan translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative z-10 flex items-center gap-3">
                                    UNLOCK FULL LIBRARY <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                                    <Zap size={16} className="text-brand-cyan" /> Instant Access
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                                    <Shield size={16} className="text-green-500" /> High Quality
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
            @keyframes music-bar {
                0%, 100% { transform: scaleY(1); }
                50% { transform: scaleY(2); }
            }
         `}} />
        </section>
    );
};

export default MusicPoolPreview;
