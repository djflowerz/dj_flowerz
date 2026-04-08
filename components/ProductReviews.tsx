/**
 * ProductReviews.tsx
 *
 * Premium reviews & ratings panel for products and mixtapes.
 * Features:
 * - Aggregate star rating breakdown (5-bar histogram)
 * - Authenticated review submission with star picker
 * - Verified purchase badges
 * - Pending / published status filtering (published shown to all)
 * - Framer Motion entrance animations
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, CheckCircle, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Review } from '../types';

interface ProductReviewsProps {
    /** The product or mixtape ID to scope reviews */
    targetId: string;
    /** Whether the current user has purchased/subscribed (unlocks verified badge) */
    isVerifiedPurchase?: boolean;
}

/* ─── Star Picker ─────────────────────────────────────────────────────────── */
const StarPicker: React.FC<{
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
    const [hovered, setHovered] = useState(0);

    return (
        <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onMouseEnter={() => setHovered(n)}
                    onClick={() => onChange(n)}
                    className="transition-transform hover:scale-125 disabled:cursor-not-allowed"
                    aria-label={`Rate ${n} stars`}
                >
                    <Star
                        size={28}
                        className={`transition-colors ${
                            n <= (hovered || value)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-white/20'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
};

/* ─── Single Star Display ─────────────────────────────────────────────────── */
const StarDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
            <Star
                key={n}
                size={size}
                className={n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/15'}
            />
        ))}
    </div>
);

/* ─── Rating Histogram ────────────────────────────────────────────────────── */
const RatingHistogram: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
    const total = reviews.length;
    const avg =
        total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

    const bars = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
        pct: total > 0 ? (reviews.filter((r) => r.rating === star).length / total) * 100 : 0,
    }));

    return (
        <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Big score */}
            <div className="text-center shrink-0">
                <div className="text-7xl font-black tracking-tighter text-white">
                    {avg > 0 ? avg.toFixed(1) : '—'}
                </div>
                <StarDisplay rating={Math.round(avg)} size={18} />
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-2 font-bold">
                    {total} {total === 1 ? 'Review' : 'Reviews'}
                </p>
            </div>

            {/* Bar chart */}
            <div className="flex-1 w-full space-y-2">
                {bars.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="text-white/40 font-bold w-3 text-right">{star}</span>
                        <Star size={10} className="fill-yellow-400 text-yellow-400 shrink-0" />
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: (5 - star) * 0.08 }}
                                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full"
                            />
                        </div>
                        <span className="text-white/30 w-4 text-right">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Single Review Card ──────────────────────────────────────────────────── */
const ReviewCard: React.FC<{ review: Review; index: number }> = ({ review, index }) => {
    const initials = review.userName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const avatarColors = [
        'from-brand-purple to-brand-pink',
        'from-brand-cyan to-blue-500',
        'from-emerald-500 to-teal-400',
        'from-orange-500 to-yellow-400',
        'from-pink-500 to-rose-400',
    ];
    const color = avatarColors[index % avatarColors.length];

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            className="bg-white/3 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-colors"
        >
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                        className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center font-black text-xs shrink-0`}
                    >
                        {initials}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-sm">{review.userName}</span>
                            {review.verifiedPurchase && (
                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                    <CheckCircle size={9} />
                                    Verified
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-white/30 font-mono">
                            {new Date(review.date).toLocaleDateString('en-KE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
                <StarDisplay rating={review.rating} />
            </div>
            {review.comment && (
                <p className="text-sm text-white/70 leading-relaxed">{review.comment}</p>
            )}
        </motion.div>
    );
};

/* ─── Main Component ──────────────────────────────────────────────────────── */
const ProductReviews: React.FC<ProductReviewsProps> = ({
    targetId,
    isVerifiedPurchase = false,
}) => {
    const { reviews, reviewsLoading, addReview } = useData();
    const { user } = useAuth();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    /* Filter to published reviews for this target */
    const productReviews = useMemo(
        () =>
            reviews
                .filter((r) => r.productId === targetId && r.status === 'approved')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [reviews, targetId]
    );

    /* Check if the logged-in user already left a review */
    const hasReviewed = useMemo(
        () => user && reviews.some((r) => r.productId === targetId && r.userId === user.id),
        [reviews, targetId, user]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a star rating.');
            return;
        }
        if (comment.trim().length < 10) {
            toast.error('Review must be at least 10 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await addReview(targetId, rating, comment.trim());
            toast.success('Review posted successfully!');
            setRating(0);
            setComment('');
            setShowForm(false);
        } catch {
            toast.error('Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="space-y-8">
            {/* ─── Section Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-400 border border-yellow-500/20">
                        <Star size={18} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">
                            Reviews &amp; Ratings
                        </h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                            Community Signals
                        </p>
                    </div>
                </div>

                {user && !hasReviewed && !showForm && (
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-purple text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-purple/20 hover:bg-brand-purple/90 transition-colors"
                    >
                        <MessageSquare size={14} />
                        Write a Review
                    </motion.button>
                )}
            </div>

            {/* ─── Aggregate Stats ────────────────────────────────────────── */}
            {!reviewsLoading && (
                <div className="bg-white/3 border border-white/5 rounded-3xl p-8">
                    <RatingHistogram reviews={productReviews} />
                </div>
            )}

            {/* ─── Submission Form ────────────────────────────────────────── */}
            <AnimatePresence>
                {showForm && (
                    <motion.form
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        onSubmit={handleSubmit}
                        className="bg-gradient-to-br from-brand-purple/10 to-brand-pink/5 border border-brand-purple/20 rounded-3xl p-8 space-y-6"
                    >
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                                Your Rating
                            </label>
                            <StarPicker value={rating} onChange={setRating} disabled={submitting} />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                                Your Review
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                disabled={submitting}
                                placeholder="Share your honest experience..."
                                rows={4}
                                maxLength={1000}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/30 transition-all disabled:opacity-50"
                            />
                            <p className="text-right text-[10px] text-white/20 mt-1">
                                {comment.length} / 1000
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <motion.button
                                type="submit"
                                disabled={submitting}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-brand-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-purple/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {submitting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </motion.button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                disabled={submitting}
                                className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-white/60 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>

                        {isVerifiedPurchase && (
                            <p className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                <CheckCircle size={12} />
                                Your review will be marked as a Verified Purchase
                            </p>
                        )}
                    </motion.form>
                )}
            </AnimatePresence>

            {/* ─── Already reviewed notice ────────────────────────────────── */}
            {hasReviewed && (
                <div className="flex items-center gap-3 text-[11px] text-emerald-400 font-bold uppercase tracking-wider p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl">
                    <CheckCircle size={14} />
                    You've already submitted a review for this item.
                </div>
            )}

            {/* ─── Not logged in notice ───────────────────────────────────── */}
            {!user && (
                <div className="text-center py-8 text-white/30 text-sm border border-white/5 rounded-3xl">
                    <a href="/login" className="text-brand-purple font-bold hover:underline">
                        Log in
                    </a>{' '}
                    to leave a review.
                </div>
            )}

            {/* ─── Reviews List ────────────────────────────────────────────── */}
            {reviewsLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={28} className="animate-spin text-brand-purple/50" />
                </div>
            ) : productReviews.length === 0 ? (
                <div className="text-center py-16 border border-white/5 rounded-3xl">
                    <Star size={36} className="text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 font-bold uppercase tracking-widest text-xs">
                        No reviews yet — be the first!
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {productReviews.map((review, i) => (
                        <ReviewCard key={review.id} review={review} index={i} />
                    ))}
                </div>
            )}
        </section>
    );
};

export default ProductReviews;
