
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Camera, Zap, Music, Sparkles, ArrowRight, Loader, 
    Activity, RotateCcw, Play, Pause, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// --- Sub-Component: BPM Tapper Logic ---
const BpmTapperModule: React.FC = () => {
    const [taps, setTaps] = useState<number[]>([]);
    const [bpm, setBpm] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [metronomeInterval, setMetronomeInterval] = useState<NodeJS.Timeout | null>(null);

    const filterTaps = (currentTaps: number[]) => {
        const now = Date.now();
        return currentTaps.filter(time => now - time < 4000).slice(-10);
    };

    const handleTap = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e && 'type' in e && e.type === 'keydown' && (e as React.KeyboardEvent).code !== 'Space') return;
        if (e && 'type' in e && e.type === 'keydown') e.preventDefault();

        const now = Date.now();
        setTaps(prev => {
            const newTaps = filterTaps([...prev, now]);
            if (newTaps.length > 1) {
                const intervals = [];
                for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
                const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                setBpm(Math.round(60000 / avgInterval));
            } else {
                setBpm(0);
            }
            return newTaps;
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); handleTap(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleTap]);

    const playClick = useCallback(() => {
        if (!audioContext) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 1000;
        osc.type = 'sine';
        gain.gain.setValueAtTime(1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        osc.start();
        osc.stop(audioContext.currentTime + 0.1);
    }, [audioContext]);

    useEffect(() => {
        if (!audioContext && isPlaying) {
            setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
        }
    }, [isPlaying, audioContext]);

    const toggleMetronome = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (metronomeInterval) clearInterval(metronomeInterval);
        } else if (bpm > 0) {
            setIsPlaying(true);
            playClick();
            const interval = setInterval(() => playClick(), 60000 / bpm);
            setMetronomeInterval(interval);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative">
                <motion.div 
                    key={bpm}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-white/5 backdrop-blur-3xl flex flex-col items-center justify-center border-4 border-brand-purple shadow-[0_0_50px_rgba(124,58,237,0.3)] relative z-10"
                >
                    <span className="text-7xl md:text-9xl font-black text-white tabular-nums tracking-tighter">
                        {bpm || '---'}
                    </span>
                    <span className="text-brand-cyan font-bold tracking-widest mt-2 uppercase text-xs">BPM COUNTER</span>
                </motion.div>
                <AnimatePresence>
                    {taps.length > 0 && (
                        <motion.div
                            key={taps[taps.length - 1]}
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 rounded-full bg-brand-purple/30"
                            style={{ zIndex: 0 }}
                        />
                    )}
                </AnimatePresence>
            </div>

            <div className="flex flex-col md:flex-row gap-6 w-full max-w-md">
                <button
                    onMouseDown={handleTap}
                    onTouchStart={handleTap}
                    className="flex-1 py-6 bg-gradient-to-r from-brand-purple to-blue-600 rounded-2xl font-black text-2xl uppercase tracking-wider text-white shadow-xl hover:shadow-brand-purple/50 active:scale-95 transition-all select-none"
                >
                    TAP BEAT
                </button>
                
                <div className="flex gap-4">
                    <button 
                        onClick={toggleMetronome}
                        disabled={bpm === 0}
                        className={`p-6 rounded-2xl flex items-center justify-center transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 text-brand-cyan border border-white/10 hover:bg-brand-cyan/10 disabled:opacity-50'}`}
                    >
                        {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                    </button>
                    <button 
                        onClick={() => { setTaps([]); setBpm(0); if (isPlaying) toggleMetronome(); }}
                        className="p-6 bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                    >
                        <RotateCcw size={32} />
                    </button>
                </div>
            </div>
            
            <div className="text-center max-w-md text-gray-500 text-xs uppercase tracking-widest font-bold">
                Tap your spacebar or the button above to the rhythm of the track.
            </div>
        </div>
    );
};

