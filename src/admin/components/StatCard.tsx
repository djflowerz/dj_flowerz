import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: any;
    color?: string;
    trend?: string;
    trendUp?: boolean;
    subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label, value, icon: Icon, color = 'brand-purple', trend, trendUp = true, subtext
}) => (
    <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:border-white/10">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color.replace('text-', '')}/10 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:bg-${color.replace('text-', '')}/20 transition-all duration-700`} />
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className={`w-14 h-14 rounded-2xl bg-${color.replace('text-', '')}/10 border border-${color.replace('text-', '')}/20 flex items-center justify-center text-${color.replace('text-', '')} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <Icon size={28} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${trendUp ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend}
                </div>
            )}
        </div>
        <div className="relative z-10">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mb-1 group-hover:text-gray-400 transition-colors">{label}</p>
            <div className="flex items-baseline gap-2">
                <h4 className="text-4xl font-black text-white tracking-tighter group-hover:text-shadow-glow transition-all">{value}</h4>
            </div>
            {subtext && <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 opacity-60 group-hover:opacity-100 transition-opacity">{subtext}</p>}
        </div>
    </div>
);
