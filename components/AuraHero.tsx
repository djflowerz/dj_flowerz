
import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface HeroCTA {
    label: string;
    path: string;
    icon?: LucideIcon;
    primary?: boolean;
}

interface AuraHeroProps {
    badge?: string;
    title: string;
    highlightWords?: string[];
    subtitle: string;
    ctas?: HeroCTA[];
    children?: React.ReactNode;
}

const AuraHero: React.FC<AuraHeroProps> = ({
    badge,
    title,
    highlightWords = [],
    subtitle,
    ctas = [],
    children
}) => {
    return (
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden bg-[#050507]">
            {/* Mesh Gradient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-cyan/15 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-purple/15 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Surface Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

            {/* Content Container */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in-up">
                {badge && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
                        <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{badge}</span>
                    </div>
                )}

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-white mb-8 leading-[0.9] tracking-tight">
                    {title.split(' ').map((word, i) => {
                        const cleanWord = word.replace(/[.,!]/g, '').toLowerCase();
                        const shouldHighlight = highlightWords.some(h => h.toLowerCase() === cleanWord);
                        return (
                            <span key={i} className={shouldHighlight ? 'text-gradient-cyan' : ''}>
                                {word}{' '}
                            </span>
                        );
                    })}
                </h1>

                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                    {subtitle}
                </p>

                {ctas.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        {ctas.map((cta, i) => (
                            <Link
                                key={i}
                                to={cta.path}
                                className={cta.primary ? 'btn-primary group !px-10 !py-4' : 'btn-secondary group !px-10 !py-4'}
                            >
                                {cta.icon && <cta.icon size={20} className="mr-2 group-hover:scale-110 transition-transform" />}
                                {cta.label}
                            </Link>
                        ))}
                    </div>
                )}

                {children}
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050507] to-transparent pointer-events-none"></div>
        </section>
    );
};

export default AuraHero;
