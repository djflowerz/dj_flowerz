
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Product, Mixtape, Booking, Track, SessionType, SiteConfig, Video, TelegramConfig, TelegramChannel, TelegramMapping, TelegramUser, TelegramLog, StudioEquipment, ShippingZone, NewsletterSubscriber, Genre, Subscription, Order, NewsletterCampaign, NewsletterSegment, SubscriptionPlan, StudioRoom, MaintenanceLog, Coupon, ReferralStats, User, ReferralSettings, ReferralLog, ContactMessage } from '../types';
import { PRODUCTS, FEATURED_MIXTAPES, POOL_TRACKS, YOUTUBE_VIDEOS, INITIAL_STUDIO_EQUIPMENT, INITIAL_SHIPPING_ZONES, MOCK_SUBSCRIBERS, INITIAL_GENRES, SUBSCRIPTION_PLANS } from '../constants';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import { withRetry } from '../utils/supabaseRetry';
import { useSupabaseCollection } from '../hooks/useSupabaseCollection';



// Initial Site Config Data (Fallback only if DB is empty)
const INITIAL_CONFIG: SiteConfig = {
  hero: {
    title: "DJ FLOWERZ",
    subtitle: "Nairobi's Premier DJ. Mixtapes, Music Pool & Merch.",
    ctaText: "Join Music Pool",
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
    featuredMixtapes: { title: "Featured Mixtapes", subtitle: "Listen to the vibe before you subscribe.", ctaText: "View All" },
    musicPool: {
      title: "Unlock The Music Pool",
      description: "Get unlimited access to exclusive DJ edits, remixes, and tools. All plans include Telegram community access.",
      benefits: ['Weekly High-Quality Drops', 'Exclusive Edits & Remixes', 'Intro/Outro Clean Edits', 'Direct Telegram Access'],
      ctaText: "Unlock Access"
    },
    storePromo: { title: "Trending Merch", description: "Fresh drips and exclusive digital packs.", ctaText: "Shop All" },
    studioPromo: { title: "Bookings & Studio Sessions", description: "Need a DJ for your next event or studio time to record your hit? We provide professional services tailored to your needs.", ctaText: "Book Now" },
    tipJar: { title: "Support The Craft", message: "Enjoying the free mixes? Drop a tip to keep the servers running and the music flowing.", ctaText: "Tip Jar" }
  },
  about: {
    title: "The Man Behind The Mix",
    bio: "DJ Flowerz has been dominating the Nairobi club scene for over a decade. Known for his seamless transitions and ability to read any crowd, he has become a staple in the East African entertainment industry.",
    image: "https://images.unsplash.com/photo-1571266028243-371695039148?auto=format&fit=crop&q=80&w=1000",
    careerTimeline: [
      { year: "2015", event: "Started professional DJing in Westlands" },
      { year: "2018", event: "Launched DJ Flowerz Brand & Merch" },
      { year: "2020", event: "Founded the Music Pool Service" }
    ]
  },
  footer: {
    description: "The ultimate destination for exclusive mixtapes, premium music pool access, and official merchandise.",
    copyright: "© 2023 DJ FLOWERZ. All rights reserved."
  },
  legal: {
    terms: "These are the terms of service...",
    privacy: "We value your privacy...",
    refunds: "No refunds on digital items..."
  },
  seo: {
    siteTitle: "DJ FLOWERZ | Premium Music Experience",
    description: "Premium music platform for DJ FLOWERZ featuring mixtapes, music pool, store, and bookings.",
    keywords: "DJ, Nairobi, Music, Mixtapes, Afrobeat, Amapiano",
    ogImage: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04"
  },
  notice: {
    enabled: false,
    title: "Service Interruption",
    message: "Our database is currently experiencing high traffic and has hit its daily usage quota. Some products may not be visible. Please try again later.",
    type: "error"
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
  users: User[];
  contactMessages: ContactMessage[];
  payments: any[];
  tips: any[];

  telegramConfig: TelegramConfig;
  telegramChannels: TelegramChannel[];
  telegramMappings: TelegramMapping[];
  telegramUsers: TelegramUser[];
  telegramLogs: TelegramLog[];
  referralSettings: ReferralSettings;
  mixtapesError: string | null;
  mixtapesLoading: boolean;
  poolError: string | null;
  poolLoading: boolean;
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
  hasQuotaExceeded: boolean;

  // Actions
  seedDatabase: () => Promise<void>;
  updateSiteConfig: (data: Partial<SiteConfig>) => void;

  addProduct: (product: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => void;

  addMixtape: (mixtape: Mixtape) => void;
  updateMixtape: (id: string, data: Partial<Mixtape>) => Promise<void>;
  deleteMixtape: (id: string) => void;

  addPoolTrack: (track: Track) => void;
  updatePoolTrack: (id: string, data: Partial<Track>) => Promise<void>;
  deletePoolTrack: (id: string) => void;
  loadMorePoolTracks: (count?: number) => void;

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

  addStudioRoom: (room: StudioRoom) => void;
  updateStudioRoom: (id: string, data: Partial<StudioRoom>) => void;
  deleteStudioRoom: (id: string) => void;
  addMaintenanceLog: (log: MaintenanceLog) => void;
  updateMaintenanceLog: (id: string, data: Partial<MaintenanceLog>) => void;

  updateOrder: (id: string, data: Partial<Order>) => void;

  addCampaign: (camp: NewsletterCampaign) => void;
  updateCampaign: (id: string, data: Partial<NewsletterCampaign>) => void;

  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (id: string, data: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  validateCoupon: (code: string) => Promise<{ success: boolean; coupon?: Coupon; message?: string }>;

  updateTelegramConfig: (config: Partial<TelegramConfig>) => void;
  addTelegramChannel: (channel: TelegramChannel) => void;
  updateTelegramChannel: (id: string, data: Partial<TelegramChannel>) => void;
  deleteTelegramChannel: (id: string) => void;

  updateShippingZone: (id: string, data: Partial<ShippingZone>) => void;
  addSubscriber: (email: string) => void;

  updateUser: (id: string, data: Partial<User>) => void;
  removeUser: (id: string) => void;
  addContactMessage: (msg: Partial<ContactMessage>) => Promise<void>;
  updateContactMessage: (id: string, data: Partial<ContactMessage>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to prevent hanging Firestore calls
function withTimeout<T>(promise: Promise<T>, ms: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Operation timed out (30s limit reached).")), ms))
  ]);
}

// Label Cleaning Helper (removes (123 tracks) from name)
const cleanLabel = (label: string) => {
  if (!label) return '';
  return label.replace(/\s\(\d+\s*tracks\)/i, '').trim();
};

// Supabase Mapping Helper
const mapSupabaseTrack = (t: any): Track => {
  const versions = (t.versions || []).map((v: any) => ({
    ...v,
    downloadUrl: v.downloadUrl || v.download_url
  }));

  // Robustly handle URLs - prioritizing streamable content
  const previewUrl = t.preview_url || t.previewUrl || (versions.length > 0 ? versions[0].downloadUrl : undefined) || t.audio_url || t.audioUrl;

  return {
    id: t.id,
    artist: t.artist || 'DJ Flowerz',
    title: t.title || 'Untitled Mix',
    genre: cleanLabel(t.genre),
    category: (t.category || []).map(cleanLabel),
    bpm: t.bpm,
    year: t.year,
    versions,
    dateAdded: t.date_added || t.dateAdded || t.created_at,
    previewUrl,
    createdAt: t.created_at,
    updatedAt: t.updated_at
  };
};

// Generic Mapper (for simple tables with just timestamps)
const mapSupabaseGeneric = (item: any): any => ({
  ...item,
  createdAt: item.created_at || item.createdAt,
  updatedAt: item.updated_at || item.updatedAt
});

const mapSupabaseProduct = (p: any): Product => {
  const images = p.images || (p.image ? [p.image] : []);
  const mainImage = p.image || images[0] || '';

  return {
    ...p,
    image: mainImage,
    images: images,
    isActive: p.is_active,
    isHot: p.is_featured,
    compareAtPrice: p.sale_price,
    variantOptions: p.variants || [],
    variants: Array.isArray(p.variants) ? p.variants.map((v: any) => typeof v === 'string' ? v : v.name) : [],
    stock: p.inventory || 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    digitalFileUrl: p.digital_file_url || p.digitalFileUrl || '',
    downloadPassword: p.download_password || p.downloadPassword || '',
    secureDownloadLink: p.secure_download_link || p.secureDownloadLink || '',
  };
};

const mapSupabaseMixtape = (m: any): Mixtape => ({
  ...m,
  coverUrl: m.cover_url,
  audioUrl: m.audio_url,
  duration: m.duration,
  releaseDate: m.release_date,
  previewStartTime: m.preview_start_time,
  allowFullStream: m.allow_full_stream,
  allowDownload: m.allow_download,
  downloadType: m.download_type,
  streamQuality: m.stream_quality,
  isFeatured: m.is_featured,
  showInGallery: m.show_in_gallery,
  showInMusicPool: m.show_in_music_pool,
  enableComments: m.enable_comments,
  requireLoginToComment: m.require_login_to_comment,
  moderateComments: m.moderate_comments,
  downloadUrl: m.download_url,
  videoDownloadUrl: m.video_download_url,
  downloadLimit: m.download_limit,
  downloadExpiryDays: m.download_expiry_days,
  requiredTier: m.required_tier,
  youtubeUrl: m.youtube_url,
  soundcloudUrl: m.soundcloud_url,
  metaTitle: m.meta_title,
  metaDescription: m.meta_description,
  ogImage: m.og_image,
  isExclusive: m.is_exclusive,
  createdAt: m.created_at,
  updatedAt: m.updated_at
});

const mapSupabaseOrder = (o: any): Order => ({
  ...o,
  customerName: o.customer_name || o.customerName,
  customerEmail: o.customer_email || o.customerEmail,
  paymentStatus: o.payment_status || o.paymentStatus,
  referenceCode: o.reference_code || o.referenceCode,
  trackingNumber: o.tracking_number,
  courierName: o.courier_name,
  estimatedArrival: o.estimated_arrival,
  pickupLocation: o.pickup_location,
  receiptUrl: o.receipt_url,
  adminMessage: o.admin_message,
  shippedAt: o.shipped_at,
  deliveryMethod: o.delivery_method,
  requiresShipping: o.requires_shipping,
  subtotal: o.subtotal,
  discountAmount: o.discount_amount,
  shippingCost: o.shipping_cost,
  couponCode: o.coupon_code,
  createdAt: o.created_at,
  updatedAt: o.updated_at
});

const mapSupabaseUser = (u: any): User => ({
  ...u,
  isSubscriber: u.is_subscriber,
  subscriptionPlan: u.subscription_plan,
  subscriptionExpiry: u.subscription_expiry,
  avatarUrl: u.avatar_url,
  referralCode: u.referral_code,
  lastLogin: u.last_login,
  phoneNumber: u.phone_number,
  lastSeen: u.last_seen,
  referredBy: u.referred_by,
  balance: u.balance || 0,
  presenceStatus: u.presence_status,
  createdAt: u.created_at,
  updatedAt: u.updated_at
});

const mapSupabaseSubscription = (s: any): Subscription => ({
  ...s,
  userId: s.user_id,
  userName: s.user_name,
  userEmail: s.user_email,
  planId: s.plan_id,
  startDate: s.start_date,
  expiryDate: s.expiry_date,
  paymentMethod: s.payment_method,
  createdAt: s.created_at,
  updatedAt: s.updated_at
});

const mapSupabaseBooking = (b: any): Booking => ({
  ...b,
  clientName: b.client_name,
  clientEmail: b.client_email,
  clientPhone: b.client_phone,
  serviceType: b.service_type,
  serviceName: b.service_name,
  paymentStatus: b.payment_status,
  createdAt: b.created_at,
  updatedAt: b.updated_at
});

const mapSupabaseSessionType = (s: any): SessionType => ({
  ...s,
  depositRequired: s.deposit_required,
  equipmentIncluded: s.equipment_included,
  createdAt: s.created_at,
  updatedAt: s.updated_at
});

const mapSupabaseStudioRoom = (r: any): StudioRoom => ({
  ...r,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

const mapSupabaseMaintenanceLog = (l: any): MaintenanceLog => ({
  ...l,
  itemId: l.item_id,
  itemName: l.item_name,
  itemType: l.item_type, // item_type in DB?
  createdAt: l.created_at,
  updatedAt: l.updated_at
});

const mapSupabaseCoupon = (c: any): Coupon => ({
  ...c,
  discountType: c.discount_type,
  discountValue: c.discount_value,
  appliesTo: c.applies_to,
  applicablePlans: c.applicable_plans,
  expiryDate: c.expiry_date,
  usageLimit: c.usage_limit,
  usageCount: c.usage_count,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

const mapSupabaseReferralStats = (r: any): ReferralStats => ({
  ...r,
  userId: r.user_id,
  userName: r.user_name,
  referralCode: r.referral_code,
  totalReferrals: r.total_referrals,
  totalEarned: r.total_earned,
  pendingPayout: r.pending_payout,
  createdAt: r.created_at,
});

const mapSupabaseCampaign = (c: any): NewsletterCampaign => ({
  ...c,
  sentDate: c.sent_date,
  recipientCount: c.recipient_count,
  openRate: c.open_rate,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

const mapSupabaseSubscriber = (s: any): NewsletterSubscriber => ({
  ...s,
  dateSubscribed: s.date_subscribed,
  updatedAt: s.updated_at
});

const mapSupabaseChannel = (c: any): TelegramChannel => ({
  ...c,
  channelId: c.channel_id,
  inviteLink: c.invite_link,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

const mapSupabasePlan = (p: any): SubscriptionPlan => ({
  ...p,
  isBestValue: p.is_best_value,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

const mapSupabaseGenre = (g: any): Genre => ({
  ...g,
  coverUrl: g.cover_url,
  createdAt: g.created_at,
  updatedAt: g.updated_at
});

// Helper to fetch collection (Namespaced V8 style)
// Added 'enabled' parameter to conditionally fetch based on rules
// Added 'limit' parameter for pagination to improve performance
const getTableName = (colName: string): string => {
  const mapping: Record<string, string> = {
    'products': 'products',
    'mixtapes': 'mixtapes',
    'sessionTypes': 'session_types',
    'studioEquipment': 'studio_equipment',
    'subscriptionPlans': 'subscription_plans',
    'shippingZones': 'shipping_zones',
    'genres': 'genres',
    'youtubeVideos': 'youtube_videos',
    'orders': 'orders',
    'users': 'profiles',
    'subscriptions': 'subscriptions',
    'bookings': 'bookings',
    'studioRooms': 'studio_rooms',
    'maintenanceLogs': 'maintenance_logs',
    'coupons': 'coupons',
    'referralStats': 'referral_stats',
    'newsletterCampaigns': 'newsletter_campaigns',
    'newsletterSegments': 'newsletter_segments',
    'subscribers': 'newsletter_subscribers',
    'telegramChannels': 'telegram_channels',
    'telegramMappings': 'telegram_mappings',
    'telegramUsers': 'telegram_users',
    'telegramLogs': 'telegram_logs',
    'poolTracks': 'pool_tracks',
    'payments': 'payments',
    'tips': 'tips'
  };
  return mapping[colName] || colName;
};

const useCollection = <T extends { id: string }>(
  colName: string,
  initialData: T[],
  enabled: boolean = true,
  transform?: (data: any) => T,
  limit?: number,
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'desc',
  isRealtime: boolean = true
) => {
  const tableName = getTableName(colName);

  // Map common field names
  const sbOrderBy = orderByField === 'createdAt' ? 'created_at' :
    orderByField === 'updatedAt' ? 'updated_at' :
      orderByField === 'dateSubscribed' ? 'date_subscribed' :
        orderByField === 'startDate' ? 'start_date' :
          orderByField;

  const [data, setData, isLoading, error, refresh] = useSupabaseCollection<T>(
    tableName,
    initialData,
    enabled,
    transform,
    sbOrderBy,
    orderDirection,
    isRealtime,
    limit
  );

  const loadMore = () => {
    console.warn("loadMore not implemented for Supabase yet");
  };

  return [data, setData, isLoading, loadMore, error, refresh] as const;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasQuotaExceeded, setHasQuotaExceeded] = useState(false);

  // Determine roles for conditional fetching
  const isAdmin = user?.role === 'admin';
  const isSubscriber = user?.isSubscriber || isAdmin;

  // -- REALTIME DATA SUBSCRIPTIONS --

  // Site Config (Supabase)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase.from('settings').select('data').eq('id', 'siteConfig').single();
      if (data) {
        setSiteConfig(data.data as SiteConfig);
      } else if (error && error.code !== 'PGRST116') {
        console.warn("Supabase fetch error for siteConfig:", error.message);
      }
    };

    fetchConfig();

    // subscribe to changes
    const channel = supabase
      .channel('public:settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.siteConfig' }, (payload) => {
        if (payload.new && (payload.new as any).data) {
          setSiteConfig((payload.new as any).data as SiteConfig);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Public Collections (Supabase)
  const [products, , productsLoading, , productsError, refreshProducts] = useCollection<Product>('products', PRODUCTS, true, mapSupabaseProduct, 200, 'createdAt', 'desc', true);
  const [mixtapes, , mixtapesLoading, , mixtapesError, refreshMixtapes] = useCollection<Mixtape>('mixtapes', FEATURED_MIXTAPES, true, mapSupabaseMixtape, 200, 'createdAt', 'desc', true);
  const [sessionTypes, , sessionTypesLoading, , , refreshSessionTypes] = useCollection<SessionType>('sessionTypes', [], true, mapSupabaseSessionType, undefined, 'createdAt', 'desc', true);
  const [studioEquipment, , equipmentLoading, , , refreshEquipment] = useCollection<StudioEquipment>('studioEquipment', INITIAL_STUDIO_EQUIPMENT, true, mapSupabaseGeneric, undefined, 'createdAt', 'desc', true);
  const [subscriptionPlans, , plansLoading, , , refreshPlans] = useCollection<SubscriptionPlan>('subscriptionPlans', SUBSCRIPTION_PLANS, true, mapSupabasePlan, undefined, 'price', 'asc', true);
  const [shippingZones, , zonesLoading, , , refreshZones] = useCollection<ShippingZone>('shippingZones', INITIAL_SHIPPING_ZONES, true, mapSupabaseGeneric, undefined, 'createdAt', 'desc', true);
  const [genres, , genresLoading, , , refreshGenres] = useCollection<Genre>('genres', INITIAL_GENRES, true, mapSupabaseGenre, undefined, 'createdAt', 'desc', true);
  const [youtubeVideos, , videosLoading, , , refreshVideos] = useCollection<Video>('youtubeVideos', [], true, mapSupabaseGeneric, undefined, 'createdAt', 'desc', true);


  // Restricted Collections (Subscriber/Admin) - Supabase handles large music pool library
  const [poolTracks, setPoolTracks] = useState<Track[]>([]);
  const [poolLimit, setPoolLimit] = useState(60000); // Load all tracks (up to 60k)
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);

  const fetchPoolTracks = async (limit: number) => {
    // We allow everyone to see the tracks list (public read access via Supabase RLS assumed)
    setPoolLoading(true);
    try {
      // Direct Supabase call instead of API to avoid token issues and simplify
      const { data, error } = await supabase
        .from('pool_tracks')
        .select('*')
        .order('date_added', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setPoolTracks((data || []).map(mapSupabaseTrack));
      setPoolError(null);
    } catch (err: any) {
      console.error("Pool Fetch Error:", err.message);
      setPoolError("Failed to fetch tracks from library.");
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    fetchPoolTracks(poolLimit);
  }, [isSubscriber, isAdmin, poolLimit]);

  const loadMorePoolTracks = (count: number = 1000) => {
    setPoolLimit(prev => prev + count);
  };

  const refreshPoolTracks = () => {
    fetchPoolTracks(poolLimit);
  };

  // Admin Only Collections (Supabase)
  const [orders, , ordersLoading, , ordersError, refreshOrders] = useCollection<Order>('orders', [], isAdmin, mapSupabaseOrder, 500, 'createdAt', 'desc', true);
  const [users, , usersLoading, , usersError, refreshUsers] = useCollection<User>('profiles', [], isAdmin, mapSupabaseUser, 500, 'createdAt', 'desc', true);
  const [subscriptions, , subscriptionsLoading, , subscriptionsError, refreshSubscriptions] = useCollection<Subscription>('subscriptions', [], isAdmin, mapSupabaseSubscription, 500, 'startDate', 'desc', true);
  const [bookings, , bookingsLoading, , bookingsError, refreshBookings] = useCollection<Booking>('bookings', [], isAdmin, mapSupabaseBooking, 200, 'createdAt', 'desc', true);

  const [studioRooms, , studioRoomsLoading, , , refreshRooms] = useCollection<StudioRoom>('studio_rooms', [], isAdmin, mapSupabaseStudioRoom, undefined, 'createdAt', 'desc', true);
  const [maintenanceLogs, , maintenanceLogsLoading, , , refreshLogs] = useCollection<MaintenanceLog>('maintenance_logs', [], isAdmin, mapSupabaseMaintenanceLog, 100, 'createdAt', 'desc', true);
  const [coupons, , couponsLoading, , , refreshCoupons] = useCollection<Coupon>('coupons', [], isAdmin, mapSupabaseCoupon, undefined, 'createdAt', 'desc', true);
  const [referralStats, , referralStatsLoading, , , refreshReferrals] = useCollection<ReferralStats>('referral_stats', [], isAdmin, mapSupabaseReferralStats, 200, 'createdAt', 'desc', true);
  const [newsletterCampaigns, , campaignsLoading, , , refreshCampaigns] = useCollection<NewsletterCampaign>('newsletter_campaigns', [], isAdmin, mapSupabaseCampaign, 50, 'createdAt', 'desc', true);
  const [newsletterSegments, , segmentsLoading, , , refreshSegments] = useCollection<NewsletterSegment>('newsletter_segments', [], isAdmin, mapSupabaseGeneric, 50, 'createdAt', 'desc', true);
  const [subscribers, , subscribersLoading, , , refreshSubscribers] = useCollection<NewsletterSubscriber>('newsletter_subscribers', [], isAdmin, mapSupabaseSubscriber, 500, 'date_subscribed', 'desc', true);
  const [telegramChannels, , tgChannelsLoading, , , refreshTelegramChannels] = useCollection<TelegramChannel>('telegram_channels', [], isAdmin, mapSupabaseChannel, undefined, 'createdAt', 'desc', true);
  const [payments, , paymentsLoading, , , refreshPayments] = useCollection<any>('payments', [], isAdmin, (p) => ({ ...p, createdAt: p.created_at }), 200, 'created_at', 'desc', true);
  const [tips, , tipsLoading, , , refreshTips] = useCollection<any>('tips', [], isAdmin, (t) => ({ ...t, createdAt: t.created_at }), 200, 'created_at', 'desc', true);
  const [telegramMappings] = useCollection<TelegramMapping>('telegram_mappings', [], isAdmin, mapSupabaseGeneric, 200, 'createdAt', 'desc', true);
  const [telegramUsers] = useCollection<TelegramUser>('telegram_users', [], isAdmin, mapSupabaseGeneric, 500, 'createdAt', 'desc', true);
  const [telegramLogs] = useCollection<TelegramLog>('telegram_logs', [], isAdmin, mapSupabaseGeneric, 200, 'timestamp', 'desc', true);
  const [contactMessages, , messagesLoading, , , refreshContactMessages] = useCollection<ContactMessage>('contact_messages', [], isAdmin, mapSupabaseGeneric, 200, 'createdAt', 'desc', true);

  // Telegram (Admin) - Non-realtime
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({ botToken: '', botUsername: '', status: 'Disconnected' });

  // Fetch Telegram Config (Single Doc from Supabase)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchTgConfig = async () => {
      const { data } = await supabase.from('telegram_config').select('*').eq('id', 'main').single();
      if (data) {
        setTelegramConfig({
          botToken: data.bot_token || '',
          botUsername: data.bot_username || '',
          status: data.status || 'Disconnected'
        });
      }
    };

    fetchTgConfig();

    const channel = supabase
      .channel('public:telegram_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'telegram_config', filter: 'id=eq.main' }, (payload) => {
        if (payload.new) {
          const newItem = payload.new as any;
          setTelegramConfig({
            botToken: newItem.bot_token || '',
            botUsername: newItem.bot_username || '',
            status: newItem.status || 'Disconnected'
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const [referralSettings, setReferralSettings] = useState<ReferralSettings>({
    newUserDiscount: 10,
    referrerRewardAmount: 500,
    rewardType: 'flat',
    enabled: true
  });
  const [referralLogs, setReferralLogs] = useState<ReferralLog[]>([]);

  const fetchRefSettings = async () => {
    const { data } = await supabase.from('settings').select('data').eq('id', 'referralSettings').single();
    if (data && data.data) {
      setReferralSettings(data.data as ReferralSettings);
    }
  };

  const fetchReferralLogs = async () => {
    const { data } = await supabase.from('referral_logs').select('*').order('created_at', { ascending: false });
    if (data) setReferralLogs(data.map(l => ({
      id: l.id,
      referrerId: l.referrer_id,
      refereeId: l.referee_id,
      referrerName: l.referrer_name,
      refereeName: l.referee_name,
      planPurchased: l.plan_purchased,
      discountApplied: l.discount_applied,
      rewardIssued: l.reward_issued,
      createdAt: l.created_at,
      status: l.status
    })));
  };

  useEffect(() => {
    fetchRefSettings();
    fetchReferralLogs();

    const channel = supabase
      .channel('public:referral_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.referralSettings' }, (payload) => {
        if (payload.new && (payload.new as any).data) {
          setReferralSettings((payload.new as any).data as ReferralSettings);
        }
      })
      .subscribe();

    const logsChannel = supabase
      .channel('public:referral_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_logs' }, () => {
        fetchReferralLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(logsChannel);
    };
  }, []);


  // --- ACTIONS (Write to Supabase) ---

  const updateReferralSettings = async (settings: Partial<ReferralSettings>) => {
    const newSettings = { ...referralSettings, ...settings };
    const { error } = await supabase.from('settings').upsert({ id: 'referralSettings', data: newSettings, updated_at: new Date().toISOString() });
    if (error) throw error;
    setReferralSettings(newSettings);
  };

  const applyReferralCode = async (code: string) => {
    if (!referralSettings.enabled) return { success: false, message: 'Referral system is currently disabled.' };

    const { data: profile, error } = await supabase.from('profiles')
      .select('id, name')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (error || !profile) return { success: false, message: 'Invalid referral code.' };
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
  };

  const issueReferralReward = async (log: ReferralLog) => {
    // Determine reward amount
    const rewardAmount = referralSettings.referrerRewardAmount;

    try {
      const { error } = await supabase.rpc('issue_referral_reward', {
        referrer_id: log.referrerId,
        referee_id: log.refereeId,
        referrer_name: log.referrerName,
        referee_name: log.refereeName,
        plan_purchased: log.planPurchased,
        discount_applied: log.discountApplied,
        reward_amount: rewardAmount
      });

      if (error) {
        console.error('Error issuing referral reward:', error);
        throw error;
      }

      // No need to fetch logs here as this is usually run by the referee, not the referrer.
      // The referrer will see updated data next time they refresh.
    } catch (err) {
      console.error('Failed to issue referral reward via RPC:', err);
      // Fallback or retry logic could go here, but RPC is the primary method now.
      throw err;
    }
  };

  const seedDatabase = async () => {
    if (!user?.isAdmin) {
      alert("Admin privileges required to seed database.");
      return;
    }

    try {
      const now = new Date().toISOString();

      // Seed Supabase
      await supabase.from('products').upsert(PRODUCTS.map(p => ({
        id: p.id, name: p.name, price: p.price, type: p.type, images: p.images, inventory: p.inventory || p.stock || 0, is_active: p.isActive, updated_at: now
      })));

      await supabase.from('mixtapes').upsert(FEATURED_MIXTAPES.map(m => ({
        id: m.id, title: m.title, slug: m.slug, genre: m.genre, description: m.description, release_date: m.releaseDate, cover_url: m.coverUrl, audio_url: m.audioUrl, tracklist: m.tracklist, updated_at: now
      })));

      await supabase.from('studio_equipment').upsert(INITIAL_STUDIO_EQUIPMENT.map(e => ({
        id: e.id, name: e.name, category: e.category, image: e.image, description: e.description, status: e.status, updated_at: now
      })));

      await supabase.from('subscription_plans').upsert(SUBSCRIPTION_PLANS.map(p => ({
        id: p.id, name: p.name, price: p.price, period: p.period, features: p.features, active: true, updated_at: now
      })));

      await supabase.from('shipping_zones').upsert(INITIAL_SHIPPING_ZONES.map(z => ({
        id: z.id, name: z.name, description: z.description, rates: z.rates, updated_at: now
      })));

      await supabase.from('genres').upsert(INITIAL_GENRES.map(g => ({
        id: g.id, name: g.name, cover_url: g.coverUrl, updated_at: now
      })));

      await supabase.from('settings').upsert({ id: 'siteConfig', data: INITIAL_CONFIG, updated_at: now });
      console.log("Database Seeded Successfully!");
      alert("Database has been connected and seeded with initial data!");
    } catch (e: any) {
      console.error("Error seeding database:", e);
      alert("Error seeding database: " + e.message);
    }
  };

  const updateSiteConfig = async (config: SiteConfig) => {
    setSiteConfig(config);
    const { error: sbError } = await supabase.from('settings').upsert({
      id: 'siteConfig',
      data: config,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
  };

  const addProduct = async (product: Product) => {
    const { id, ...rest } = product;
    const finalId = id || `p${Date.now()}`;
    const finalImages = (rest.images && rest.images.length > 0) ? rest.images : (rest.image ? [rest.image] : []);
    const mainImage = rest.image || (finalImages.length > 0 ? finalImages[0] : '');

    const { error: sbError } = await supabase
      .from('products')
      .upsert({
        id: finalId,
        name: rest.name,
        slug: rest.slug,
        type: rest.type,
        price: rest.price,
        sale_price: rest.compareAtPrice,
        description: rest.description,
        image: mainImage,
        images: finalImages,
        category: rest.category,
        inventory: rest.inventory || rest.stock || 0,
        variants: rest.variantOptions,
        is_featured: rest.isHot || false,
        is_active: rest.isActive !== undefined ? rest.isActive : true,
        digital_file_url: rest.digitalFileUrl || '',
        download_password: rest.downloadPassword || '',
        status: rest.status || 'published',
        updated_at: new Date().toISOString()
      });

    if (sbError) throw sbError;
    refreshProducts();
  };
  const updateProduct = async (id: string, data: Partial<Product>) => {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.description) updateData.description = data.description;
    if (data.shortDescription) updateData.short_description = data.shortDescription;
    if (data.category) updateData.category = data.category;
    if (data.status) updateData.status = data.status;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.isHot !== undefined) updateData.is_featured = data.isHot;
    if (data.image) updateData.image = data.image;
    if (data.images) updateData.images = data.images;
    if (data.stock !== undefined) updateData.inventory = data.stock;
    if (data.inventory !== undefined) updateData.inventory = data.inventory;
    if (data.type) updateData.type = data.type;
    if (data.os) updateData.os = data.os;
    if (data.weight) updateData.weight = data.weight;
    if (data.dimensions) updateData.dimensions = data.dimensions;
    if (data.sku) updateData.sku = data.sku;
    if (data.requiresShipping !== undefined) updateData.requires_shipping = data.requiresShipping;
    if (data.digitalFileUrl) updateData.digital_file_url = data.digitalFileUrl;
    if (data.downloadPassword) updateData.download_password = data.downloadPassword;
    if (data.visibility) updateData.visibility = data.visibility;
    if (data.isFree !== undefined) updateData.is_free = data.isFree;
    if (data.metaTitle) updateData.meta_title = data.metaTitle;
    if (data.metaDescription) updateData.meta_description = data.metaDescription;

    const { error: sbError } = await supabase.from('products').update(updateData).eq('id', id);
    if (sbError) throw sbError;
    refreshProducts();
  };
  const deleteProduct = async (id: string) => {
    console.log(`Attempting to delete product with ID: ${id}`);
    const { error: sbError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (sbError) throw sbError;

    console.log(`Product ${id} deleted successfully from Supabase`);
    refreshProducts();
  };

  const addMixtape = async (mixtape: Mixtape) => {
    const { id, ...rest } = mixtape;
    const finalId = id || `m${Date.now()}`;
    const { error: sbError } = await supabase
      .from('mixtapes')
      .upsert({
        id: finalId,
        title: rest.title,
        slug: rest.slug,
        genre: rest.genre,
        description: rest.description,
        release_date: rest.releaseDate,
        status: rest.status,
        cover_url: rest.coverUrl,
        audio_url: rest.audioUrl,
        duration: rest.duration,
        preview_start_time: rest.previewStartTime,
        allow_full_stream: rest.allowFullStream,
        allow_download: rest.allowDownload,
        download_type: rest.downloadType,
        stream_quality: rest.streamQuality,
        tracklist: rest.tracklist,
        is_featured: rest.isFeatured,
        show_in_gallery: rest.showInGallery,
        show_in_music_pool: rest.showInMusicPool,
        tags: rest.tags,
        enable_comments: rest.enableComments,
        require_login_to_comment: rest.requireLoginToComment,
        moderate_comments: rest.moderateComments,
        download_url: rest.downloadUrl,
        video_download_url: rest.videoDownloadUrl,
        download_limit: rest.downloadLimit,
        download_expiry_days: rest.downloadExpiryDays,
        required_tier: rest.requiredTier,
        youtube_url: rest.youtubeUrl,
        soundcloud_url: rest.soundcloudUrl,
        meta_title: rest.metaTitle,
        meta_description: rest.metaDescription,
        og_image: rest.ogImage,
        is_exclusive: rest.isExclusive,
        updated_at: new Date().toISOString()
      });

    if (sbError) throw sbError;
    refreshMixtapes();
  };
  const updateMixtape = async (id: string, data: Partial<Mixtape>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.title) updateData.title = data.title;
    if (data.status) updateData.status = data.status;
    if (data.genre) updateData.genre = data.genre;
    if (data.description) updateData.description = data.description;
    if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;
    if (data.allowDownload !== undefined) updateData.allow_download = data.allowDownload;
    if (data.coverUrl) updateData.cover_url = data.coverUrl;
    if (data.audioUrl) updateData.audio_url = data.audioUrl;
    if (data.downloadUrl) updateData.download_url = data.downloadUrl;
    if (data.videoDownloadUrl) updateData.video_download_url = data.videoDownloadUrl;
    if (data.downloadType) updateData.download_type = data.downloadType;
    if (data.isExclusive !== undefined) updateData.is_exclusive = data.isExclusive;
    if (data.duration) updateData.duration = data.duration;
    if (data.releaseDate) updateData.release_date = data.releaseDate;

    const { error: sbError } = await supabase
      .from('mixtapes')
      .update(updateData)
      .eq('id', id);

    if (sbError) throw sbError;
    refreshMixtapes();
  };
  const deleteMixtape = async (id: string) => {
    const { error: sbError } = await supabase
      .from('mixtapes')
      .delete()
      .eq('id', id);

    if (sbError) throw sbError;

    console.log(`Mixtape ${id} deleted successfully from Supabase`);
    refreshMixtapes();
  };

  const addPoolTrack = async (track: Track) => {
    try {
      const { id, ...rest } = track;
      const newTrack = {
        artist: rest.artist,
        title: rest.title,
        genre: rest.genre,
        category: rest.category,
        bpm: rest.bpm,
        year: rest.year,
        versions: rest.versions,
        preview_url: rest.previewUrl,
        date_added: rest.dateAdded || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('pool_tracks').insert(newTrack);

      if (error) throw error;
      refreshPoolTracks();
    } catch (error: any) {
      console.error("Add Error:", error.message);
      throw error;
    }
  };

  const updatePoolTrack = async (id: string, data: Partial<Track>) => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };

      if (data.artist) updateData.artist = data.artist;
      if (data.title) updateData.title = data.title;
      if (data.genre) updateData.genre = data.genre;
      if (data.category) updateData.category = data.category;
      if (data.bpm) updateData.bpm = data.bpm;
      if (data.year) updateData.year = data.year;
      if (data.versions) updateData.versions = data.versions;
      if (data.previewUrl) updateData.preview_url = data.previewUrl;
      if (data.dateAdded) updateData.date_added = data.dateAdded;

      const { error } = await supabase.from('pool_tracks').update(updateData).eq('id', id);

      if (error) throw error;
      refreshPoolTracks();
    } catch (error: any) {
      console.error("Update Error:", error.message);
      throw error;
    }
  };

  const deletePoolTrack = async (id: string) => {
    try {
      const { error } = await supabase.from('pool_tracks').delete().eq('id', id);
      if (error) throw error;
      refreshPoolTracks();
    } catch (err: any) {
      console.error("Delete Error:", err.message);
      throw err;
    }
  };

  const updateGenre = async (id: string, data: Partial<Genre>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.coverUrl) updateData.cover_url = data.coverUrl;

    const { error: sbError } = await supabase.from('genres').update(updateData).eq('id', id);
    if (sbError) throw sbError;
  };

  const addBooking = async (booking: Booking) => {
    const { id, ...rest } = booking;
    const finalId = id || `b${Date.now()}`;
    const { error: sbError } = await supabase.from('bookings').upsert({
      id: finalId,
      client_name: rest.clientName,
      client_email: rest.clientEmail,
      client_phone: rest.clientPhone,
      service_type: rest.serviceType,
      service_name: rest.serviceName,
      date: rest.date,
      time: rest.time,
      duration: rest.duration,
      status: rest.status,
      payment_status: rest.paymentStatus,
      amount: rest.amount,
      budget: rest.budget,
      notes: rest.notes,
      source: rest.source,
      location: rest.location,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshBookings();
  };

  const updateBooking = async (id: string, data: Partial<Booking>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.status) updateData.status = data.status;
    if (data.paymentStatus) updateData.payment_status = data.paymentStatus;
    if (data.date) updateData.date = data.date;
    if (data.time) updateData.time = data.time;

    const { error: sbError } = await supabase.from('bookings').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshBookings();
  };

  const addSessionType = async (session: SessionType) => {
    const { id, ...rest } = session;
    const finalId = id || `st${Date.now()}`;
    const { error: sbError } = await supabase.from('session_types').upsert({
      id: finalId,
      name: rest.name,
      description: rest.description,
      duration: rest.duration,
      price: rest.price,
      deposit_required: rest.depositRequired,
      equipment_included: rest.equipmentIncluded,
      active: rest.active,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshSessionTypes();
  };
  const updateSessionType = async (id: string, data: Partial<SessionType>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.duration) updateData.duration = data.duration;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.depositRequired !== undefined) updateData.deposit_required = data.depositRequired;
    if (data.equipmentIncluded) updateData.equipment_included = data.equipmentIncluded;
    if (data.active !== undefined) updateData.active = data.active;

    const { error: sbError } = await supabase.from('session_types').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshSessionTypes();
  };
  const deleteSessionType = async (id: string) => {
    const { error: sbError } = await supabase.from('session_types').delete().eq('id', id);
    if (sbError) throw sbError;

    refreshSessionTypes();
  };

  const addVideo = async (video: Video) => {
    const { id, ...rest } = video;
    const finalId = id || `v${Date.now()}`;
    const { error: sbError } = await supabase.from('videos').upsert({
      id: finalId,
      title: rest.title,
      thumbnail: rest.thumbnail,
      url: rest.url,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshVideos();
  };
  const deleteVideo = async (id: string) => {
    const { error: sbError } = await supabase.from('videos').delete().eq('id', id);
    if (sbError) throw sbError;
    refreshVideos();
  };

  const addStudioEquipment = async (equipment: StudioEquipment) => {
    const { id, ...rest } = equipment;
    const finalId = id || `eq${Date.now()}`;
    const { error: sbError } = await supabase.from('studio_equipment').upsert({
      id: finalId,
      name: rest.name,
      category: rest.category,
      image: rest.image,
      description: rest.description,
      status: rest.status || 'available',
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshEquipment();
  };

  const updateStudioEquipment = async (id: string, data: Partial<StudioEquipment>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.category) updateData.category = data.category;
    if (data.description) updateData.description = data.description;
    if (data.status) updateData.status = data.status;

    const { error: sbError } = await supabase.from('studio_equipment').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshEquipment();
  };

  const deleteStudioEquipment = async (id: string) => {
    const { error: sbError } = await supabase.from('studio_equipment').delete().eq('id', id);
    if (sbError) throw sbError;

    refreshEquipment();
  };

  const addSubscription = async (sub: Subscription) => {
    const { id, ...rest } = sub;
    const finalId = id || `sub${Date.now()}`;
    const { error: sbError } = await supabase.from('subscriptions').upsert({
      id: finalId,
      user_id: rest.userId,
      user_name: rest.userName,
      plan_id: rest.planId,
      amount: rest.amount,
      start_date: rest.startDate,
      expiry_date: rest.expiryDate,
      status: rest.status,
      payment_method: rest.paymentMethod,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;

    // Sync with User Profile to grant access
    if (rest.status === 'active') {
      const { error: profileError } = await supabase.from('profiles').update({
        is_subscriber: true,
        subscription_plan: rest.planId,
        subscription_expiry: rest.expiryDate
      }).eq('id', rest.userId);

      if (profileError) {
        console.error("Failed to update user profile for subscription:", profileError);
        alert("Subscription added, but failed to update user access. Please update user manually.");
      } else {
        refreshUsers();
      }
    }

    refreshSubscriptions();
  };
  const updateSubscription = async (id: string, data: Partial<Subscription>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.status) updateData.status = data.status;
    if (data.expiryDate) updateData.expiry_date = data.expiryDate;


    const { error: sbError } = await supabase.from('subscriptions').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    // Sync changes to User Profile
    const { data: sub } = await supabase.from('subscriptions').select('user_id').eq('id', id).single();
    if (sub && sub.user_id) {
      const profileUpdate: any = {};

      if (data.status === 'active') {
        profileUpdate.is_subscriber = true;
        if (data.expiryDate) profileUpdate.subscription_expiry = data.expiryDate;
      } else if (data.status) {
        profileUpdate.is_subscriber = false;
        // We don't necessarily clear plan/expiry on expiry, just status
      }

      if (data.expiryDate) {
        profileUpdate.subscription_expiry = data.expiryDate;
      }

      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from('profiles').update(profileUpdate).eq('id', sub.user_id);
        refreshUsers();
      }
    }

    refreshSubscriptions();
  };

  const addSubscriptionPlan = async (plan: SubscriptionPlan) => {
    const docId = plan.id || `plan_${Date.now()}`;
    const { error: sbError } = await supabase.from('subscription_plans').upsert({
      id: docId,
      name: plan.name,
      price: plan.price,
      period: plan.period,
      features: plan.features,
      active: plan.active,
      is_best_value: plan.isBestValue || false,
      link: plan.link,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;

    if (typeof refreshPlans === 'function') refreshPlans();
  };

  const updateSubscriptionPlan = async (id: string, data: Partial<SubscriptionPlan>) => {
    try {
      if (!id) throw new Error("Plan ID is required for update");

      const updateData: any = { updated_at: new Date().toISOString() };
      if (data.name) updateData.name = data.name;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.period) updateData.period = data.period;
      if (data.features) updateData.features = data.features;
      if (data.active !== undefined) updateData.active = data.active;
      if (data.isBestValue !== undefined) updateData.is_best_value = data.isBestValue;
      if (data.link) updateData.link = data.link;

      const { error: sbError } = await supabase.from('subscription_plans').update(updateData).eq('id', id);
      if (sbError) throw sbError;

      if (typeof refreshPlans === 'function') refreshPlans();
    } catch (error: any) {
      console.error("DataContext: Error updating plan:", error);
      throw error;
    }
  };

  const deleteSubscriptionPlan = async (id: string) => {
    try {
      const { error: sbError } = await supabase.from('subscription_plans').delete().eq('id', id);
      if (sbError) throw sbError;

      if (typeof refreshPlans === 'function') refreshPlans();
    } catch (error: any) {
      console.error("DataContext: Error deleting plan:", error);
      throw error;
    }
  };

  const addStudioRoom = async (room: StudioRoom) => {
    const docId = room.id || `rm_${Date.now()}`;
    const { error: sbError } = await supabase.from('studio_rooms').upsert({
      id: docId,
      name: room.name,
      capacity: room.capacity,
      description: room.description,
      status: room.status,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshRooms();
  };
  const updateStudioRoom = async (id: string, data: Partial<StudioRoom>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.capacity) updateData.capacity = data.capacity;
    if (data.description) updateData.description = data.description;
    if (data.status) updateData.status = data.status;

    const { error: sbError } = await supabase.from('studio_rooms').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshRooms();
  };
  const deleteStudioRoom = async (id: string) => {
    const { error: sbError } = await supabase.from('studio_rooms').delete().eq('id', id);
    if (sbError) throw sbError;

    refreshRooms();
  };

  const addMaintenanceLog = async (log: MaintenanceLog) => {
    const docId = log.id || `log_${Date.now()}`;
    const { error: sbError } = await supabase.from('maintenance_logs').upsert({
      id: docId,
      item_id: log.itemId,
      item_name: log.itemName,
      item_type: log.type,
      description: log.description,
      date: log.date,
      status: log.status,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshLogs();
  };
  const updateMaintenanceLog = async (id: string, data: Partial<MaintenanceLog>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.description) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.date) updateData.date = data.date;

    const { error: sbError } = await supabase.from('maintenance_logs').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshLogs();
  };

  const updateOrder = async (id: string, data: Partial<Order>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.status) updateData.status = data.status;
    if (data.paymentStatus) updateData.payment_status = data.paymentStatus;
    if (data.trackingNumber) updateData.tracking_number = data.trackingNumber;
    if (data.courierName) updateData.courier_name = data.courierName;

    const { error: sbError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);

    if (sbError) throw sbError;
    refreshOrders();
  };

  const addCampaign = async (camp: NewsletterCampaign) => {
    const { id, ...rest } = camp;
    const docId = id || `camp_${Date.now()}`;
    const { error: sbError } = await supabase.from('newsletter_campaigns').upsert({
      id: docId,
      name: rest.name,
      subject: rest.subject,
      type: rest.type,
      status: rest.status,
      sent_date: rest.sentDate,
      recipient_count: rest.recipientCount,
      open_rate: rest.openRate,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshCampaigns();
  };
  const updateCampaign = async (id: string, data: Partial<NewsletterCampaign>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.subject) updateData.subject = data.subject;
    if (data.status) updateData.status = data.status;
    if (data.sentDate) updateData.sent_date = data.sentDate;

    const { error: sbError } = await supabase.from('newsletter_campaigns').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshCampaigns();
  };

  const addCoupon = async (coupon: Coupon) => {
    const { id, ...rest } = coupon;
    const docId = id || `cpn_${Date.now()}`;
    const { error: sbError } = await supabase.from('coupons').upsert({
      id: docId,
      code: rest.code,
      discount_type: rest.discountType,
      discount_value: rest.discountValue,
      applies_to: rest.appliesTo,
      applicable_plans: rest.applicablePlans,
      expiry_date: rest.expiryDate,
      usage_limit: rest.usageLimit,
      usage_count: rest.usageCount,
      active: rest.active,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshCoupons();
  };
  const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.code) updateData.code = data.code;
    if (data.discountValue !== undefined) updateData.discount_value = data.discountValue;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.usageCount !== undefined) updateData.usage_count = data.usageCount;

    const { error: sbError } = await supabase.from('coupons').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshCoupons();
  };
  const deleteCoupon = async (id: string) => {
    const { error: sbError } = await supabase.from('coupons').delete().eq('id', id);
    if (sbError) throw sbError;

    refreshCoupons();
  };

  const validateCoupon = async (code: string): Promise<{ success: boolean; coupon?: Coupon; message?: string }> => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .single();

      if (error || !data) {
        return { success: false, message: 'Invalid or expired coupon code.' };
      }

      const coupon = mapSupabaseCoupon(data);
      const now = new Date();
      if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
        return { success: false, message: 'This coupon has expired.' };
      }

      if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
        return { success: false, message: 'This coupon has reached its usage limit.' };
      }

      return { success: true, coupon };
    } catch (err) {
      return { success: false, message: 'Error validating coupon.' };
    }
  };

  const updateTelegramConfig = async (config: Partial<TelegramConfig>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (config.botToken) updateData.bot_token = config.botToken;
    if (config.botUsername) updateData.bot_username = config.botUsername;
    if (config.status) updateData.status = config.status;

    const { error: sbError } = await supabase.from('telegram_config').upsert({
      id: 'main',
      ...updateData
    });
    if (sbError) throw sbError;
  };
  const addTelegramChannel = async (channel: TelegramChannel) => {
    const { id, ...rest } = channel;
    const docId = id || `tg_${Date.now()}`;
    const { error: sbError } = await supabase.from('telegram_channels').upsert({
      id: docId,
      name: rest.name,
      channel_id: rest.channelId,
      genre: rest.genre,
      invite_link: rest.inviteLink,
      active: rest.active,
      updated_at: new Date().toISOString()
    });

    if (sbError) throw sbError;
    refreshTelegramChannels();
  };
  const updateTelegramChannel = async (id: string, data: Partial<TelegramChannel>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.inviteLink) updateData.invite_link = data.inviteLink;

    const { error: sbError } = await supabase.from('telegram_channels').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshTelegramChannels();
  };
  const deleteTelegramChannel = async (id: string) => {
    const { error: sbError } = await supabase.from('telegram_channels').delete().eq('id', id);
    if (sbError) throw sbError;

    refreshTelegramChannels();
  };

  const updateShippingZone = async (id: string, data: Partial<ShippingZone>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.rates) updateData.rates = data.rates;

    const { error: sbError } = await supabase.from('shipping_zones').update(updateData).eq('id', id);
    if (sbError) throw sbError;

    refreshZones();
  };

  const addSubscriber = async (email: string, source: string = 'Manual') => {
    const now = new Date().toISOString();
    const dateSub = now.split('T')[0];

    // Using upsert with onConflict: 'email' to handle duplicates gracefully
    const { error: sbError } = await supabase.from('newsletter_subscribers').upsert({
      email,
      date_subscribed: dateSub,
      status: 'active',
      source: source,
      updated_at: now
    }, { onConflict: 'email' });

    if (sbError) throw sbError;
    refreshSubscribers();
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    const profileData: any = { updated_at: new Date().toISOString() };
    if (data.name) profileData.name = data.name;
    if (data.email) profileData.email = data.email;
    if (data.role) profileData.role = data.role;
    if (data.isSubscriber !== undefined) profileData.is_subscriber = data.isSubscriber;
    if (data.subscriptionPlan) profileData.subscription_plan = data.subscriptionPlan;
    if (data.subscriptionExpiry) profileData.subscription_expiry = data.subscriptionExpiry;
    if (data.avatarUrl) profileData.avatar_url = data.avatarUrl;
    if (data.referralCode) profileData.referral_code = data.referralCode;
    if (data.status) profileData.status = data.status;

    const { error: sbError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', id);

    if (sbError) throw sbError;
    refreshUsers();
  };

  const addContactMessage = async (msg: Partial<ContactMessage>) => {
    const now = new Date().toISOString();
    const { error: sbError } = await supabase.from('contact_messages').insert({
      name: msg.name,
      email: msg.email,
      subject: msg.subject || 'New Message',
      message: msg.message,
      status: msg.status || 'new',
      source: msg.source || 'web',
      user_id: msg.userId,
      created_at: now
    });

    if (sbError) throw sbError;
    refreshContactMessages();
  };

  const updateContactMessage = async (id: string, data: Partial<ContactMessage>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.status) updateData.status = data.status;
    if (data.subject) updateData.subject = data.subject;
    if (data.message) updateData.message = data.message;

    const { error: sbError } = await supabase.from('contact_messages').update(updateData).eq('id', id);
    if (sbError) throw sbError;
    refreshContactMessages();
  };

  const removeUser = async (id: string) => {
    // 1. Delete from profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    // 2. Delete from auth (requires service role key, normally handled by edge function or admin client)
    // Since we are using the service role key client in DataContext (if SUPABASE_SERVICE_ROLE_KEY is provided in env), it might work.
    // However, usually we don't expose service role key to frontend.
    // Let's assume for now we only delete from profiles or the admin uses a specialized client.
    // If we want to truly remove from Auth, we need a server action or edge function.

    refreshUsers();
  };

  const value = useMemo(() => ({
    siteConfig, products, mixtapes, bookings, sessionTypes, youtubeVideos, poolTracks, genres, studioEquipment, shippingZones, subscribers, subscriptions, orders, newsletterCampaigns, newsletterSegments,
    subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users, contactMessages,
    payments, tips,
    telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
    mixtapesLoading, productsLoading, ordersLoading, usersLoading, subscriptionsLoading, bookingsLoading, subscribersLoading, campaignsLoading, paymentsLoading, tipsLoading,
    studioEquipmentLoading: equipmentLoading, studioRoomsLoading, maintenanceLogsLoading, sessionTypesLoading,
    poolError, productsError, mixtapesError, ordersError, usersError, subscriptionsError, bookingsError,
    hasQuotaExceeded,
    seedDatabase,
    updateSiteConfig, addProduct, updateProduct, deleteProduct,
    addMixtape, updateMixtape, deleteMixtape,
    addPoolTrack, updatePoolTrack, deletePoolTrack, loadMorePoolTracks, updateGenre,
    addBooking, updateBooking,
    addSessionType, updateSessionType, deleteSessionType,
    addVideo, deleteVideo,
    addStudioEquipment, updateStudioEquipment, deleteStudioEquipment,
    addSubscription, updateSubscription, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
    addStudioRoom, updateStudioRoom, deleteStudioRoom, addMaintenanceLog, updateMaintenanceLog,
    updateOrder, addCampaign, updateCampaign,
    addCoupon, updateCoupon, deleteCoupon, validateCoupon,
    updateTelegramConfig, addTelegramChannel, updateTelegramChannel, deleteTelegramChannel,
    updateShippingZone, addSubscriber,
    updateUser,
    removeUser,
    addContactMessage,
    updateContactMessage,
    referralSettings,
    updateReferralSettings,
    applyReferralCode,
    issueReferralReward,
    referralLogs
  }), [
    siteConfig, products, mixtapes, bookings, sessionTypes, youtubeVideos, poolTracks, genres, studioEquipment, shippingZones, subscribers, subscriptions, orders, newsletterCampaigns, newsletterSegments,
    subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users, referralLogs, contactMessages,
    payments, tips,
    telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
    mixtapesLoading, productsLoading, ordersLoading, usersLoading, subscriptionsLoading, bookingsLoading, subscribersLoading, campaignsLoading, paymentsLoading, tipsLoading,
    equipmentLoading, studioRoomsLoading, maintenanceLogsLoading, sessionTypesLoading,
    poolError, productsError, mixtapesError, ordersError, usersError, subscriptionsError, bookingsError,
    hasQuotaExceeded,
    // dependencies for functions (they are defined in the component, so they change on every render unless wrapped in useCallback)
    // For now, I'll just include them, but wrapping them in useCallback would be better.
    updateSiteConfig, addProduct, updateProduct, deleteProduct,
    addMixtape, updateMixtape, deleteMixtape,
    addPoolTrack, updatePoolTrack, deletePoolTrack, loadMorePoolTracks, updateGenre,
    addBooking, updateBooking,
    addSessionType, updateSessionType, deleteSessionType,
    addVideo, deleteVideo,
    addStudioEquipment, updateStudioEquipment, deleteStudioEquipment,
    addSubscription, updateSubscription, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
    addStudioRoom, updateStudioRoom, deleteStudioRoom, addMaintenanceLog, updateMaintenanceLog,
    updateOrder, addCampaign, updateCampaign,
    addCoupon, updateCoupon, deleteCoupon,
    updateTelegramConfig, addTelegramChannel, updateTelegramChannel, deleteTelegramChannel,
    updateShippingZone, addSubscriber,
    updateUser,
    removeUser,
    addContactMessage,
    updateContactMessage,
    referralSettings,
    updateReferralSettings,
    applyReferralCode,
    issueReferralReward,
    referralLogs
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
