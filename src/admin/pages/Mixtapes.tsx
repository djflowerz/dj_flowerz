import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Music, Plus, Edit2, Trash2, Headphones, Play, Tag } from 'lucide-react';

const Mixtapes: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [mixtapes, setMixtapes] = useState<any[]>([]);

    useEffect(() => {
        loadMixtapes();
    }, []);

    const loadMixtapes = async () => {
        try {
            const data = await request('/api/mixtapes');
            setMixtapes(data);
        } catch (e) { }
    };

    return (
        <AdminLayout title="Sound Oracle">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex gap-4">
                    <button className="bg-brand-purple text-white px-10 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
                        <Plus size={18} />
                        UP CHANNEL NEW FREQUENCY
                    </button>
                </div>

                <div className="flex gap-6">
                    <div className="flex flex-col items-end">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Airtime</p>
                        <p className="text-xl font-black text-white tracking-tighter">4,280 MINS</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full py-32 flex flex-col items-center gap-6">
                        <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Synchronizing Audio Waves...</span>
                    </div>
                ) : mixtapes.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-[#0B0B0F] border border-white/5 rounded-[4rem]">
                        <div className="flex flex-col items-center gap-6 opacity-30">
                            <Headphones size={64} className="text-gray-500" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">The frequency is silent. No mixtapes found.</span>
                        </div>
                    </div>
                ) : mixtapes.map((mx) => (
                    <div key={mx.id} className="group bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden hover:border-brand-purple/30 transition-all duration-500 shadow-xl hover:shadow-brand-purple/5">
                        <div className="aspect-[16/10] relative overflow-hidden">
                            <img
                                src={mx.coverUrl || 'https://via.placeholder.com/600x400?text=NO+IMAGE'}
                                alt={mx.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-80" />

                            <div className="absolute top-6 right-6">
                                <div className="px-5 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${mx.isFeatured ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'}`} />
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">{mx.genre || 'UNIDENTIFIED'}</span>
                                </div>
                            </div>

                            <button className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-brand-purple text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-500 shadow-2xl shadow-brand-purple/40">
                                <Play size={24} fill="currentColor" />
                            </button>
                        </div>

                        <div className="p-10">
                            <h3 className="text-lg font-black text-white tracking-tighter mb-4 group-hover:text-brand-purple transition-colors line-clamp-1">{mx.title}</h3>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {mx.tags?.slice(0, 3).map((tag: string) => (
                                    <span key={tag} className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="flex gap-4">
                                    <button className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-purple/30 transition-all">
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-gray-400/30 hover:text-red-500 hover:border-red-500/30 transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex flex-col items-end">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">Duration</p>
                                    <p className="text-sm font-black text-white tracking-tighter">{mx.duration || '--:--'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
};

export default Mixtapes;
