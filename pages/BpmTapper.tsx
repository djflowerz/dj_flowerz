import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RotateCcw, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BpmTapper: React.FC = () => {
    const [taps, setTaps] = useState<number[]>([]);
    const [bpm, setBpm] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [metronomeInterval, setMetronomeInterval] = useState<NodeJS.Timeout | null>(null);

    // Filter out old taps
    const filterTaps = (currentTaps: number[]) => {
        const now = Date.now();
        // keep taps within the last 3-4 seconds, max 10 taps
        return currentTaps.filter(time => now - time < 4000).slice(-10);
    };

    const handleTap = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e && 'type' in e && e.type === 'keydown' && (e as React.KeyboardEvent).code !== 'Space') {
            return;
        }
        
        // Prevent default spacebar scrolling
        if (e && 'type' in e && e.type === 'keydown') {
            e.preventDefault();
        }

        const now = Date.now();
        setTaps(prev => {
            const newTaps = filterTaps([...prev, now]);
            
            if (newTaps.length > 1) {
                const intervals = [];
                for (let i = 1; i < newTaps.length; i++) {
                    intervals.push(newTaps[i] - newTaps[i - 1]);
                }
                const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                const calculatedBpm = Math.round(60000 / avgInterval);
                setBpm(calculatedBpm);
            } else {
                setBpm(0); // Only 1 tap, can't calculate
            }
            
            return newTaps;
        });
    }, []);

    // Global spacebar listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleTap();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleTap]);

    const resetTaps = () => {
        setTaps([]);
        setBpm(0);
        if (isPlaying) toggleMetronome();
    };

    // Very simple HTML5 AudioContext Metronome
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
        } else {
            if (bpm > 0) {
                setIsPlaying(true);
                // initial click
                playClick();
                const interval = setInterval(() => {
                    playClick();
                }, 60000 / bpm);
                setMetronomeInterval(interval);
            }
        }
    };

    // Cleanup interval
    useEffect(() => {
        return () => {
            if (metronomeInterval) clearInterval(metronomeInterval);
        };
    }, [metronomeInterval]);

    // Cleanup taps that age out to prevent floating numbers
    useEffect(() => {
        const interval = setInterval(() => {
            setTaps(prev => {
                const f = filterTaps(prev);
                if (f.length < 2 && bpm !== 0 && !isPlaying) {
                   // Keep the last visual BPM up rather than resetting to 0 instantly,
                   // it feels better visually if the number just stays what you tapped it to.
                   return []; 
                }
                return f;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [bpm, isPlaying]);


    return (
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-24">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight uppercase mb-4 text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">
                    DJ BPM Tapper
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Find the exact tempo of any track instantly. Tap any button or your spacebar to the beat.
                </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-12">
                
                {/* BPM Display */}
                <div className="relative">
                    <motion.div 
                        key={bpm}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-64 h-64 md:w-80 md:h-80 rounded-full glass-panel flex flex-col items-center justify-center border-4 border-brand-purple shadow-[0_0_50px_rgba(124,58,237,0.3)]"
                    >
                        <span className="text-7xl md:text-9xl font-black text-white tabular-nums tracking-tighter">
                            {bpm || '---'}
                        </span>
                        <span className="text-brand-cyan font-bold tracking-widest mt-2 uppercase">BPM</span>
                    </motion.div>
                    
                    {/* Ripple effect on tap */}
                    <AnimatePresence>
                        {taps.length > 0 && (
                            <motion.div
                                key={taps[taps.length - 1]}
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 rounded-full bg-brand-purple"
                                style={{ zIndex: -1 }}
                            />
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-md">
                    <button
                        onMouseDown={handleTap}
                        onTouchStart={handleTap}
                        className="flex-1 py-6 bg-gradient-to-r from-brand-purple to-blue-600 rounded-2xl font-black text-2xl uppercase tracking-wider text-white shadow-xl hover:shadow-brand-purple/50 active:scale-95 transition-all select-none"
                    >
                        TAP HERE
                    </button>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={toggleMetronome}
                            disabled={bpm === 0}
                            className={`p-6 rounded-2xl flex items-center justify-center transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'glass-panel text-brand-cyan hover:bg-brand-cyan/10 disabled:opacity-50'}`}
                            title={isPlaying ? "Stop Metronome" : "Play Metronome"}
                        >
                            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                        </button>
                        
                        <button 
                            onClick={resetTaps}
                            className="p-6 glass-panel text-gray-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                            title="Reset"
                        >
                            <RotateCcw size={32} />
                        </button>
                    </div>
                </div>

                {/* SEO Text Block below the tool */}
                <div className="mt-16 glass-card p-8 rounded-2xl text-left max-w-2xl border-white/5">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                        <Activity className="text-brand-purple" />
                        Why use a BPM Counter?
                    </h2>
                    <p className="text-gray-400 mb-4 leading-relaxed">
                        Knowing your track's Beats Per Minute (BPM) is essential for flawless harmonic mixing and transition planning. While CDJs and DJ software automatically analyze audio, having a manual tap tempo tool is perfect for identifying the tempo of live bands, unanalyzed vinyl records, or obscure mashups.
                    </p>
                    <p className="text-gray-400 leading-relaxed text-sm">
                        Pro tip: Tap consistently on the 1, 2, 3, and 4 beats of the musical measure for the most accurate calculation.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default BpmTapper;
