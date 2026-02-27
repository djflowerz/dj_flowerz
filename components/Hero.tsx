
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
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
            {/* Background with Dark Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] hover:scale-110"
                style={{ backgroundImage: `url(${bgImage})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0B0B0F]/80 to-[#0B0B0F]" />
            </div>

            {/* Decorative Circles */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-purple/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-cyan/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
                {badge && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-cyan font-bold text-xs uppercase tracking-widest mb-8 backdrop-blur-sm"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                        {badge}
                    </motion.div>
                )}

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-5xl md:text-8xl font-display font-black text-white mb-8 tracking-tighter leading-[0.95]"
                >
                    {title}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium"
                >
                    {subtitle}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-wrap justify-center gap-4 mb-20"
                >
                    {cta1Text && cta1Link ? (
                        cta1Link.startsWith('#') ? (
                            <a href={cta1Link} className="px-8 py-4 rounded-full font-bold text-white bg-brand-purple hover:bg-[#8e48eb] transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(123,92,255,0.4)]">
                                {cta1Text}
                            </a>
                        ) : (
                            <Link to={cta1Link} className="px-8 py-4 rounded-full font-bold text-white bg-brand-purple hover:bg-[#8e48eb] transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(123,92,255,0.4)]">
                                {cta1Text}
                            </Link>
                        )
                    ) : null}
                    {cta2Text && cta2Link ? (
                        cta2Link.startsWith('#') ? (
                            <a href={cta2Link} className="px-8 py-4 rounded-full font-bold text-black bg-brand-cyan hover:bg-[#15b5ad] hover:text-white transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(40,230,220,0.4)]">
                                {cta2Text}
                            </a>
                        ) : (
                            <Link to={cta2Link} className="px-8 py-4 rounded-full font-bold text-black bg-brand-cyan hover:bg-[#15b5ad] hover:text-white transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(40,230,220,0.4)]">
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
                        <div className="glass-effect p-2 rounded-2xl flex flex-col sm:flex-row gap-2 group focus-within:ring-2 focus-within:ring-brand-purple/50 transition-all">
                            <div className="flex-1 flex items-center px-4 gap-3">
                                <Mail className="text-gray-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Join our newsletter..."
                                    className="bg-transparent border-none focus:ring-0 text-white w-full placeholder:text-gray-600 outline-none"
                                />
                            </div>
                            <button
                                className="bg-white text-black font-bold px-6 py-2.5 rounded-xl hover:bg-brand-cyan transition-colors disabled:opacity-50"
                                onClick={handleSubscribe}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Joining...' : 'Subscribe'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-tighter font-medium shadow-sm">Join 5,000+ subscribers for weekly drops</p>
                    </motion.div>
                )}
            </div>


            {/* Scroll Indicator */}
            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30"
            >
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
            </motion.div>
        </section>
    );
};

export default Hero;
