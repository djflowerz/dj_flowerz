
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useRef, useCallback } from 'react';
import { Product, Mixtape, Booking, Track, SessionType, SiteConfig, Video, TelegramConfig, TelegramChannel, TelegramMapping, TelegramUser, TelegramLog, StudioEquipment, ShippingZone, NewsletterSubscriber, Genre, Subscription, Order, NewsletterCampaign, NewsletterSegment, SubscriptionPlan, StudioRoom, MaintenanceLog, Coupon, ReferralStats, User, ReferralSettings, ReferralLog, ContactMessage, Review, AppNotification, StudioSession, EventGig, InstallmentPlan, InstallmentPayment, StoreSettings, ShippingConfig, WishlistItem } from '../types';
import { PRODUCTS, FEATURED_MIXTAPES, POOL_TRACKS, YOUTUBE_VIDEOS, INITIAL_STUDIO_EQUIPMENT, INITIAL_SHIPPING_ZONES, INITIAL_GENRES } from '../constants';
import { useAuth } from './AuthContext';
import { useR2Collection } from '../hooks/useR2Collection';
import { fetchFromR2, saveToR2, addR2Item, updateR2Item, removeR2Item, addBatchR2Items, removeBatchR2Items, saveToD1, getAuthHeader as getR2AuthHeader, STORAGE_WORKER_URL, REMIX_WORKER_URL, syncPoolTrackToD1, deletePoolTrackFromD1, syncGenresToD1 } from '../utils/r2';
import { supabase } from '../utils/supabase';
import { 
  withTimeout, cleanLabel, getYoutubeId, safeJsonParse, 
  mapR2Track, mapR2Generic, mapR2Product, mapR2Mixtape, mapR2Order, 
  mapR2User, mapR2Subscription, mapR2Booking, mapR2SessionType, 
  mapR2MaintenanceLog, mapD1StudioRoom, mapD1StudioEquipment, 
  mapD1MaintenanceLog, mapR2Coupon, mapR2ReferralStats, 
  mapD1ReferralLog, mapR2Campaign, mapR2Subscriber, 
  mapR2Channel, mapR2Plan, mapR2Genre, mapR2Notification, 
  mapR2Tip, mapR2InstallmentPayment, mapR2InstallmentPlan 
} from '../utils/mappers';



const INITIAL_STORE_SETTINGS: StoreSettings = {
  shipping: {
    base_weight: 5,
    base_price: 406,
    increment_price: 30,
    hardship_towns: ['Lodwar', 'Kakuma', 'Lokichoggio'],
    hardship_surcharge: 1393.68,
    premium_prices: {
      same_day: 1500,
      one_hour: 2500,
      overnight: 400
    }
  }
};

// Initial Site Config Data (Fallback only if DB is empty)
const INITIAL_CONFIG: SiteConfig = {
  baseUrl: "https://djflowerz.co.ke",
  hero: {
    title: "DJ FLOWERZ",
    subtitle: "Nairobi's Premier DJ. Exclusive Mixtapes & Professional Gear.",
    ctaText: "Explore Community",
    bgImage: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop"
  },
  contact: {
    email: "djflowerz254@gmail.com",
    phone: "+254 789 783 258",
    whatsapp: "+254 789 783 258",
    address: "Nairobi, Kenya"
  },
  socials: {
    instagram: "https://instagram.com",
    twitter: "https://twitter.com",
    youtube: "https://www.youtube.com/@dj_flowerz",
    facebook: "https://facebook.com",
    telegram: "https://t.me/dj_flowerz"
  },
  home: {
    featuredMixtapes: { title: "Featured Mixtapes", subtitle: "Listen to the latest vibes from Nairobi.", ctaText: "View All" },
    musicPool: {
      title: "Join The Community",
      description: "Connect with the culture, get exclusive access to events, and stay updated with the latest music trends.",
      benefits: ['Exclusive Community Access', 'Early Event Updates', 'Member-Only Discussions', 'Direct Support Access'],
      ctaText: "Join Now"
    },
    storePromo: { title: "Trending Merch", description: "Fresh drips and professional gear for the modern DJ.", ctaText: "Shop All" },
    studioPromo: { title: "Bookings & Studio Sessions", description: "Need a DJ for your next event or studio time to record your hit? We provide professional services tailored to your needs.", ctaText: "Book Now" },
    tipJar: { title: "Support The Craft", message: "Enjoying the sets? Drop a tip to keep the culture alive and the music flowing.", ctaText: "Tip Jar" }
  },
  about: {
    title: "The Man Behind The Mix",
    bio: "DJ Flowerz has been dominating the Nairobi club scene for over a decade. Known for his seamless transitions and ability to read any crowd, he has become a staple in the East African entertainment industry.",
    image: "https://images.unsplash.com/photo-1571266028243-371695039148?auto=format&fit=crop&q=80&w=1000",
    careerTimeline: [
      { year: "2015", event: "Started professional DJing in Westlands" },
      { year: "2018", event: "Launched DJ Flowerz Brand & Merch" },
      { year: "2020", event: "Expanded Professional Audio Services" }
    ]
  },
  footer: {
    description: "The ultimate destination for exclusive mixtapes, culture, and professional DJ gear.",
    copyright: "© 2026 DJ FLOWERZ. All rights reserved."
  },
  legal: {
    terms: "These are the terms of service...",
    privacy: "We value your privacy...",
    refunds: "No refunds on digital items..."
  },
  seo: {
    siteTitle: "DJ FLOWERZ | Premium Audio Experience",
    description: "Nairobi's premier DJ platform featuring professional mixtapes, gear, and event bookings.",
    keywords: "DJ, Nairobi, Music, Mixtapes, Afrobeat, Amapiano",
    ogImage: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04"
  },
  notice: {
    enabled: false,
    title: "Welcome",
    message: "Welcome to DJ Flowerz. Experience the best in Nairobi culture.",
    type: "info"
  }
};

interface DataContextType {
  // Data
  siteConfig: SiteConfig;
  products: Product[];
  mixtapes: Mixtape[];
  bookings: Booking[];
  sessionTypes: SessionType[];
  youtubeVideos: Video[];
  poolTracks: Track[];
  genres: Genre[];
  studioEquipment: StudioEquipment[];
  shippingZones: ShippingZone[];
  subscribers: NewsletterSubscriber[];
  subscriptions: Subscription[];
  subscriptionPlans: SubscriptionPlan[];
  studioRooms: StudioRoom[];
  maintenanceLogs: MaintenanceLog[];
  orders: Order[];
  newsletterCampaigns: NewsletterCampaign[];
  newsletterSegments: NewsletterSegment[];
  coupons: Coupon[];
  referralStats: ReferralStats[];
  referralLogs: ReferralLog[];
  users: User[];
  telegramChannels: TelegramChannel[];
  payments: any[];
  tips: any[];
  scannedTracks: any[];
  syncNotifications: any[];
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  contactMessages: ContactMessage[];
  reviews: Review[];
  comments: any[];
  reviewsLoading: boolean;
  commentsLoading: boolean;
  notificationsLoading: boolean;
  syncNotificationsLoading: boolean;
  installmentPlans: InstallmentPlan[];
  chatSessions: any[];
  installmentPayments: InstallmentPayment[];
  wishlist: WishlistItem[];
  wishlistLoading: boolean;
  adminStats: { total_revenue: number; active_subs: number; monthly_sales_count: number; monthly_sales_amt: number; currency: string } | null;
  adminStatsLoading: boolean;
  expiringUsers: any[];
  expiringUsersLoading: boolean;
  toggleWishlist: (targetId: string, targetType: 'product' | 'mixtape' | 'track') => Promise<{ success: boolean; message?: string }>;
  isInWishlist: (targetId: string) => boolean;
  mixtapesError: string | null;
  mixtapesLoading: boolean;
  poolError: string | null;
  poolLoading: boolean;
  poolPagination: { page: number; limit: number; totalRecords: number; totalPages: number };
  productsLoading: boolean;
  ordersLoading: boolean;
  usersLoading: boolean;
  subscriptionsLoading: boolean;
  bookingsLoading: boolean;
  subscribersLoading: boolean;
  campaignsLoading: boolean;
  paymentsLoading: boolean;
  tipsLoading: boolean;
  studioEquipmentLoading: boolean;
  studioRoomsLoading: boolean;
  maintenanceLogsLoading: boolean;
  sessionTypesLoading: boolean;
  studioSessionsLoading: boolean;
  eventGigsLoading: boolean;
  installmentsLoading: boolean;
  productsError: string | null;
  ordersError: string | null;
  usersError: string | null;
  subscriptionsError: string | null;
  bookingsError: string | null;
  hasQuotaExceeded: boolean;
  storeSettings: StoreSettings;
  storeSettingsLoading: boolean;

  // Actions
  seedDatabase: () => Promise<void>;
  updateSiteConfig: (data: Partial<SiteConfig>) => void;
  updateStoreSettings: (data: Partial<StoreSettings>) => Promise<void>;