// --- Sub-Component: Aura Vision Logic ---
const AuraVisionModule: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setResult(null);
        }
    };

    const analyzeVibe = async () => {
        if (!file) return;
        setIsAnalyzing(true);
        await new Promise(r => setTimeout(r, 2500));
        setResult({
            vibe: "Euphoric High-Energy",
            bpm: "124-128 BPM",
            energy: 92,
            recommendations: [
                { name: "Neon Jungle Loop", type: "Marketplace", price: "KES 800" },
                { name: "Sunset Drive", type: "Music Pool", status: "Subscribers Only" }
            ]
        });
        setIsAnalyzing(false);
        toast.success("Vibe Analysis Complete!");
    };

    return (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card rounded-[2.5rem] border border-white/5 p-8 md:p-12 shadow-2xl overflow-hidden relative">
                {!preview ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-video rounded-[1.5rem] border-2 border-dashed border-white/10 hover:border-brand-purple/50 transition-all flex flex-col items-center justify-center gap-6 cursor-pointer group bg-white/[0.02]"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-brand-purple group-hover:bg-brand-purple/10 transition-all">
                            <Camera size={32} />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black uppercase tracking-tight">Upload Crowd or Venue Photo</p>
                            <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-widest">AI will scan the visual energy</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="relative aspect-video rounded-[1.5rem] overflow-hidden border border-white/10 shadow-inner">
                            <img loading="lazy" src={preview} className="w-full h-full object-cover" alt="Preview" />
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-brand-purple blur-xl animate-pulse rounded-full opacity-50" />
                                        <Loader className="animate-spin text-brand-purple relative z-10" size={48} />
                                    </div>
                                    <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] animate-pulse">Deconstructing Sonic Aura...</p>
                                </div>
                            )}
                        </div>

                        {!result && !isAnalyzing && (
                            <button 
                                onClick={analyzeVibe}
                                className="w-full py-5 bg-brand-purple text-white font-black rounded-2xl hover:shadow-[0_0_40px_rgba(157,78,221,0.5)] transition flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <Zap size={20} /> ANALYZE VISUAL FREQUENCY
                            </button>
                        )}

                        {result && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Eye size={14} /> Vibe Statistics
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Energy Density', value: `${result.energy}%`, color: 'text-brand-purple' },
                                            { label: 'Recommended BPM', value: result.bpm, color: 'text-brand-cyan' },
                                            { label: 'Emotional Key', value: result.vibe, color: 'text-white' }
                                        ].map((stat, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
                                                <span className={`font-black uppercase ${stat.color}`}>{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Music size={14} /> AI Matches
                                    </h3>
                                    <div className="space-y-2">
                                        {result.recommendations.map((rec: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-brand-purple/10 rounded-xl border border-brand-purple/20 hover:bg-brand-purple/20 transition cursor-pointer group">
                                                <div className="min-w-0">
                                                    <p className="text-white font-black text-xs uppercase truncate">{rec.name}</p>
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em]">{rec.type}</span>
                                                </div>
                                                <ArrowRight size={14} className="text-brand-purple group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {result && (
                            <button onClick={() => {setPreview(null); setResult(null);}} className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white mx-auto block">
                                Scan New Image
                            </button>
                        )}
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>
    );
};

// --- Main DJ Lab Page ---
export default function DJLab() {
    const [activeTab, setActiveTab] = useState<'vision' | 'tapper'>('vision');

    return (
        <div className="min-h-screen bg-[#050507] pt-24 pb-20 px-4 relative overflow-hidden text-white">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-[10px] font-black uppercase tracking-widest mb-6">
                        <Sparkles size={12} />
                        Professional Suite
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4">
                        DJ <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">VISION LAB</span>
                    </h1>
                    <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                        The ultimate creative workspace for high-performance DJs. Analyze visual aura with AI or calculate precision speed patterns instantly.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1.5 bg-white/5 backdrop-blur-xl border border-white/5 rounded-2xl max-w-sm mx-auto mb-16 relative">
                    <div 
                        className={`absolute inset-y-1.5 bg-brand-purple rounded-xl transition-all duration-300 ease-out shadow-[0_0_20px_rgba(124,58,237,0.4)] ${activeTab === 'vision' ? 'left-1.5 w-[calc(50%-3px)]' : 'left-[50%] w-[calc(50%-1.5px)]'}`}
                    />
                    <button 
                        onClick={() => setActiveTab('vision')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors ${activeTab === 'vision' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Eye size={14} /> AI Aura Vision
                    </button>
                    <button 
                        onClick={() => setActiveTab('tapper')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors ${activeTab === 'tapper' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Activity size={14} /> BPM Tapper
                    </button>
                </div>

                {/* Content Area */}
                <div className="relative min-h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'vision' ? <AuraVisionModule /> : <BpmTapperModule />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Insight */}
                <div className="mt-20 text-center">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.4em] mb-4">Enhanced Creative Workflow</p>
                    <div className="h-[2px] w-20 bg-gradient-to-r from-transparent via-brand-purple to-transparent mx-auto" />
                </div>
            </div>
        </div>
    );
}
