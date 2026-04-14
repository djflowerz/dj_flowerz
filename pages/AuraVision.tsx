
import React, { useState, useRef } from 'react';
import { Camera, Upload, Zap, Music, Waves, Sparkles, ArrowRight, Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function AuraVision() {
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
    
    // Simulate AI analysis for now as a "Magic" experience
    // In production, this would hit a Vercel/Cloudflare AI model
    await new Promise(r => setTimeout(r, 3000));
    
    setResult({
      vibe: "Euphoric High-Energy",
      bpm: "124-128 BPM",
      energy: 92,
      recommendations: [
        { name: "Neon Jungle Loop", type: "Marketplace", Price: "KES 800" },
        { name: "Sunset Drive", type: "Music Pool", status: "Subscribers Only" }
      ]
    });
    setIsAnalyzing(false);
    toast.success("Vibe Analysis Complete!");
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-16 space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} />
                Next-Gen AI
           </div>
           <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter">AURA <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">VISION</span></h1>
           <p className="text-gray-400 max-w-xl mx-auto">Upload a photo of your crowd, venue, or even a moodboard. Our AI will analyze the visual aura and recommend the perfect tracks and loops to match the energy.</p>
        </div>

        <div className="glass-card rounded-[3rem] border border-white/5 p-2 overflow-hidden shadow-2xl">
           <div className="bg-[#15151A]/50 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12">
              {!preview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-[2rem] border-2 border-dashed border-white/10 hover:border-brand-purple/50 transition-all flex flex-col items-center justify-center gap-6 cursor-pointer group"
                >
                   <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-brand-purple group-hover:bg-brand-purple/10 transition-all">
                      <Camera size={40} />
                   </div>
                   <div className="text-center">
                      <p className="text-white font-black uppercase tracking-tight">Drop your vibe here</p>
                      <p className="text-gray-500 text-xs mt-1">PNG, JPG or WEBP up to 10MB</p>
                   </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-white/10">
                      <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                           <Loader className="animate-spin text-brand-purple" size={40} />
                           <p className="text-xs font-black text-white uppercase tracking-widest animate-pulse">Scanning Visual Aura...</p>
                        </div>
                      )}
                      {!isAnalyzing && !result && (
                        <button 
                          onClick={() => setPreview(null)}
                          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full transition"
                        >
                           <Zap size={20} />
                        </button>
                      )}
                   </div>

                   {!result && !isAnalyzing && (
                     <button 
                       onClick={analyzeVibe}
                       className="w-full py-5 bg-brand-purple text-white font-black rounded-2xl hover:shadow-[0_0_40px_rgba(157,78,221,0.5)] transition flex items-center justify-center gap-3"
                     >
                        <Zap size={20} /> ANALYZE SONIC AURA
                     </button>
                   )}

                   {result && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-6 duration-500">
                         {/* Analysis Stats */}
                         <div className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">VIBE PROFILE</h3>
                            <div className="space-y-4">
                               {[
                                 { label: 'Primary Vibe', value: result.vibe, icon: <Waves size={16}/> },
                                 { label: 'Recommended BPM', value: result.bpm, icon: <Music size={16}/> },
                                 { label: 'Energy Density', value: `${result.energy}%`, icon: <Zap size={16}/> }
                               ].map((stat, i) => (
                                 <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3 text-gray-400">
                                       {stat.icon}
                                       <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <span className="text-white font-black">{stat.value}</span>
                                 </div>
                               ))}
                            </div>
                         </div>

                         {/* Sonic Matches */}
                         <div className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">SONIC MATCHES</h3>
                            <div className="space-y-3">
                               {result.recommendations.map((rec: any, i: number) => (
                                 <div key={i} className="flex items-center justify-between p-4 bg-brand-purple/10 rounded-2xl border border-brand-purple/20 group hover:bg-brand-purple/20 transition cursor-pointer">
                                    <div className="min-w-0">
                                       <p className="text-white font-black text-sm uppercase truncate">{rec.name}</p>
                                       <span className="text-[8px] font-bold text-brand-purple uppercase tracking-widest">{rec.type}</span>
                                    </div>
                                    <button className="p-2 bg-white/10 rounded-lg text-white group-hover:bg-brand-purple transition">
                                       <ArrowRight size={16} />
                                    </button>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   )}
                </div>
              )}
           </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />

      </div>
    </div>
  );
}