  addProduct: (product: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => void;

  addMixtape: (mixtape: Mixtape) => void;
  updateMixtape: (id: string, data: Partial<Mixtape>) => Promise<void>;
  deleteMixtape: (id: string) => void;

  addPoolTrack: (track: Track) => void;
  bulkAddPoolTracks: (tracks: Track[], idsToRemoveFromScanned: string[]) => Promise<void>;
  updatePoolTrack: (id: string, data: Partial<Track>) => Promise<void>;
  deletePoolTrack: (id: string) => void;

  addPayment: (payment: any) => Promise<void>;
  addTip: (tip: any) => Promise<void>;
  loadMorePoolTracks: (count?: number) => void;
  deployPoolToStorefront: () => Promise<void>;

  updateGenre: (id: string, data: Partial<Genre>) => void;

  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;

  addSessionType: (session: SessionType) => void;
  updateSessionType: (id: string, data: Partial<SessionType>) => void;
  deleteSessionType: (id: string) => void;

  addVideo: (video: Video) => void;
  deleteVideo: (id: string) => void;

  // Referral Actions
  applyReferralCode: (code: string) => Promise<{ success: boolean; discount?: number; message?: string; referrerId?: string }>;
  updateReferralSettings: (settings: Partial<ReferralSettings>) => Promise<void>;
  issueReferralReward: (log: ReferralLog) => Promise<void>;

  addStudioEquipment: (equipment: StudioEquipment) => void;
  updateStudioEquipment: (id: string, data: Partial<StudioEquipment>) => void;
  deleteStudioEquipment: (id: string) => void;

  addSubscription: (sub: Subscription) => void;
  updateSubscription: (id: string, data: Partial<Subscription>) => void;
  addSubscriptionPlan: (plan: SubscriptionPlan) => void;
  updateSubscriptionPlan: (id: string, data: Partial<SubscriptionPlan>) => void;
  deleteSubscriptionPlan: (id: string) => void;
  grantSubscription: (email: string, days: number) => Promise<void>;
  revokeSubscription: (email: string) => Promise<void>;

  addStudioRoom: (room: StudioRoom) => void;
  updateStudioRoom: (id: string, data: Partial<StudioRoom>) => void;
  deleteStudioRoom: (id: string) => void;
  addMaintenanceLog: (log: MaintenanceLog) => void;
  updateMaintenanceLog: (id: string, data: Partial<MaintenanceLog>) => void;
  deleteMaintenanceLog: (id: string) => void;

  addOrder: (order: Order) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  addCampaign: (camp: NewsletterCampaign) => void;
  broadcastEmail: (data: { subject: string, body: string, segment: string }) => Promise<{ success: boolean; message?: string; recipientCount?: number }>;
  refreshNotifications: () => void;
  updateCampaign: (id: string, data: Partial<NewsletterCampaign>) => void;

  deleteCoupon: (id: string) => void;
  validateCoupon: (code: string) => Promise<{ success: boolean; coupon?: Coupon; message?: string }>;
  
  // Installment Actions
  addInstallmentPlan: (plan: Partial<InstallmentPlan>) => Promise<boolean>;
  updateInstallmentPlan: (id: string, data: Partial<InstallmentPlan>) => Promise<boolean>;
  deleteInstallmentPlan: (id: string) => Promise<boolean>;
  payInstallment: (planId: string) => Promise<boolean>;

  updateTelegramConfig: (config: Partial<TelegramConfig>) => void;
  addTelegramChannel: (channel: TelegramChannel) => void;
  updateTelegramChannel: (id: string, data: Partial<TelegramChannel>) => void;
  deleteTelegramChannel: (id: string) => void;

  updateShippingZone: (id: string, data: Partial<ShippingZone>) => void;
  addSubscriber: (email: string, source?: string) => Promise<void>;

  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  addContactMessage: (message: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateContactMessage: (id: string, updates: Partial<ContactMessage>) => Promise<void>;
  addReview: (productId: string, rating: number, comment: string) => Promise<void>;
  addComment: (mixtapeId: string, text: string) => Promise<void>;
  incrementMixtapeDownload: (mixtapeId: string) => Promise<void>;
  isFirstTimeSubscriber: (userId: string) => Promise<boolean>;
  addScannedTracks: (tracks: any[]) => Promise<void>;
  clearAllScannedTracks: () => Promise<void>;
  refreshPoolTracks: (filters?: { page?: number; limit?: number; hub?: string; genre?: string; year?: string; month?: string; search?: string }) => Promise<void>;
  refreshScannedTracks: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  refreshStudioSessions: () => void;
  refreshEventGigs: () => void;
  refreshSyncNotifications: () => void;
  refreshInstallments: () => void;
  refreshChatSessions: () => void;

  refreshProducts: () => void;
  refreshMixtapes: () => void;
  refreshOrders: () => void;
  refreshUsers: () => void;
  refreshSubscriptions: () => void;
  refreshBookings: () => void;
  refreshSubscribers: () => void;
  refreshCampaigns: () => void;
  refreshPayments: () => void;
  refreshTips: () => void;
  refreshEquipment: () => void;
  refreshRooms: () => void;
  refreshLogs: () => void;
  refreshSessionTypes: () => void;
  refreshScannedTracksData?: () => void;
  refreshGenres: () => void;
  refreshVideos: () => void;
  refreshPlans: () => void;
  refreshZones: () => void;
  refreshCoupons: () => void;
  refreshReferrals: () => void;
  refreshTelegramChannels: () => void;
  refreshContactMessages: () => void;
  refreshReviews: () => void;
  refreshComments: () => void;
  refreshAdminStats: () => Promise<void>;
  refreshExpiringUsers: () => Promise<void>;

  sendEmail: (data: { to: string | string[]; subject: string; html: string; text?: string }) => Promise<{ success: boolean; message: string }>;
  sendNewsletterConfirmation: (email: string) => Promise<void>;
  uploadTrackList: (file: File) => Promise<{ success: boolean; message: string; count?: number }>;
  downloadTrackList: () => void;

  // Trust & Identity Actions
  requestSync: () => Promise<{ success: boolean; message: string }>;
  verifyOtp: (code: string) => Promise<{ success: boolean; message: string }>;
  requestBadge: (badgeType: string, notes?: string) => Promise<{ success: boolean; message: string }>;
  resolveDispute: (dealId: string, resolution: 'release_to_seller' | 'refund_to_buyer') => Promise<{ success: boolean; message: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Label Cleaning Helper (removes (123 tracks) from name)


// Helper to fetch collection (Namespaced V8 style)
// Added 'enabled' parameter to conditionally fetch based on rules
// Added 'limit' parameter for pagination to improve performance
const getTableName = (colName: string): string => {
  const mapping: Record<string, string> = {
    'products': 'products',
    'mixtapes': 'mixtapes',
    'sessionTypes': 'session_types',
    'studio_gear': 'studio/gear',
    'studio_locations': 'studio/locations',
    'studioEquipment': 'studio/gear',
    'studioRooms': 'studio/locations',
    'maintenanceLogs': 'studio/maintenance',
    'maintenance_logs': 'studio/maintenance',
    'reviews': 'reviews',
    'comments': 'mixtape_comments',
    'wishlist': 'user/wishlist',
    'studio_sessions': 'bookings/studio',
    'event_gigs': 'bookings/gigs',
    'mixtape_comments': 'mixtape_comments',
    'contactMessages': 'support/tickets',
    'installmentPlans': 'installments',
    'userInstallments': 'user/installments',
    'contact_messages': 'support/tickets',
    'bookings': 'bookings/gigs',
    'syncNotifications': 'pool/sync-notifications',
    'profiles': 'profiles',
    // --- Subscription plans (Standardized to /api/plans) ---
    'subscriptionPlans': 'plans',
    'subscriptions': 'active-subscribers',
    'shippingZones': 'shipping_zones',
    'youtubeVideos': 'youtube_videos',
    'referral_stats': 'referrals/stats',
    'referral_logs': 'referrals/logs',
  };
  return mapping[colName] || colName;
};

// All data is fetched from Cloudflare R2. Supabase is used for Auth only (handled in AuthContext).

const useCollection = <T extends { id: string }>(
  colName: string,
  initialData: T[],
  enabled: boolean = true,
  transform?: (data: any) => T,
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'desc',
  source: 'R2' | 'D1' = 'R2',
  useAdminPath: boolean = false
) => {
  const tableName = getTableName(colName);
  const [data, setData] = useState<T[]>(initialData);
  const dataRef = useRef(data);
  dataRef.current = data;

  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      let results: any[] = [];
      if (source === 'D1') {
        const authHeader = await getR2AuthHeader();
        // Use /api/admin for dashboard/admin collections to bypass public cache/filters
        // GUARD: Never use admin path if no auth token is available (prevents guest errors)
        const effectiveAdminPath = useAdminPath && authHeader.Authorization;
        const apiPrefix = effectiveAdminPath ? '/api/admin' : '/api';
        const url = `${STORAGE_WORKER_URL}${apiPrefix}/${tableName}?t=${Date.now()}`;
        console.log(`[useCollection] Fetching from D1: ${url} (Admin: ${!!effectiveAdminPath})`);
        const response = await fetch(url, {
          headers: authHeader,
          cache: 'no-store'
        });
        if (response.ok) {
          const rawData = await response.json();
          console.log(`[useCollection] D1 Success for ${tableName}:`, Array.isArray(rawData) ? rawData.length : 'Object');
          // Handle both { results: [] } and raw array formats
          results = Array.isArray(rawData) ? rawData : (rawData.results || []);
        } else {
          console.error(`[useCollection] D1 Error for ${tableName}: ${response.status} ${response.statusText}`);
          console.warn(`[D1] Fetch failed for ${tableName}, falling back to R2...`);
          results = await fetchFromR2<any>(tableName);
        }
      } else {
        results = await fetchFromR2<any>(tableName);
      }

      let transformed: any[] = [];
      if (Array.isArray(results)) {
        transformed = results.map(item => transform ? transform(item) : (item as unknown as T));
      } else {
        console.warn(`[useCollection] Expected array for ${tableName}, got ${typeof results}. Forcing empty map.`);
      }

      if (orderByField) {
        transformed.sort((a: any, b: any) => {
          const valA = a[orderByField];
          const valB = b[orderByField];
          if (valA < valB) return orderDirection === 'asc' ? -1 : 1;
          if (valA > valB) return orderDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }

      // If we already have data and the new fetch is empty, it might be a temporary error or propagation lag
      // Don't revert to initialData if we've successfully loaded items before.
      if (transformed.length === 0 && dataRef.current.length > 0) {
        console.warn(`[useCollection] Fetch for ${tableName} returned 0 items, keeping current state of ${dataRef.current.length} items to avoid flickering.`);
        return;
      }

      // For admin-path queries, ALWAYS use the live result (even if empty) — never silently
      // fall back to hardcoded initialData, which would mask real "no data" states.
      const useHardcodedFallback = !useAdminPath && transformed.length === 0 && initialData.length > 0;
      if (useHardcodedFallback) {
        console.warn(`[useCollection] ${tableName} returned 0 items, falling back to hardcoded initialData (${initialData.length} items).`);
      }
      setData(useHardcodedFallback ? initialData : transformed);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown fetch error';
      console.error(`[useCollection] ${source} fetch error (${tableName}):`, errorMessage);
      setError(errorMessage);
      
      // Safety Fallback: If we crash hard and have no data, use initialData to prevent white screen
      if (dataRef.current.length === 0 && initialData.length > 0) {
        setData(initialData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [colName, enabled, source, orderByField, orderDirection, useAdminPath, tableName]);

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchDataRef.current();
  }, [colName, enabled, source, orderByField, orderDirection, useAdminPath]);

  const loadMore = useCallback(() => { console.warn("loadMore not implemented"); }, []);
  return [data, setData, isLoading, loadMore, error, fetchData] as const;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log("DataProvider Render:", { hasChildren: !!children });
  const { user, updateUserProfile } = useAuth();
  const adminEmailFromEnv = (import.meta.env.VITE_ADMIN_EMAIL || 'ianmuriithiflowerz@gmail.com').toLowerCase();
  const isAdmin = Boolean(
    user?.isAdmin || 
    user?.role === 'admin' || 
    user?.role === 'dj' || 
    (user?.email && user.email.toLowerCase() === adminEmailFromEnv) ||
    (user?.email && user.email.toLowerCase() === 'djflowerz254@gmail.com')
  );

  /**
   * Stable auth header fetcher to prevent effect re-triggers
   */
  const getAuthHeader = useCallback(async () => {
    return await getR2AuthHeader();
  }, []);

  // Determine roles for conditional fetching
  const isSubscriber = user?.isSubscriber || isAdmin;

  // -- COLLECTIONS AND DATA STATE (Moved to top to prevent "used before declaration" errors) --

  // Public Collections
  const [products, setProducts, productsLoading, , productsError, refreshProducts] = useCollection<Product>('products', PRODUCTS, true, mapR2Product, 'createdAt', 'desc', 'D1', isAdmin);
  const [mixtapes, setMixtapes, mixtapesLoading, , mixtapesError, refreshMixtapes] = useCollection<Mixtape>('mixtapes', FEATURED_MIXTAPES, true, mapR2Mixtape, 'createdAt', 'desc', 'D1', isAdmin);
  const [sessionTypes, setSessionTypes, sessionTypesLoading, , , refreshSessionTypes] = useCollection<SessionType>('sessionTypes', [], true, mapR2SessionType, 'createdAt', 'desc', 'D1', isAdmin);
  const [studioEquipment, setStudioEquipment, equipmentLoading, , , refreshEquipment] = useCollection<StudioEquipment>('studioEquipment', INITIAL_STUDIO_EQUIPMENT, true, mapD1StudioEquipment, 'createdAt', 'desc', 'D1', isAdmin);
  const [subscriptionPlans, setSubscriptionPlans, plansLoading, , , refreshPlans] = useCollection<SubscriptionPlan>('subscriptionPlans', [], true, mapR2Plan, 'price', 'asc', 'D1', isAdmin);

  const [shippingZones, setShippingZones, zonesLoading, , , refreshZones] = useCollection<ShippingZone>('shippingZones', INITIAL_SHIPPING_ZONES, true, mapR2Generic, 'createdAt', 'desc');
  const [genres, setGenres, genresLoading, , , refreshGenres] = useCollection<Genre>('genres', INITIAL_GENRES, true, mapR2Genre, 'createdAt', 'desc');
  const [youtubeVideos, setYoutubeVideos, videosLoading, , , refreshVideos] = useCollection<Video>('youtubeVideos', [], true, mapR2Generic, 'createdAt', 'desc');

  // Admin Collections
  const [orders, , ordersLoading, , ordersError, refreshOrders] = useCollection<Order>('orders', [], isAdmin, mapR2Order, 'createdAt', 'desc', 'D1', isAdmin);
  const [users, setUsers, usersLoading, , usersError, refreshUsers] = useCollection<User>('profiles', [], isAdmin, mapR2User, 'createdAt', 'desc', 'D1', isAdmin);
  const [subscriptions, , subscriptionsLoading, , subscriptionsError, refreshSubscriptions] = useCollection<Subscription>('subscriptions', [], isAdmin, mapR2Subscription, 'startDate', 'desc', 'D1', isAdmin);
  const [bookings, , bookingsLoading, , bookingsError, refreshBookings] = useCollection<Booking>('bookings/gigs', [], isAdmin, mapR2Booking, 'createdAt', 'desc', 'D1', isAdmin);

  const [studioRooms, , studioRoomsLoading, , , refreshRooms] = useCollection<StudioRoom>('studio/locations', [], isAdmin, mapD1StudioRoom, 'createdAt', 'desc', 'D1', isAdmin);
  const [maintenanceLogs, , maintenanceLogsLoading, , , refreshLogs] = useCollection<MaintenanceLog>('studio/maintenance', [], isAdmin, mapD1MaintenanceLog, 'createdAt', 'desc', 'D1', isAdmin);
  const [coupons, , couponsLoading, , , refreshCoupons] = useCollection<Coupon>('coupons', [], isAdmin, mapR2Coupon, 'createdAt', 'desc', 'D1', isAdmin);
  const [referralStats, , referralStatsLoading, , , refreshReferrals] = useCollection<ReferralStats>('referrals/stats', [], isAdmin, mapR2ReferralStats, 'createdAt', 'desc', 'D1', isAdmin);
  const [referralLogs, , referralLogsLoading, , , refreshReferralLogs] = useCollection<ReferralLog>('referrals/logs', [], isAdmin, mapD1ReferralLog, 'createdAt', 'desc', 'D1', isAdmin);
  const [newsletterCampaigns, , campaignsLoading, , , refreshCampaigns] = useCollection<NewsletterCampaign>('newsletter_campaigns', [], isAdmin, mapR2Campaign, 'createdAt', 'desc', 'D1', isAdmin);
  const [newsletterSegments, , segmentsLoading, , , refreshSegments] = useCollection<NewsletterSegment>('newsletter_segments', [], isAdmin, mapR2Generic, 'createdAt', 'desc', 'R2', isAdmin);
  const [subscribers, , subscribersLoading, , , refreshSubscribers] = useCollection<NewsletterSubscriber>('newsletter_subscribers', [], isAdmin, mapR2Subscriber, 'created_at', 'desc', 'D1', isAdmin);
  const [telegramChannels, , tgChannelsLoading, , , refreshTelegramChannels] = useCollection<TelegramChannel>('telegram_channels', [], isAdmin, mapR2Channel, 'createdAt', 'desc', 'R2', isAdmin);
  const [payments, , paymentsLoading, , , refreshPayments] = useCollection<any>('payments', [], isAdmin, mapR2Tip, 'createdAt', 'desc', 'R2', isAdmin);
  const [tips, , tipsLoading, , , refreshTips] = useCollection<any>('tips', [], isAdmin, mapR2Tip, 'createdAt', 'desc', 'D1', isAdmin);
  const [chatSessions, , chatSessionsLoading, , , refreshChatSessions] = useCollection<any>('chat/sessions', [], isAdmin, undefined, 'last_message_at', 'desc', 'D1', isAdmin);

  // Dashboard & Misc
  const [studioSessions, , studioSessionsLoading, , , refreshStudioSessions] = useCollection<StudioSession>('bookings/studio', [], isAdmin, undefined, 'created_at', 'desc', 'D1', isAdmin);
  const [eventGigs, , eventGigsLoading, , , refreshEventGigs] = useCollection<EventGig>('bookings/gigs', [], isAdmin, undefined, 'created_at', 'desc', 'D1', isAdmin);
  
  const [installmentPlans, setInstallmentPlans, installmentsLoading, , installmentsError, refreshInstallments] = useCollection<InstallmentPlan>(
    isAdmin ? 'installments' : 'user/installments', 
    [], 
    isAdmin || !!user, 
    mapR2InstallmentPlan, 
    'createdAt', 
    'desc', 
    'D1', 
    isAdmin || !!user
  );
  const [installmentPayments, , , , , refreshInstallmentPayments] = useCollection<InstallmentPayment>('installment_payments', [], isAdmin, mapR2InstallmentPayment, 'createdAt', 'desc', 'D1', isAdmin);

  const [telegramMappings] = useCollection<TelegramMapping>('telegram_mappings', [], isAdmin, mapR2Generic, 'createdAt', 'desc', 'R2', isAdmin);
  const [telegramUsers] = useCollection<TelegramUser>('telegram_users', [], isAdmin, mapR2Generic, 'createdAt', 'desc', 'R2', isAdmin);
  const [telegramLogs] = useCollection<TelegramLog>('telegram_logs', [], isAdmin, mapR2Generic, 'timestamp', 'desc', 'R2', isAdmin);
  const [contactMessages, , messagesLoading, , , refreshContactMessages] = useCollection<ContactMessage>('support/tickets', [], isAdmin, mapR2Generic, 'createdAt', 'desc', 'D1', isAdmin);

  const [reviews, , reviewsLoading, , , refreshReviews] = useCollection<Review>('reviews', [], isAdmin, (r) => ({ ...r, date: r.date || r.created_at }), 'date', 'desc', 'D1', isAdmin);
  const [comments, , commentsLoading, , , refreshComments] = useCollection<any>('comments', [], isAdmin, (c) => ({ ...c, date: c.date || c.created_at }), 'date', 'desc', 'D1', isAdmin);
  const [wishlist, setWishlist, wishlistLoading, , , refreshWishlist] = useCollection<WishlistItem>('wishlist', [], !!user, (w) => ({ ...w, createdAt: w.created_at || w.createdAt }), 'createdAt', 'desc', 'D1', false);
  const [syncNotifications, , syncNotificationsLoading, , , refreshSyncNotifications] = useCollection<any>('pool/sync-notifications', [], isAdmin, undefined, 'created_at', 'desc', 'D1', isAdmin);
  const [notifications, setNotifications, notificationsLoading, , , refreshNotifications] = useCollection<AppNotification>('notifications', [], isAdmin, mapR2Notification, 'createdAt', 'desc', 'R2', isAdmin);

  // -- REALTIME DATA SUBSCRIPTIONS --

  // Site Config (R2)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(INITIAL_CONFIG);

  const fetchConfig = useCallback(async () => {
    try {
      const BASE_URL = (import.meta.env.VITE_STORAGE_WORKER_URL || STORAGE_WORKER_URL || '').trim().replace(/\/$/, '');
      const res = await fetch(`${BASE_URL}/api/data/config/site.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('Config fetch failed');
      const data = await res.json() as SiteConfig;
      if (data && typeof data === 'object') {
        // Deep-merge with INITIAL_CONFIG so a partial R2 response never
        // wipes out nested keys (hero, home, etc.) that components access
        // without optional chaining, causing crash.
        setSiteConfig({
          ...INITIAL_CONFIG,
          ...data,
          hero:    { ...INITIAL_CONFIG.hero,    ...(data.hero    || {}) },
          home:    { ...INITIAL_CONFIG.home,    ...(data.home    || {}),
            featuredMixtapes: { ...INITIAL_CONFIG.home.featuredMixtapes, ...(data.home?.featuredMixtapes || {}) },
            musicPool:        { ...INITIAL_CONFIG.home.musicPool,        ...(data.home?.musicPool        || {}) },
            storePromo:       { ...INITIAL_CONFIG.home.storePromo,       ...(data.home?.storePromo       || {}) },
            studioPromo:      { ...INITIAL_CONFIG.home.studioPromo,      ...(data.home?.studioPromo      || {}) },
            tipJar:           { ...INITIAL_CONFIG.home.tipJar,           ...(data.home?.tipJar           || {}) },
          },
          about:   { ...INITIAL_CONFIG.about,   ...(data.about   || {}) },
          contact: { ...INITIAL_CONFIG.contact, ...(data.contact || {}) },
          socials: { ...INITIAL_CONFIG.socials, ...(data.socials || {}) },
          footer:  { ...INITIAL_CONFIG.footer,  ...(data.footer  || {}) },
          legal:   { ...INITIAL_CONFIG.legal,   ...(data.legal   || {}) },
          seo:     { ...INITIAL_CONFIG.seo,     ...(data.seo     || {}) },
          notice:  { ...INITIAL_CONFIG.notice,  ...(data.notice  || {}) },
        });
      }
    } catch (err) {
      console.warn("Failed to fetch site config, using defaults.");
    }
  }, []);

  useEffect(() => {
    fetchConfig();

    // Poll for config updates every 60 seconds
    const interval = setInterval(fetchConfig, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Store Settings (D1 via Worker API)
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(INITIAL_STORE_SETTINGS);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(true);

  const fetchStoreSettings = useCallback(async () => {
    try {
      const response = await fetch(`${STORAGE_WORKER_URL}/api/store/settings`);
      if (response.ok) {
        const data = await response.json();
        // Merge with initial defaults to ensure all fields exist
        setStoreSettings({
          ...INITIAL_STORE_SETTINGS,
          ...data,
          shipping: {
            ...INITIAL_STORE_SETTINGS.shipping,
            ...(data.shipping || {})
          }
        });
      }
    } catch (error) {
      console.warn("Error fetching store settings:", error);
    } finally {
      setStoreSettingsLoading(false);
    }
  }, []);


  const updateStoreSettings = useCallback(async (data: Partial<StoreSettings>) => {
    try {
      const authHeader = await getAuthHeader();
      const updated = { ...storeSettings, ...data };
      setStoreSettings(updated);
      await saveToR2('config/store', updated);
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/config/store`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        const result = await response.json();
        setStoreSettings(result);
      }
    } catch (error) {
      console.error("Error updating store settings:", error);
    }
  }, [storeSettings, getAuthHeader]);

  useEffect(() => {
    fetchStoreSettings();
  }, []);



  // Pool tracks: fetch directly from our Cloudflare Worker proxying KV caching to avoid DB lag
  const [poolTracks, setPoolTracks] = useState<Track[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState<Error | null>(null);
  const [poolPagination, setPoolPagination] = useState({ page: 1, limit: 50, totalRecords: 0, totalPages: 0 });

  // Pool tracks: scanned tracks (from R2 landing zone)
  const [scannedTracks, setScannedTracks] = useState<any[]>([]);
  const [scannedLoading, setScannedLoading] = useState(false);

  const refreshScannedTracks = useCallback(async () => {
    try {
      setScannedLoading(true);
      const data = await fetchFromR2<any[]>('scanned_tracks');
      setScannedTracks(data || []);
    } catch (err) {
      console.error("Fetch scanned tracks failed:", err);
    } finally {
      setScannedLoading(false);
    }
  }, []);

  const refreshPoolTracks = useCallback(async (filters: any = {}) => {
    setPoolLoading(true);
    console.log(`[DataContext] Refreshing pool tracks from D1 with filters...`, filters);
    try {
      const authHeader = await getAuthHeader();
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.hub && filters.hub !== 'all' && filters.hub !== 'All Hubs') params.append('hub', filters.hub);
      if (filters.genre && filters.genre !== 'All' && filters.genre !== 'All Genres') params.append('genre', filters.genre);
      if (filters.year && filters.year !== 'All Years') params.append('year', filters.year);
      if (filters.month && filters.month !== 'All Months') params.append('month', filters.month);
      if (filters.search) params.append('search', filters.search);
      if (filters.bpmMin) params.append('bpmMin', filters.bpmMin.toString());
      if (filters.bpmMax) params.append('bpmMax', filters.bpmMax.toString());
      if (filters.camelotKey && filters.camelotKey !== 'All Keys') params.append('camelotKey', filters.camelotKey);

      const qs = params.toString();
      const url = `${REMIX_WORKER_URL}/api/pool/tracks${qs ? '?' + qs : ''}`;

      const response = await fetch(url, {
        headers: authHeader,
        cache: 'no-store'
      });
      if (response.ok) {
        const result = await response.json();
        const tracksArray = result.tracks || [];
        console.log(`[DataContext] Fetched ${tracksArray.length} pool tracks from D1`);
        
        // If it's page 1, replace. If it's > 1, append with de-duplication.
        const mappedTracks = tracksArray.map(mapR2Track);

        // Final artist/title deduplication pass + Zero-Version Safety Filter
        const getFingerprint = (t: Track) => `${t.artist.toLowerCase().trim()}|${t.title.toLowerCase().trim().replace(/dj\s*vick\s*nick/gi, 'dj flowerz')}`;

        if (filters.page && filters.page > 1) {
          setPoolTracks(prev => {
            const seen = new Set(prev.map(getFingerprint));
            const uniqueNew = mappedTracks.filter(t => {
              // Priority: 1. Must have media (versions, preview, or video) 2. Must not be duplicate
              const hasMedia = (t.versions && t.versions.length > 0) || t.previewUrl || t.videoUrl;
              if (!hasMedia) return false;
              
              const fp = getFingerprint(t);
              if (seen.has(fp)) return false;
              seen.add(fp);
              return true;
            });
            return [...prev, ...uniqueNew];
          });
        } else {
          const seen = new Set();
          const unique = mappedTracks.filter(t => {
            const hasMedia = (t.versions && t.versions.length > 0) || t.previewUrl || t.videoUrl;
            if (!hasMedia) return false;
            
            const fp = getFingerprint(t);
            if (seen.has(fp)) return false;
            seen.add(fp);
            return true;
          });
          setPoolTracks(unique);
        }

        if (result.pagination) {
          setPoolPagination(result.pagination);
        }
        
        setPoolError(null);
      } else {
        throw new Error(`Failed to fetch pool tracks: ${response.status}`);
      }
    } catch (err: any) {
      console.error("[DataContext] Pool refresh error:", err.message);
      setPoolError(err);
      if (POOL_TRACKS && Object.keys(filters).length === 0) setPoolTracks(POOL_TRACKS); // Only fallback on initial load
    } finally {
      setPoolLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPoolTracks({ page: 1, limit: 50 });
    refreshScannedTracks();
    // Refresh pool tracks periodically 
    const interval = setInterval(() => {
      refreshPoolTracks({ page: 1, limit: 50 });
      refreshScannedTracks();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);


  // Auto-deduplicate users by email
  useEffect(() => {
    if (isAdmin && users.length > 0) {
      const emailMap = new Map();
      let hasDuplicates = false;

      users.forEach((u: any) => {
        if (!u.email) return;
        const email = u.email.toLowerCase().trim();
        if (!emailMap.has(email)) {
          emailMap.set(email, u);
        } else {
          hasDuplicates = true;
          // Keep the newer one or the one with subscription? 
          // For now, if we find a duplicate, we just log it.
        }
      });

      if (hasDuplicates) {
        const uniqueUsers = Array.from(emailMap.values());
        console.log(`👤 Found and removing ${users.length - uniqueUsers.length} duplicate user profiles.`);
        setUsers(uniqueUsers);
        // We don't auto-save to R2 profiles as it's sensitive, but it clears from UI
      }
    }
  }, [isAdmin, users.length]);




  // --- Subscription callbacks (moved here so refreshSubscriptions/refreshPlans/refreshUsers are in-scope) ---

  const addSubscription = useCallback(async (sub: Subscription) => {
    try {
      const ok = await saveToD1('subscriptions', 'POST', sub);
      if (ok) refreshSubscriptions();
    } catch (err: any) {
      console.error("Add subscription failed:", err.message);
    }
  }, [refreshSubscriptions]);

  const isFirstTimeSubscriber = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/user/first-timer?userId=${userId}`, {
        headers: authHeader,
        cache: 'no-store'
      });
      if (response.ok) {
        const { isFirstTime } = await response.json();
        return isFirstTime;
      }
      return false;
    } catch (error) {
      console.warn("Error checking first-timer status:", error);
      return false;
    }
  }, []);

  const updateSubscription = useCallback(async (id: string, data: Partial<Subscription>) => {
    try {
      const ok = await saveToD1('subscriptions', 'PUT', data, id);
      if (ok) refreshSubscriptions();
    } catch (err: any) {
      console.error("Update subscription failed:", err.message);
    }
  }, [refreshSubscriptions]);

  const addSubscriptionPlan = useCallback(async (plan: SubscriptionPlan) => {
    try {
      const ok = await saveToD1('subscription_plans', 'POST', plan);
      if (ok) refreshPlans();
    } catch (err: any) {
      console.error("Add plan failed:", err.message);
    }
  }, [refreshPlans]);

  const updateSubscriptionPlan = useCallback(async (id: string, data: Partial<SubscriptionPlan>) => {
    try {
      const ok = await saveToD1('subscription_plans', 'PUT', data, id);
      if (ok) refreshPlans();
    } catch (err: any) {
      console.error("Update plan failed:", err.message);
    }
  }, [refreshPlans]);

  const deleteSubscriptionPlan = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('subscription_plans', 'DELETE', undefined, id);
      if (ok) refreshPlans();
    } catch (err: any) {
      console.error("Delete plan failed:", err.message);
    }
  }, [refreshPlans]);

  const grantSubscription = useCallback(async (email: string, days: number): Promise<void> => {
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/subscriptions/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ email, days }),
      });
      if (response.ok) {
        alert(`Successfully granted ${days} days of subscription to ${email}`);
        refreshSubscriptions();
        refreshUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant subscription');
      }
    } catch (error: any) {
      console.error("Grant subscription error:", error);
      alert(error.message);
    }
  }, [refreshSubscriptions, refreshUsers]);

  const revokeSubscription = useCallback(async (email: string): Promise<void> => {
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/subscriptions/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        alert(`Successfully revoked subscription for ${email}`);
        refreshSubscriptions();
        refreshUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke subscription');
      }
    } catch (error: any) {
      console.error("Revoke subscription error:", error);
      alert(error.message);
    }
  }, [refreshSubscriptions, refreshUsers]);

  // Telegram (Admin) - Non-realtime
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({ botToken: '', botUsername: '', status: 'Disconnected' });

  // Fetch Telegram Config (Single Doc from R2)
  useEffect(() => {
    if (!isAdmin) return;

    const fetchTgConfig = async () => {
      try {
        const sets = await fetchFromR2<any>('settings');
        const data = sets.find((s: any) => s.id === 'telegram_config');
        if (data) {
          setTelegramConfig({
            botToken: data.botToken || '',
            botUsername: data.botUsername || '',
            status: data.status || 'Disconnected'
          });
        }
      } catch (err) { console.error('Error fetching tg config:', err); }
    };

    fetchTgConfig();
  }, [isAdmin]);

  const [referralSettings, setReferralSettings] = useState<ReferralSettings>({
    newUserDiscount: 28.57,
    newUserDiscountType: 'percentage',
    referrerRewardAmount: 500,
    rewardType: 'flat',
    enabled: true,
    firstTimeDiscountEnabled: true,
    firstTimeDiscount: 28.57,
    firstTimeDiscountType: 'percentage'
  });

  const [adminStats, setAdminStats] = useState<{ total_revenue: number; active_subs: number; monthly_sales_count: number; monthly_sales_amt: number; currency: string } | null>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  const [expiringUsers, setExpiringUsers] = useState<any[]>([]);
  const [expiringUsersLoading, setExpiringUsersLoading] = useState(false);

  const refreshAdminStats = useCallback(async () => {
    if (!isAdmin) return;
    setAdminStatsLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/stats`, {
        headers: authHeader,
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.warn("Error fetching admin stats:", error);
    } finally {
      setAdminStatsLoading(false);
    }
  }, [isAdmin]);

  const refreshExpiringUsers = useCallback(async () => {
    if (!isAdmin) return;
    setExpiringUsersLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/expiry-watch`, {
        headers: authHeader,
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setExpiringUsers(data.users || []);
      }
    } catch (error) {
      console.warn("Error fetching expiring users:", error);
    } finally {
      setExpiringUsersLoading(false);
    }
  }, [isAdmin]);

  const fetchRefSettings = async () => {
    try {
      const sets = await fetchFromR2<any>('settings');
      const data = sets.find((s: any) => s.id === 'referralSettings');
      if (data && data.data) {
        setReferralSettings(data.data as ReferralSettings);
      }
    } catch (err) { console.error('Error fetching referral settings', err); }
  };

  useEffect(() => {
    fetchRefSettings();
    // Poll for referral settings every 60 seconds
    const interval = setInterval(fetchRefSettings, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // --- ACTIONS (Now exclusively R2) ---

  // --- ACTIONS (Now exclusively R2) ---

  const updateReferralSettings = async (settings: Partial<ReferralSettings>) => {
    const newSettings = { ...referralSettings, ...settings };
    try {
      const allSettings = await fetchFromR2<any>('settings');
      const updated = allSettings.filter((s: any) => s.id !== 'referralSettings');
      updated.push({ id: 'referralSettings', data: newSettings, updated_at: new Date().toISOString() });
      await saveToR2('settings', updated);
      setReferralSettings(newSettings);
    } catch (err) { console.error('Error updating referral settings', err); }
  };
  
  const refreshFnsRef = useRef({ refreshOrders, refreshUsers, refreshSubscriptions, refreshBookings, refreshPayments, refreshAdminStats, refreshExpiringUsers });
  
  // Keep refresh functions ref up to date
  useEffect(() => {
    refreshFnsRef.current = { 
      refreshOrders, refreshUsers, refreshSubscriptions, refreshBookings, refreshPayments, refreshAdminStats, refreshExpiringUsers,
      refreshInstallments, refreshChatSessions, refreshCampaigns, refreshCoupons
    };
  });

  useEffect(() => {
    if (!isAdmin) return;

    // Poll for high-priority admin data every 2 minutes
    const interval = setInterval(() => {
      refreshFnsRef.current.refreshOrders();
      refreshFnsRef.current.refreshUsers();
      refreshFnsRef.current.refreshSubscriptions();
      refreshFnsRef.current.refreshBookings();
      refreshFnsRef.current.refreshPayments();
      refreshFnsRef.current.refreshAdminStats();
      refreshFnsRef.current.refreshExpiringUsers();
    }, 2 * 60 * 1000);

    // Initial fetch
    refreshFnsRef.current.refreshAdminStats();
    refreshFnsRef.current.refreshExpiringUsers();

    return () => clearInterval(interval);
  }, [isAdmin]);

  const checkSubscriptionExpiry = useCallback(async (profiles: any[], userSubscriptions: any[]) => {
    if (!user) return;

    const userProfile = profiles.find(p => p.id === user.id);
    if (!userProfile) return;

    const expiryStr = userProfile.subscription_expiry || userProfile.subscriptionExpiry;
    if (!expiryStr) return;

    const expiryDate = new Date(expiryStr);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Check for Expired
    if (diffDays <= 0) {
      const notifId = `exp_${user.id}_${expiryDate.getTime()}`;
      const existing = (await fetchFromR2<any[]>('notifications')) || [];
      const alreadyNotified = existing.some((n: any) => n.userId === user.id && n.id === notifId);

      if (!alreadyNotified) {
        await addR2Item('notifications', {
          id: notifId,
          userId: user.id,
          title: 'Subscription Expired',
          message: `Your ${userProfile.subscription_plan || 'Premium'} access has expired. Please renew to continue downloading.`,
          type: 'subscription',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }
    // 2. Check for Expiring soon (3 days or less)
    else if (diffDays <= 3) {
      const notifId = `soon_${user.id}_${expiryDate.getTime()}`;
      const existing = (await fetchFromR2<any[]>('notifications')) || [];
      const alreadyNotified = existing.some((n: any) => n.userId === user.id && n.id === notifId);

      if (!alreadyNotified) {
        await addR2Item('notifications', {
          id: notifId,
          userId: user.id,
          title: 'Subscription Expiring Soon',
          message: `Your ${userProfile.subscription_plan} access will expire in ${diffDays} days. Renew now to avoid interruption.`,
          type: 'subscription',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/pricing'
        });
        refreshNotifications();
      }
    }
  }, [user?.id, refreshNotifications]);

  useEffect(() => {
    if (user && users.length > 0) {
      checkSubscriptionExpiry(users, subscriptions);
    }
  }, [user?.id, users, subscriptions, checkSubscriptionExpiry]);

  const applyReferralCode = useCallback(async (code: string) => {
    if (!referralSettings.enabled) return { success: false, message: 'Referral system is currently disabled.' };

    const normalizedCode = (code || '').trim().toUpperCase();

    // 1. Check for Administrative Coupons first
    const activeCoupon = coupons.find(c => c.active && c.code.toUpperCase() === normalizedCode);
    if (activeCoupon) {
      if (activeCoupon.expiryDate && new Date(activeCoupon.expiryDate).getTime() < Date.now()) {
        return { success: false, message: 'This promo code has expired.' };
      }

      if (activeCoupon.usageLimit > 0 && activeCoupon.usageCount >= activeCoupon.usageLimit) {
        return { success: false, message: 'This promo code has reached its maximum usage limit.' };
      }

      if (activeCoupon.assignedUserId && activeCoupon.assignedUserId !== user?.id) {
        return { success: false, message: 'This promo code is not valid for your account.' };
      }

      if (activeCoupon.isSingleUse && activeCoupon.usageCount > 0) {
        return { success: false, message: 'This promo code has already been used.' };
      }

      const discountLabel = activeCoupon.discountType === 'percentage'
        ? `${activeCoupon.discountValue}% OFF`
        : `KES ${activeCoupon.discountValue} OFF`;

      return {
        success: true,
        discount: activeCoupon.discountValue,
        discountType: activeCoupon.discountType,
        message: `Promo code applied! You'll get ${discountLabel} your subscription.`,
        referrerId: 'system',
        applicablePlans: activeCoupon.applicablePlans,
        couponId: activeCoupon.id
      };
    }

    // 2. Special handling for legacy/hardcoded PROMO_DISCOUNT
    if (normalizedCode === 'PROMO_DISCOUNT') {
      const discountLabel = referralSettings.newUserDiscountType === 'percentage'
        ? `${referralSettings.newUserDiscount}% OFF`
        : `KES ${referralSettings.newUserDiscount} OFF`;

      return {
        success: true,
        discount: referralSettings.newUserDiscount,
        discountType: referralSettings.newUserDiscountType,
        message: `Promo code applied! You'll get ${discountLabel} your subscription.`,
        referrerId: 'system'
      };
    }

    // 3. Check for User Referral Codes
    try {
      const allProfiles = await fetchFromR2<any>('profiles');
      const profile = allProfiles.find((p: any) => (p.referral_code || p.referralCode) === normalizedCode);

      if (!profile) return { success: false, message: 'Invalid referral code.' };
      if (profile.id === user?.id) return { success: false, message: 'You cannot refer yourself!' };

      const discountLabel = referralSettings.newUserDiscountType === 'percentage'
        ? `${referralSettings.newUserDiscount}% OFF`
        : `KES ${referralSettings.newUserDiscount} OFF`;

      return {
        success: true,
        discount: referralSettings.newUserDiscount,
        discountType: referralSettings.newUserDiscountType,
        message: `Code applied! You'll get ${discountLabel} your subscription.`,
        referrerId: profile.id
      };
    } catch (err) {
      console.error("Apply referral code error:", err);
      return { success: false, message: 'Error validating referral code.' };
    }
  }, [referralSettings, coupons, user?.id]);

  const issueReferralReward = useCallback(async (referrerId: string, refereeId: string, refereeName: string) => {
    try {
      const settings = await fetchFromR2<any>('settings');
      const refSettings = settings.find(s => s.id === 'referralSettings')?.data;
      const rewardAmount = refSettings?.referrerRewardAmount || 50;

      const logEntry = {
        referrer_id: referrerId,
        referred_id: refereeId,
        action_type: 'subscription',
        reward_type: 'kes',
        reward_amount: rewardAmount,
        created_at: new Date().toISOString()
      };
      await saveToD1('referral_logs', 'POST', logEntry);
      
      const profiles = await fetchFromR2<any>('profiles'); 
      const referrer = profiles.find(p => p.id === referrerId);
      if (referrer) {
        await saveToD1('profiles', 'PUT', { balance: (referrer.balance || 0) + rewardAmount }, referrerId);
      }

      refreshReferrals();
      refreshReferralLogs();
      refreshUsers();
      console.log(`[Referral] Issued KES ${rewardAmount} reward to ${referrerId}`);
    } catch (err) {
      console.error('Failed to issue referral reward:', err);
      throw err;
    }
  }, [refreshReferrals, refreshReferralLogs, refreshUsers]);

  const seedDatabase = useCallback(async () => {
    if (!isAdmin) {
      alert("Admin privileges required to seed database.");
      return;
    }

    try {
      await saveToR2('products', PRODUCTS);
      await saveToR2('mixtapes', FEATURED_MIXTAPES);
      await saveToR2('studio_equipment', INITIAL_STUDIO_EQUIPMENT);
      await saveToR2('subscription_plans', subscriptionPlans);
      await saveToR2('shipping_zones', INITIAL_SHIPPING_ZONES);
      await saveToR2('genres', INITIAL_GENRES);

      const settingsData = [
        { id: 'siteConfig', data: INITIAL_CONFIG, updated_at: new Date().toISOString() },
        { id: 'referralSettings', data: referralSettings, updated_at: new Date().toISOString() }
      ];
      await saveToR2('settings', settingsData);

      alert("Database has been seeded successfully!");
    } catch (e: any) {
      console.error("Error seeding database:", e);
      alert("Error seeding database: " + e.message);
    }
  }, [isAdmin, subscriptionPlans, referralSettings]);

  const updateSiteConfig = useCallback(async (data: Partial<SiteConfig>) => {
    try {
      const updated = { ...siteConfig, ...data };
      setSiteConfig(updated);
      await saveToR2('config/site', updated);
      alert("Site Configuration saved successfully!");
      // config auto-polls so we don't need a manual refresh hook
    } catch (err: any) {
      console.error("Update site config failed:", err.message);
      alert("Failed to save configuration: " + err.message);
    }
  }, [siteConfig]);



  const addProduct = useCallback(async (product: Partial<Product>) => {
    try {
      const ok = await saveToD1('products', 'POST', product);
      if (ok) refreshProducts();
    } catch (err: any) {
      console.error("Add product failed:", err.message);
    }
  }, [refreshProducts]);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>) => {
    try {
      const ok = await saveToD1('products', 'PUT', data, id);
      if (ok) refreshProducts();
    } catch (err: any) {
      console.error("Update product failed:", err.message);
    }
  }, [refreshProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('products', 'DELETE', undefined, id);
      if (ok) refreshProducts();
    } catch (err: any) {
      console.error("Delete product failed:", err.message);
    }
  }, [refreshProducts]);


  const addMixtape = useCallback(async (mixtape: Mixtape) => {
    try {
      const ok = await saveToD1('mixtapes', 'POST', mixtape);
      if (ok) refreshMixtapes();
    } catch (err: any) {
      console.error("Add mixtape failed:", err.message);
    }
  }, [refreshMixtapes]);

  const updateMixtape = useCallback(async (id: string, data: Partial<Mixtape>) => {
    try {
      const ok = await saveToD1('mixtapes', 'PUT', data, id);
      if (ok) refreshMixtapes();
    } catch (err: any) {
      console.error("Update mixtape failed:", err.message);
    }
  }, [refreshMixtapes]);

  const deleteMixtape = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('mixtapes', 'DELETE', undefined, id);
      if (ok) refreshMixtapes();
    } catch (err: any) {
      console.error("Delete mixtape failed:", err.message);
    }
  }, [refreshMixtapes]);


  const addPoolTrack = useCallback(async (track: Track) => {
    try {
      const ok = await saveToD1('pool_tracks', 'POST', track);
      if (ok) refreshPoolTracks();
    } catch (err: any) {
      console.error("Add pool track failed:", err.message);
    }
  }, [refreshPoolTracks]);

  const bulkAddPoolTracks = useCallback(async (newTracks: Track[], idsToRemoveFromScanned: string[]) => {
    try {
      // 1. Add all to D1
      const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/pool/bulk-add`, {
        method: 'POST',
        headers: await getAuthHeader(),
        body: JSON.stringify({ tracks: newTracks })
      });

      if (res.ok) {
        // 2. Remove from Scanned Tracks in R2
        if (idsToRemoveFromScanned.length > 0) {
          const remainingScanned = scannedTracks.filter(t => !idsToRemoveFromScanned.includes(t.id));
          await saveToR2('scanned_tracks', remainingScanned);
          setScannedTracks(remainingScanned);
        }
        refreshPoolTracks();
        refreshScannedTracks();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Bulk add failed:", err.message);
      return false;
    }
  }, [scannedTracks, refreshPoolTracks, refreshScannedTracks]);

  const addScannedTracks = useCallback(async (tracks: any[]) => {
    try {
      const existing = await fetchFromR2<any[]>('scanned_tracks') || [];
      const updated = [...tracks, ...existing];
      await saveToR2('scanned_tracks', updated);
      setScannedTracks(updated);
      return true;
    } catch (err: any) {
      console.error("Add scanned tracks failed:", err.message);
      return false;
    }
  }, []);

  const clearAllScannedTracks = useCallback(async () => {
    try {
      await saveToR2('scanned_tracks', []);
      setScannedTracks([]);
      return true;
    } catch (err: any) {
      console.error("Clear scanned failed:", err.message);
      return false;
    }
  }, []);

  const loadMorePoolTracks = useCallback(async (limit: number = 5000) => {
    try {
      setPoolLoading(true);
      const authHeader = await getAuthHeader();
      const res = await fetch(`${STORAGE_WORKER_URL}/api/pool/tracks?limit=${limit}`, {
        headers: authHeader,
        cache: 'no-store'
      });
      if (!res.ok) throw new Error("Failed to load music pool tracks");
      const data = await res.json();
      const tracksArray = data.tracks || [];

      // We replace with the full set to ensure searchability across all tracks
      setPoolTracks(tracksArray.map(mapR2Track));
    } catch (err: any) {
      console.error("Load tracks failed:", err);
    } finally {
      setPoolLoading(false);
    }
  }, [getAuthHeader]);

  const updatePoolTrack = useCallback(async (id: string, data: Partial<Track>) => {
    try {
      const ok = await saveToD1('pool_tracks', 'PUT', data, id);
      if (ok) refreshPoolTracks();
    } catch (err: any) {
      console.error("Update track failed:", err.message);
    }
  }, [refreshPoolTracks]);

  const deletePoolTrack = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('pool_tracks', 'DELETE', undefined, id);
      if (ok) refreshPoolTracks();
    } catch (err: any) {
      console.error("Delete track failed:", err.message);
    }
  }, [refreshPoolTracks]);

  const deployPoolToStorefront = useCallback(async () => {
    try {
      setPoolLoading(true);
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/migrate-pool-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ tracks: poolTracks })
      });
      
      if (!response.ok) throw new Error("Migration failed");
      
      const result = await response.json();
      alert(`Successfully deployed ${result.inserted} tracks to storefront!`);
    } catch (err: any) {
      console.error("Deploy failed:", err.message);
      alert("Failed to deploy to storefront: " + err.message);
    } finally {
      setPoolLoading(false);
    }
  }, [getAuthHeader, poolTracks]);

  const updateGenre = useCallback(async (id: string, data: Partial<Genre>) => {
    try {
      const ok = await saveToD1('genres', 'PUT', data, id);
      if (ok) refreshGenres();
    } catch (err: any) {
      console.error("Update genre failed:", err.message);
    }
  }, [refreshGenres]);

  const addBooking = useCallback(async (booking: Booking) => {
    try {
      const ok = await saveToD1('bookings', 'POST', booking);
      if (ok) refreshBookings();
    } catch (err: any) {
      console.error("Add booking failed:", err.message);
    }
  }, [refreshBookings]);

  const updateBooking = useCallback(async (id: string, data: Partial<Booking>) => {
    try {
      const ok = await saveToD1('bookings', 'PUT', data, id);
      if (ok) refreshBookings();
    } catch (err: any) {
      console.error("Update booking failed:", err.message);
    }
  }, [refreshBookings]);

  const updateBookingStatus = useCallback(async (id: string, status: string) => {
    try {
      const ok = await saveToD1('bookings', 'PATCH', { status }, id);
      if (ok) refreshBookings();
    } catch (err: any) {
      console.error("Update status failed:", err.message);
    }
  }, [refreshBookings]);

  const addSessionType = useCallback(async (session: SessionType) => {
    try {
      const ok = await saveToD1('session_types', 'POST', session);
      if (ok) refreshSessionTypes();
    } catch (err: any) {
      console.error("Add session type failed:", err.message);
    }
  }, [refreshSessionTypes]);

  const updateSessionType = useCallback(async (id: string, data: Partial<SessionType>) => {
    try {
      const ok = await saveToD1('session_types', 'PATCH', data, id);
      if (ok) refreshSessionTypes();
    } catch (err: any) {
      console.error("Update session type failed:", err.message);
    }
  }, [refreshSessionTypes]);

  const deleteSessionType = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('session_types', 'DELETE', undefined, id);
      if (ok) refreshSessionTypes();
    } catch (err: any) {
      console.error("Delete session type failed:", err.message);
    }
  }, [refreshSessionTypes]);

  const addVideo = useCallback(async (video: Video) => {
    try {
      const finalId = video.id || `v${Date.now()}`;
      const newVideos = [{ ...video, id: finalId, updatedAt: new Date().toISOString() }, ...youtubeVideos];
      setYoutubeVideos(newVideos);
      await saveToR2('videos', newVideos);
      refreshVideos();
    } catch (err: any) {
      console.error("Add video failed:", err.message);
    }
  }, [youtubeVideos, refreshVideos]);

  const deleteVideo = useCallback(async (id: string) => {
    try {
      const newVideos = youtubeVideos.filter(v => v.id !== id);
      setYoutubeVideos(newVideos);
      await saveToR2('videos', newVideos);
      refreshVideos();
    } catch (err: any) {
      console.error("Delete video failed:", err.message);
    }
  }, [youtubeVideos, refreshVideos]);

  const addStudioEquipment = async (equipment: StudioEquipment) => {
    try {
      const ok = await saveToD1('studio/gear', 'POST', equipment);
      if (ok) refreshEquipment();
    } catch (err: any) {
      console.error("Add equipment failed:", err.message);
    }
  };

  const updateStudioEquipment = async (id: string, data: Partial<StudioEquipment>) => {
    try {
      const ok = await saveToD1('studio/gear', 'PATCH', data, id);
      if (ok) refreshEquipment();
    } catch (err: any) {
      console.error("Update equipment failed:", err.message);
    }
  };

  const addStudioRoom = useCallback(async (room: StudioRoom) => {
    try {
      const ok = await saveToD1('studio/locations', 'POST', room);
      if (ok) refreshRooms();
    } catch (err: any) {
      console.error("Add room failed:", err.message);
    }
  }, [refreshRooms]);

  const updateStudioRoom = useCallback(async (id: string, data: Partial<StudioRoom>) => {
    try {
      const ok = await saveToD1('studio/locations', 'PATCH', data, id);
      if (ok) refreshRooms();
    } catch (err: any) {
      console.error("Update room failed:", err.message);
    }
  }, [refreshRooms]);

  const deleteStudioRoom = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('studio/locations', 'DELETE', undefined, id);
      if (ok) refreshRooms();
    } catch (err: any) {
      console.error("Delete room failed:", err.message);
    }
  }, [refreshRooms]);

  const addMaintenanceLog = useCallback(async (log: MaintenanceLog) => {
    try {
      const payload = {
        studioId: log.type === 'room' ? log.itemId : null,
        gearId: log.type === 'equipment' ? log.itemId : null,
        issue: log.description,
        status: log.status
      };
      const ok = await saveToD1('studio/maintenance', 'POST', payload);
      if (ok) refreshLogs();
    } catch (err: any) {
      console.error("Add log failed:", err.message);
    }
  }, [refreshLogs]);

  const updateMaintenanceLog = useCallback(async (id: string, data: Partial<MaintenanceLog>) => {
    try {
      const payload: any = {};
      if (data.description) payload.issue = data.description;
      if (data.status) payload.status = data.status;
      
      const ok = await saveToD1('studio/maintenance', 'PATCH', payload, id);
      if (ok) refreshLogs();
    } catch (err: any) {
      console.error("Update log failed:", err.message);
    }
  }, [refreshLogs]);

  const updateTelegramConfig = useCallback(async (configData: Partial<TelegramConfig>) => {
    try {
      const newConfig = { ...telegramConfig, ...configData };
      setTelegramConfig(newConfig);
      await saveToR2('telegram_config', { id: 'main', ...newConfig });
    } catch (err: any) {
      console.error("Update telegram config failed:", err.message);
    }
  }, [telegramConfig]);

  const addTelegramChannel = useCallback(async (channel: TelegramChannel) => {
    try {
      const docId = channel.id || `tg_${Date.now()}`;
      const newChannels = [{ ...channel, id: docId, updatedAt: new Date().toISOString() }, ...telegramChannels];
      await saveToR2('telegram_channels', newChannels);
      refreshTelegramChannels();
    } catch (err: any) {
      console.error("Add channel failed:", err.message);
    }
  }, [telegramChannels, refreshTelegramChannels]);

  const updateTelegramChannel = useCallback(async (id: string, data: Partial<TelegramChannel>) => {
    try {
      const newChannels = telegramChannels.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      await saveToR2('telegram_channels', newChannels);
      refreshTelegramChannels();
    } catch (err: any) {
      console.error("Update channel failed:", err.message);
    }
  }, [telegramChannels, refreshTelegramChannels]);

  const deleteTelegramChannel = useCallback(async (id: string) => {
    try {
      const newChannels = telegramChannels.filter(c => c.id !== id);
      await saveToR2('telegram_channels', newChannels);
      refreshTelegramChannels();
    } catch (err: any) {
      console.error("Delete channel failed:", err.message);
    }
  }, [telegramChannels, refreshTelegramChannels]);

  const updateShippingZone = useCallback(async (id: string, data: Partial<ShippingZone>) => {
    try {
      const newZones = shippingZones.map(z => z.id === id ? { ...z, ...data, updatedAt: new Date().toISOString() } : z);
      await saveToR2('shipping_zones', newZones);
      refreshZones();
    } catch (err: any) {
      console.error("Update shipping zone failed:", err.message);
    }
  }, [shippingZones, refreshZones]);

  const adjustLoyaltyPoints = useCallback(async (userId: string, points: number, description: string) => {
    try {
      const auth = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/loyalty/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ userId, points, description }),
      });

      const result = await response.json();
      if (result.success) refreshUsers();
      return result;
    } catch (error: any) {
      console.error("Loyalty adjustment failed:", error);
      return { success: false, message: error.message };
    }
  }, [getAuthHeader, refreshUsers]);

  const sendEmail = useCallback(async (data: { to: string | string[]; subject: string; html: string; text?: string }) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error: any) {
      console.error("Email send error:", error);
      return { success: false, message: error.message };
    }
  }, []);

  const broadcastEmail = useCallback(async (data: { subject: string, body: string, segment: string }) => {
    try {
      const auth = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/newsletter/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) refreshCampaigns();
      return result;
    } catch (error: any) {
      console.error("Broadcast failed:", error);
      return { success: false, message: error.message };
    }
  }, [getAuthHeader, refreshCampaigns]);

  const sendNewsletterConfirmation = useCallback(async (email: string) => {
    await sendEmail({
      to: email,
      subject: `Welcome to the DJ FLOWERZ Community! 🎧`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0f; border: 1px solid #1a1a20; padding: 40px; color: #ffffff;">
          <h1 style="color: #a855f7; margin-bottom: 10px;">Welcome Aboard!</h1>
          <p style="font-size: 16px; color: #9ca3af; line-height: 1.6;">Thanks for joining the DJ FLOWERZ newsletter. You're now on the list for exclusive mixtapes, store drops, and music pool updates.</p>
          <div style="background: #15151a; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #ffffff10;">
            <p style="margin: 0; color: #ffffff;"><strong>Enjoying the vibes?</strong> Stay tuned for our next drop coming soon!</p>
          </div>
          <a href="https://djflowerz.co.ke" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Visit Website</a>
          <hr style="border: 0; border-top: 1px solid #ffffff08; margin: 30px 0;">
          <p style="font-size: 10px; color: #4b5563; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">© 2024 DJ FLOWERZ. All rights reserved.</p>
        </div>
      `,
      text: `Welcome to the DJ FLOWERZ Community! Thanks for joining our newsletter. Visit djflowerz.co.ke for the latest mixtapes.`
    });
  }, [sendEmail]);

  const deleteScannedTrack = useCallback(async (id: string) => {
    setScannedTracks(prev => {
      const next = (prev || []).filter((t: any) => t.id !== id);
      saveToR2('scanned_tracks', next).catch(err => {
        console.error("Delayed R2 save error for scanned_tracks delete:", err);
      });
      return next;
    });
  }, []);

  const downloadTrackList = useCallback(() => {
    try {
      const content = poolTracks
        .map(t => `${t.artist} - ${t.title} [${t.genre}]`)
        .join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `music_pool_tracklist_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Tracklist download failed:", err);
    }
  }, [poolTracks]);

  const uploadTrackList = useCallback(async (file: File): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      const parsedTracks = lines.map(line => {
        let artist = 'Unknown Artist';
        let title = line;
        let genre = 'General';

        if (line.includes(' - ')) {
          [artist, title] = line.split(' - ').map(s => s.trim());
        }

        const genreMatch = title.match(/\[(.*?)\]/);
        if (genreMatch) {
          genre = genreMatch[1];
          title = title.replace(`[${genre}]`, '').trim();
        }

        return {
          id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          artist,
          title,
          genre,
          dateAdded: new Date().toISOString(),
          versions: []
        };
      });

      const updatedPool = [...(parsedTracks as Track[]), ...poolTracks];
      setPoolTracks(updatedPool);
      await saveToR2('pool_tracks', updatedPool);

      return { success: true, message: `Successfully parsed and added ${parsedTracks.length} track references.`, count: parsedTracks.length };
    } catch (err: any) {
      console.error("List upload failed:", err);
      return { success: false, message: err.message };
    }
  }, [poolTracks]);

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
    try {
      const ok = await saveToD1('users', 'PUT', data, id);
      if (ok) refreshUsers();
    } catch (err: any) {
      console.error("Update user failed:", err.message);
    }
  }, [refreshUsers]);

  const removeUser = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('users', 'DELETE', undefined, id);
      if (ok) refreshUsers();
    } catch (err: any) {
      console.error("Remove user failed:", err.message);
    }
  }, [refreshUsers]);

  const addPayment = useCallback(async (payment: any) => {
    try {
      const ok = await saveToD1('payments', 'POST', payment);
      if (ok) refreshPayments();
    } catch (err: any) {
      console.error("Add payment failed:", err.message);
    }
  }, [refreshPayments]);

  const addTip = useCallback(async (tip: any) => {
    try {
      const ok = await saveToD1('tips', 'POST', tip);
      if (ok) refreshTips();
    } catch (err: any) {
      console.error("Add tip failed:", err.message);
    }
  }, [refreshTips]);
  const deleteMaintenanceLog = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('maintenance_logs', 'DELETE', undefined, id);
      if (ok) refreshLogs();
    } catch (err: any) {
      console.error("Delete maintenance log failed:", err.message);
    }
  }, [refreshLogs]);

  const addContactMessage = async (message: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>) => {
    try {
      const response = await fetch(`${STORAGE_WORKER_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      refreshContactMessages();
    } catch (err: any) {
      console.error("Add contact message failed:", err.message);
      throw err;
    }
  };

  const addCampaign = useCallback(async (camp: NewsletterCampaign) => {
    try {
      const ok = await saveToD1('campaigns', 'POST', camp);
      if (ok) refreshCampaigns();
    } catch (err: any) {
      console.error("Add campaign failed:", err.message);
    }
  }, [refreshCampaigns]);

  const updateCampaign = useCallback(async (id: string, data: Partial<NewsletterCampaign>) => {
    try {
      const ok = await saveToD1('campaigns', 'PUT', data, id);
      if (ok) refreshCampaigns();
    } catch (err: any) {
      console.error("Update campaign failed:", err.message);
    }
  }, [refreshCampaigns]);

  const addCoupon = useCallback(async (coupon: Partial<Coupon>) => {
    try {
      const ok = await saveToD1('coupons', 'POST', coupon);
      if (ok) refreshCoupons();
    } catch (err: any) {
      console.error("Add coupon failed:", err.message);
    }
  }, [refreshCoupons]);

  const updateCoupon = useCallback(async (id: string, data: Partial<Coupon>) => {
    try {
      const ok = await saveToD1('coupons', 'PUT', data, id);
      if (ok) refreshCoupons();
    } catch (err: any) {
      console.error("Update coupon failed:", err.message);
    }
  }, [refreshCoupons]);

  const deleteCoupon = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('coupons', 'DELETE', undefined, id);
      if (ok) refreshCoupons();
    } catch (err: any) {
      console.error("Delete coupon failed:", err.message);
    }
  }, [refreshCoupons]);

  const validateCoupon = useCallback(async (code: string): Promise<{ success: boolean; coupon?: Coupon; message?: string }> => {
    try {
      const response = await fetch(`${STORAGE_WORKER_URL}/api/coupons/validate?code=${encodeURIComponent(code)}`);
      if (response.ok) {
        return await response.json();
      }
      return { success: false, message: 'Invalid or expired coupon' };
    } catch (error) {
      console.error("Coupon validation error:", error);
      return { success: false, message: 'Validation failed' };
    }
  }, []);

  const addSubscriber = useCallback(async (email: string, source: string = 'newsletter') => {
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ email, source }),
      });
      if (response.ok) {
        refreshSubscribers();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Subscribe failed:", err.message);
      return false;
    }
  }, [refreshSubscribers]);

  const updateContactMessage = useCallback(async (id: string, updates: Partial<ContactMessage>) => {
    try {
      const ok = await saveToD1('contact_messages', 'PUT', updates, id);
      if (ok) refreshLogs();
    } catch (err: any) {
      console.error("Update message failed:", err.message);
    }
  }, [refreshLogs]);

  const deleteMessage = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('contact_messages', 'DELETE', undefined, id);
      if (ok) refreshLogs();
    } catch (err: any) {
      console.error("Delete message failed:", err.message);
    }
  }, [refreshLogs]);


  const deleteStudioEquipment = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('studio_gear', 'DELETE', undefined, id);
      if (ok) refreshEquipment();
    } catch (err: any) {
      console.error("Delete equipment failed:", err.message);
    }
  }, [refreshEquipment]);

  const addOrder = useCallback(async (order: Order) => {
    try {
      const ok = await saveToD1('orders', 'POST', order);
      if (ok) refreshOrders();
    } catch (err: any) {
      console.error("Add order failed:", err.message);
    }
  }, [refreshOrders]);

  const updateOrder = useCallback(async (id: string, data: Partial<Order>) => {
    try {
      const ok = await saveToD1('orders', 'PUT', data, id);
      if (ok) refreshOrders();
    } catch (err: any) {
      console.error("Update order failed:", err.message);
    }
  }, [refreshOrders]);

  const deleteOrder = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('orders', 'DELETE', undefined, id);
      if (ok) refreshOrders();
    } catch (err: any) {
      console.error("Delete order failed:", err.message);
    }
  }, [refreshOrders]);

  const addReview = async (productId: string, rating: number, comment: string) => {
    try {
      if (!user) throw new Error('Must be logged in to review');

      const payload = {
        productId,
        userName: user.full_name || user.name || 'User',
        rating: rating,
        comment: comment
      };

      const response = await fetch(`${STORAGE_WORKER_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save review');

      refreshReviews();

      // Award 5 Aura Points for a review
      if (user) {
        // Points are in user_profiles, handled via profiles PUT in some places, 
        // but let's assume updateUserProfile handles it or we'll need to sync D1
      }
    } catch (err: any) {
      console.error("Add review failed:", err.message);
    }
  };

  const addComment = useCallback(async (mixtapeId: string, text: string) => {
    try {
      const ok = await saveToD1('comments', 'POST', { mixtapeId, text, userId: user?.id });
      if (ok) refreshComments();
    } catch (err: any) {
      console.error("Add comment failed:", err.message);
    }
  }, [user?.id, refreshComments]);

  const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    try {
      const ok = await saveToD1('notifications', 'POST', notif);
      if (ok) refreshNotifications();
    } catch (err: any) {
      console.error("Add notification failed:", err.message);
    }
  }, [refreshNotifications]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      const ok = await saveToD1('notifications', 'PATCH', { read: true }, id);
      if (ok) refreshNotifications();
    } catch (err: any) {
      console.error("Mark read failed:", err.message);
    }
  }, [refreshNotifications]);

  const clearNotifications = useCallback(async () => {
    try {
      const authHeader = await getAuthHeader();
      await fetch(`${STORAGE_WORKER_URL}/api/notifications/clear`, {
        method: 'POST',
        headers: authHeader,
      });
      refreshNotifications();
    } catch (err: any) {
      console.error("Clear notifications failed:", err.message);
    }
  }, [getAuthHeader, refreshNotifications]);

  const incrementMixtapeDownload = useCallback(async (mixtapeId: string) => {
    try {
      await fetch(`${STORAGE_WORKER_URL}/api/mixtapes/${mixtapeId}/download`, { method: 'POST' });
      const newMixtapes = mixtapes.map(m => m.id === mixtapeId ? { ...m, downloads: (m.downloads || 0) + 1 } : m);
      setMixtapes(newMixtapes);
    } catch (err) {
      console.error("Increment download error:", err);
    }
  }, [mixtapes, setMixtapes]);

  const addInstallmentPlan = async (plan: Partial<InstallmentPlan>) => {
    if (!isAdmin) return false;
    const success = await saveToD1('installments', 'POST', plan);
    if (success) refreshInstallments();
    return success;
  };

  const updateInstallmentPlan = async (id: string, data: Partial<InstallmentPlan>) => {
    if (!isAdmin) return false;
    const success = await saveToD1('installments', 'PATCH', data, id);
    if (success) refreshInstallments();
    return success;
  };

  const deleteInstallmentPlan = async (id: string) => {
    if (!isAdmin) return false;
    const success = await saveToD1('installments', 'DELETE', undefined, id);
    if (success) refreshInstallments();
    return success;
  };

  const payInstallment = async (planId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${STORAGE_WORKER_URL}/api/installments/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();
      if (data.success && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return true;
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      console.error("Pay installment failed:", err.message);
      alert(err.message || "Payment failed to initialize");
      return false;
    }
  };

  const isInWishlist = useCallback((targetId: string) => {
    return wishlist.some(item => item.targetId === targetId);
  }, [wishlist]);

  const toggleWishlist = useCallback(async (targetId: string, targetType: string = 'product') => {
    if (!user) {
      alert("Please login to use wishlist");
      return { success: false, message: 'Auth required' };
    }
    
    try {
      const existing = wishlist.find(item => item.targetId === targetId);
      
      if (existing) {
        // Remove from wishlist
        await saveToD1('user/wishlist', 'DELETE', {}, existing.id);
        const remaining = wishlist.filter(item => item.id !== existing.id);
        setWishlist(remaining);
        return { success: true, message: 'Removed from wishlist' };
      } else {
        // Add to wishlist
        const newItem: WishlistItem = {
          id: `wish_${Date.now()}`,
          userId: user.id,
          targetId,
          targetType: targetType as 'product' | 'mixtape' | 'track',
          createdAt: new Date().toISOString()
        };
        const ok = await saveToD1('user/wishlist', 'POST', {
          id: newItem.id,
          user_id: user.id,
          target_id: targetId,
          target_type: targetType
        });
        if (ok) {
          setWishlist(prev => [newItem, ...prev]);
          return { success: true, message: 'Saved to wishlist!' };
        }
        return { success: false, message: 'Failed to save to database' };
      }
    } catch (err: any) {
      console.error("Wishlist error:", err);
      return { success: false, message: 'Failed to update wishlist.' };
    }
  }, [user, wishlist, isInWishlist]);

  const requestSync = useCallback(async () => {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${STORAGE_WORKER_URL}/api/verification/request-sync`, {
        method: 'POST',
        headers: authHeader
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }, [getAuthHeader]);

  const verifyOtp = useCallback(async (code: string) => {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${STORAGE_WORKER_URL}/api/verification/verify-otp`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success && updateUserProfile) {
        updateUserProfile({ isVerified: true, verificationStatus: 'verified' });
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }, [getAuthHeader, updateUserProfile]);

  const requestBadge = useCallback(async (badgeType: string, notes?: string) => {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${STORAGE_WORKER_URL}/api/verification/request-badge`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeType, notes })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }, [getAuthHeader]);

  const resolveDispute = useCallback(async (dealId: string, resolution: 'release_to_seller' | 'refund_to_buyer') => {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/escrow/resolve-dispute`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, resolution })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }, [getAuthHeader]);

  const value = useMemo(() => ({
    siteConfig,
    products,
    mixtapes,
    bookings,
    sessionTypes,
    youtubeVideos,
    poolTracks,
    poolPagination,
    genres,
    studioEquipment,
    studioGear: studioEquipment, // Alias for component compatibility
    shippingZones,
    subscribers,
    subscriptions,
    subscriptionPlans,
    studioRooms,
    studioLocations: studioRooms, // Alias for component compatibility
    maintenanceLogs,
    orders,
    newsletterCampaigns,
    newsletterSegments,
    coupons,
    referralStats,
    referralLogs,
    users,
    contactMessages,
    payments,
    tips,
    scannedTracks,
    scannedLoading: scannedLoading || false,
    telegramConfig,
    telegramChannels,
    telegramMappings,
    telegramUsers,
    telegramLogs,
    referralSettings,
    reviews,
    comments,
    mixtapesLoading: mixtapesLoading || false,
    poolLoading: poolLoading || false,
    productsLoading: productsLoading || false,
    ordersLoading: ordersLoading || false,
    usersLoading: usersLoading || false,
    subscriptionsLoading: subscriptionsLoading || false,
    bookingsLoading: bookingsLoading || false,
    subscribersLoading: subscribersLoading || false,
    campaignsLoading: campaignsLoading || false,
    paymentsLoading: paymentsLoading || false,
    tipsLoading: tipsLoading || false,
    notifications,
    notificationsLoading: notificationsLoading || false,
    syncNotifications,
    syncNotificationsLoading: syncNotificationsLoading || false,
    addNotification,
    studioEquipmentLoading: equipmentLoading || false,
    studioGearLoading: equipmentLoading || false, // Alias
    studioRoomsLoading: studioRoomsLoading || false,
    studioLocationsLoading: studioRoomsLoading || false, // Alias
    maintenanceLogsLoading: maintenanceLogsLoading || false,
    sessionTypesLoading: sessionTypesLoading || false,
    reviewsLoading,
    commentsLoading,
    mixtapesError: mixtapesError || null,
    poolError: poolError || null,
    productsError: productsError || null,
    ordersError: ordersError || null,
    usersError: usersError || null,
    subscriptionsError: subscriptionsError || null,
    bookingsError: bookingsError || null,
    eventGigs,
    installmentPlans,
    installmentPayments,
    studioSessionsLoading: studioSessionsLoading || false,
    eventGigsLoading: eventGigsLoading || false,
    installmentsLoading: installmentsLoading || false,
    chatSessions,
    chatSessionsLoading: chatSessionsLoading || false,
    storeSettings,
    storeSettingsLoading,
    wishlist,
    wishlistLoading,
    hasQuotaExceeded: false,
    uploadTrackList,
    downloadTrackList,

    seedDatabase,
    updateSiteConfig,
    updateStoreSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    addMixtape,
    updateMixtape,
    deleteMixtape,
    addPoolTrack,
    bulkAddPoolTracks,
    updatePoolTrack,
    deletePoolTrack,
    loadMorePoolTracks,
    deployPoolToStorefront,
    updateGenre,
    addBooking,
    updateBooking,
    updateBookingStatus,
    addSessionType,
    updateSessionType,
    deleteSessionType,
    addVideo,
    deleteVideo,
    applyReferralCode,
    updateReferralSettings,
    issueReferralReward,
    addStudioEquipment,
    updateStudioEquipment,
    deleteStudioEquipment,
    addSubscription,
    updateSubscription,
    addSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    grantSubscription,
    revokeSubscription,
    addStudioRoom,
    updateStudioRoom,
    deleteStudioRoom,
    addMaintenanceLog,
    deleteMaintenanceLog,
    addPayment,
    addTip,
    addOrder,
    updateOrder,
    deleteOrder,
    addCampaign,
    updateCampaign,
    refreshNotifications,
    refreshSyncNotifications,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    updateTelegramConfig,
    addTelegramChannel,
    updateTelegramChannel,
    deleteTelegramChannel,
    addInstallmentPlan,
    updateInstallmentPlan,
    deleteInstallmentPlan,
    payInstallment,
    updateShippingZone,
    addSubscriber,
    updateUser,
    removeUser,
    addContactMessage,
    updateContactMessage,
    deleteMessage,
    addReview,
    addComment,
    toggleWishlist,
    isInWishlist,
    markNotificationAsRead,
    clearNotifications,
    incrementMixtapeDownload,
    isFirstTimeSubscriber,
    sendEmail,
    broadcastEmail,
    sendNewsletterConfirmation,
    deleteScannedTrack,
    refreshProducts, refreshMixtapes, refreshOrders, refreshUsers, refreshSubscriptions,
    refreshBookings, refreshSubscribers, refreshCampaigns, refreshPayments, refreshTips,
    refreshEquipment, refreshRooms, refreshLogs, refreshSessionTypes,
    refreshStudioSessions, refreshEventGigs, refreshInstallments, refreshChatSessions,
    refreshScannedTracks, refreshPoolTracks, refreshGenres, refreshVideos, refreshPlans, refreshZones, refreshExpiringUsers,
    refreshReferrals,
    refreshTelegramChannels,
    refreshContactMessages,
    refreshReviews,
    refreshComments,
    refreshAdminStats,

    // Trust & Identity
    requestSync,
    verifyOtp,
    requestBadge,
    resolveDispute,
    messages: contactMessages
  }), [
    siteConfig, products, mixtapes, bookings, sessionTypes, youtubeVideos, poolTracks, poolPagination, genres, studioEquipment, shippingZones, subscribers, subscriptions, orders, newsletterCampaigns, newsletterSegments,
    subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users, referralLogs, contactMessages, scannedTracks,
    notifications, notificationsLoading, syncNotifications, syncNotificationsLoading, payments, tips, reviews, comments,
    adminStats, adminStatsLoading, refreshAdminStats, expiringUsers, expiringUsersLoading, refreshExpiringUsers,
    telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
    mixtapesLoading, productsLoading, ordersLoading, usersLoading, subscriptionsLoading, bookingsLoading, subscribersLoading, campaignsLoading, paymentsLoading, tipsLoading,
    equipmentLoading, studioRoomsLoading, maintenanceLogsLoading, sessionTypesLoading, reviewsLoading, commentsLoading,
    poolError, mixtapesError, productsError, ordersError, usersError, subscriptionsError, bookingsError,
    studioSessions, eventGigs, studioSessionsLoading, eventGigsLoading,
    installmentPlans, installmentPayments, installmentsLoading,
    wishlist, wishlistLoading, referralSettings,
    toggleWishlist, isInWishlist,
    deleteScannedTrack, refreshProducts, refreshMixtapes, refreshOrders, refreshUsers, refreshSubscriptions,
    refreshBookings, refreshSubscribers, refreshCampaigns, refreshPayments, refreshTips,
    refreshEquipment, refreshRooms, refreshLogs, refreshSessionTypes,
    refreshStudioSessions, refreshEventGigs, refreshInstallments,
    refreshScannedTracks, refreshPoolTracks, refreshGenres, refreshVideos, refreshPlans, refreshZones, refreshCoupons, refreshReferrals, refreshTelegramChannels, refreshContactMessages, refreshReviews, refreshComments
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};


export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
