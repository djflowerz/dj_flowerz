import { User } from '../types';

/**
 * Checks if a user has an active, non-expired subscription.
 * Admins are always considered to have active access.
 */
export const isUserSubscriber = (user: User | null | undefined): boolean => {
    if (!user) return false;
    if (user.isAdmin || user.role === 'admin') return true;

    if (!user.isSubscriber || !user.subscriptionExpiry) return false;

    try {
        const expiryDate = new Date(user.subscriptionExpiry);
        return expiryDate > new Date();
    } catch (e) {
        console.error("Error parsing subscription expiry date:", e);
        return false;
    }
};

/**
 * Gets a human-readable string for the remaining subscription time.
 */
export const getSubscriptionTimeLeft = (expiryDateStr: string | undefined): string => {
    if (!expiryDateStr) return '';

    try {
        const now = new Date().getTime();
        const expiry = new Date(expiryDateStr).getTime();
        const diff = expiry - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    } catch (e) {
        return '';
    }
};
