
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useData } from '../context/DataContext';

interface HeroProps {
    badge?: string;
    title: React.ReactNode;
    subtitle: string;
    cta1Text?: string;
    cta1Link?: string;
    cta2Text?: string;
    cta2Link?: string;
    bgImage?: string;
    showNewsletter?: boolean;
}

const Hero: React.FC<HeroProps> = ({
    badge,
    title,
    subtitle,
    cta1Text,
    cta1Link,
    cta2Text,
    cta2Link,
    bgImage,
    showNewsletter = true
}) => {
    const { addSubscriber } = useData();
    const [email, setEmail] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubscribe = async () => {
        if (!email) return;
        setIsSubmitting(true);
        try {
            await addSubscriber(email, 'Hero Newsletter');
            alert('Subscribed successfully!');
            setEmail('');
        } catch (err) {
            alert('Failed to subscribe. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 bg-[#0B0B0F]">
            {/* Background with Dark Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s]"
                style={{ backgroundImage: `url(${bgImage})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0B0B0F]/90 to-[#0B0B0F]" />
            </div>

            {/* Scanline Effect */}
            <div className="scanline" />

            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-purple/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-cyan/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

                {/* Orbital Rings / Particles */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
                {badge && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-effect border border-white/10 text-brand-cyan font-bold text-[10px] uppercase tracking-[0.3em] mb-8"
                    >
                        <span className="w-1 h-1 rounded-full bg-brand-cyan animate-pulse" />
                        {badge}
                    </motion.div>
                )}

                <motion.h1
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="text-6xl md:text-9xl font-display font-black text-white mb-8 tracking-tighter leading-[0.85] uppercase"
                >
                    {title}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium tracking-tight"
                >
                    {subtitle}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-wrap justify-center gap-6 mb-20"
                >
                    {cta1Text && cta1Link ? (
                        cta1Link.startsWith('#') ? (
                            <a href={cta1Link} className="btn-premium px-10 py-5 text-sm uppercase tracking-widest min-w-[200px]">
                                {cta1Text}
                            </a>
                        ) : (
                            <Link to={cta1Link} className="btn-premium px-10 py-5 text-sm uppercase tracking-widest min-w-[200px]">
                                {cta1Text}
                            </Link>
                        )
                    ) : null}
                    {cta2Text && cta2Link ? (
                        cta2Link.startsWith('#') ? (
                            <a href={cta2Link} className="btn-cyber-outline px-10 py-5 text-sm min-w-[200px]">
                                {cta2Text}
                            </a>
                        ) : (
                            <Link to={cta2Link} className="btn-cyber-outline px-10 py-5 text-sm min-w-[200px]">
                                {cta2Text}
                            </Link>
                        )
                    ) : null}
                </motion.div>

                {showNewsletter && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="max-w-md mx-auto"
                    >
                        <div className="glass-panel p-2 rounded-2xl flex flex-col sm:row gap-2 border border-white/10 group focus-within:border-brand-purple/50 transition-all shadow-2xl">
                            <div className="flex-1 flex items-center px-4 gap-3">
                                <Mail className="text-gray-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter terminal email..."
                                    className="bg-transparent border-none focus:ring-0 text-white w-full placeholder:text-gray-600 outline-none text-sm font-medium"
                                />
                            </div>
                            <button
                                className="bg-white text-black font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-brand-cyan transition-all disabled:opacity-50"
                                onClick={handleSubscribe}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Accessing...' : 'Join Pool'}
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-3 uppercase tracking-[0.2em] font-black opacity-60">Verified portal access for 5,000+ elite members</p>
                    </motion.div>
                )}
            </div>

            {/* Scroll Indicator */}
            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50"
            >
                <span className="text-[9px] uppercase tracking-[0.4em] font-black text-brand-cyan">Engage</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-brand-cyan to-transparent" />
            </motion.div>
        </section>
    );
};

export default Hero;
