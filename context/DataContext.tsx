
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Product, Mixtape, Booking, Track, SessionType, SiteConfig, Video, TelegramConfig, TelegramChannel, TelegramMapping, TelegramUser, TelegramLog, StudioEquipment, ShippingZone, NewsletterSubscriber, Genre, Subscription, Order, NewsletterCampaign, NewsletterSegment, SubscriptionPlan, StudioRoom, MaintenanceLog, Coupon, ReferralStats, User, ReferralSettings, ReferralLog, ContactMessage } from '../types';
import { PRODUCTS, FEATURED_MIXTAPES, POOL_TRACKS, YOUTUBE_VIDEOS, INITIAL_STUDIO_EQUIPMENT, INITIAL_SHIPPING_ZONES, MOCK_SUBSCRIBERS, INITIAL_GENRES, SUBSCRIPTION_PLANS } from '../constants';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import { withRetry } from '../utils/supabaseRetry';
import { useSupabaseCollection } from '../hooks/useSupabaseCollection';
import { useR2Collection } from '../hooks/useR2Collection';
import { fetchFromR2, saveToR2 } from '../utils/r2';



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
    message: "Our database is currently experiencing high traffic. Some products may not be visible. Please try again later.",
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

  addOrder: (order: Order) => Promise<void>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<void>;
  addPayment: (payment: any) => Promise<void>;
  addTip: (tip: any) => Promise<void>;

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
    ...t,
    id: t.id,
    artist: t.artist || 'DJ Flowerz',
    title: t.title || 'Untitled Mix',
    genre: cleanLabel(t.genre),
    category: (t.category || []).map(cleanLabel),
    bpm: t.bpm,
    year: t.year,
    versions,
    dateAdded: t.date_added || t.dateAdded || t.created_at || t.createdAt,
    previewUrl,
    createdAt: t.created_at || t.createdAt,
    updatedAt: t.updated_at || t.updatedAt
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
    isActive: p.is_active !== undefined ? p.is_active : (p.isActive !== undefined ? p.isActive : true),
    isHot: p.is_featured !== undefined ? p.is_featured : (p.isHot !== undefined ? p.isHot : false),
    discountPrice: p.discount_price !== undefined ? p.discount_price : p.discountPrice,
    compareAtPrice: p.sale_price !== undefined ? p.sale_price : p.compareAtPrice,
    variantGroups: p.variant_groups || p.variantGroups || [],
    variantOptions: p.variants || p.variantOptions || [],
    variants: Array.isArray(p.variants) ? p.variants.map((v: any) => typeof v === 'string' ? v : v.name) : (Array.isArray(p.variantOptions) ? p.variantOptions : []),
    stock: p.inventory !== undefined ? p.inventory : (p.stock !== undefined ? p.stock : 0),
    createdAt: p.created_at || p.createdAt,
    updatedAt: p.updated_at || p.updatedAt,
    digitalFileUrl: p.digital_file_url || p.digitalFileUrl || '',
    downloadPassword: p.download_password || p.downloadPassword || '',
    secureDownloadLink: p.secure_download_link || p.secureDownloadLink || '',
  };
};

const mapSupabaseMixtape = (m: any): Mixtape => ({
  ...m,
  coverUrl: m.cover_url || m.coverUrl,
  audioUrl: m.audio_url || m.audioUrl,
  duration: m.duration,
  releaseDate: m.release_date || m.releaseDate,
  previewStartTime: m.preview_start_time || m.previewStartTime,
  allowFullStream: m.allow_full_stream !== undefined ? m.allow_full_stream : m.allowFullStream,
  allowDownload: m.allow_download !== undefined ? m.allow_download : m.allowDownload,
  downloadType: m.download_type || m.downloadType,
  streamQuality: m.stream_quality || m.streamQuality,
  isFeatured: m.is_featured !== undefined ? m.is_featured : m.isFeatured,
  showInGallery: m.show_in_gallery !== undefined ? m.show_in_gallery : m.showInGallery,
  showInMusicPool: m.show_in_music_pool !== undefined ? m.show_in_music_pool : m.showInMusicPool,
  enableComments: m.enable_comments !== undefined ? m.enable_comments : m.enableComments,
  requireLoginToComment: m.require_login_to_comment !== undefined ? m.require_login_to_comment : m.requireLoginToComment,
  moderateComments: m.moderate_comments !== undefined ? m.moderate_comments : m.moderateComments,
  downloadUrl: m.download_url || m.downloadUrl,
  videoDownloadUrl: m.video_download_url || m.videoDownloadUrl,
  downloadLimit: m.download_limit !== undefined ? m.download_limit : m.downloadLimit,
  downloadExpiryDays: m.download_expiry_days !== undefined ? m.download_expiry_days : m.downloadExpiryDays,
  requiredTier: m.required_tier || m.requiredTier,
  youtubeUrl: m.youtube_url || m.youtubeUrl,
  soundcloudUrl: m.soundcloud_url || m.soundcloudUrl,
  metaTitle: m.meta_title || m.metaTitle,
  metaDescription: m.meta_description || m.metaDescription,
  ogImage: m.og_image || m.ogImage,
  isExclusive: m.is_exclusive !== undefined ? m.is_exclusive : m.isExclusive,
  createdAt: m.created_at || m.createdAt,
  updatedAt: m.updated_at || m.updatedAt
});

const mapSupabaseOrder = (o: any): Order => ({
  ...o,
  customerName: o.customer_name || o.customerName,
  customerEmail: o.customer_email || o.customerEmail,
  paymentStatus: o.payment_status || o.paymentStatus,
  referenceCode: o.reference_code || o.referenceCode,
  trackingNumber: o.tracking_number || o.trackingNumber,
  courierName: o.courier_name || o.courierName,
  estimatedArrival: o.estimated_arrival || o.estimatedArrival,
  pickupLocation: o.pickup_location || o.pickupLocation,
  receiptUrl: o.receipt_url || o.receiptUrl,
  adminMessage: o.admin_message || o.adminMessage,
  shippedAt: o.shipped_at || o.shippedAt,
  deliveryMethod: o.delivery_method || o.deliveryMethod,
  requiresShipping: o.requires_shipping !== undefined ? o.requires_shipping : o.requiresShipping,
  subtotal: o.subtotal !== undefined ? o.subtotal : o.subtotal,
  discountAmount: o.discount_amount !== undefined ? o.discount_amount : o.discountAmount,
  shippingCost: o.shipping_cost !== undefined ? o.shipping_cost : o.shippingCost,
  couponCode: o.coupon_code || o.couponCode,
  createdAt: o.created_at || o.createdAt,
  updatedAt: o.updated_at || o.updatedAt
});

const mapSupabaseUser = (u: any): User => ({
  ...u,
  isSubscriber: u.is_subscriber !== undefined ? u.is_subscriber : u.isSubscriber,
  subscriptionPlan: u.subscription_plan || u.subscriptionPlan,
  subscriptionExpiry: u.subscription_expiry || u.subscriptionExpiry,
  avatarUrl: u.avatar_url || u.avatarUrl,
  referralCode: u.referral_code || u.referralCode,
  lastLogin: u.last_login || u.lastLogin,
  phoneNumber: u.phone_number || u.phoneNumber,
  lastSeen: u.last_seen || u.lastSeen,
  referredBy: u.referred_by || u.referredBy,
  balance: u.balance !== undefined ? u.balance : (u.balance || 0),
  presenceStatus: u.presence_status || u.presenceStatus,
  createdAt: u.created_at || u.createdAt,
  updatedAt: u.updated_at || u.updatedAt
});

const mapSupabaseSubscription = (s: any): Subscription => ({
  ...s,
  userId: s.user_id || s.userId,
  userName: s.user_name || s.userName,
  userEmail: s.user_email || s.userEmail,
  planId: s.plan_id || s.planId,
  startDate: s.start_date || s.startDate,
  expiryDate: s.expiry_date || s.expiryDate,
  paymentMethod: s.payment_method || s.paymentMethod,
  createdAt: s.created_at || s.createdAt,
  updatedAt: s.updated_at || s.updatedAt
});

const mapSupabaseBooking = (b: any): Booking => ({
  ...b,
  clientName: b.client_name || b.clientName,
  clientEmail: b.client_email || b.clientEmail,
  clientPhone: b.client_phone || b.clientPhone,
  serviceType: b.service_type || b.serviceType,
  serviceName: b.service_name || b.serviceName,
  paymentStatus: b.payment_status || b.paymentStatus,
  createdAt: b.created_at || b.createdAt,
  updatedAt: b.updated_at || b.updatedAt
});

const mapSupabaseSessionType = (s: any): SessionType => ({
  ...s,
  depositRequired: s.deposit_required !== undefined ? s.deposit_required : s.depositRequired,
  equipmentIncluded: s.equipment_included !== undefined ? s.equipment_included : s.equipmentIncluded,
  createdAt: s.created_at || s.createdAt,
  updatedAt: s.updated_at || s.updatedAt
});

const mapSupabaseStudioRoom = (r: any): StudioRoom => ({
  ...r,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

const mapSupabaseMaintenanceLog = (l: any): MaintenanceLog => ({
  ...l,
  itemId: l.item_id || l.itemId,
  itemName: l.item_name || l.itemName,
  itemType: l.item_type || l.itemType,
  createdAt: l.created_at || l.createdAt,
  updatedAt: l.updated_at || l.updatedAt
});

const mapSupabaseCoupon = (c: any): Coupon => ({
  ...c,
  discountType: c.discount_type || c.discountType,
  discountValue: c.discount_value !== undefined ? c.discount_value : c.discountValue,
  appliesTo: c.applies_to || c.appliesTo,
  applicablePlans: c.applicable_plans || c.applicablePlans,
  expiryDate: c.expiry_date || c.expiryDate,
  usageLimit: c.usage_limit !== undefined ? c.usage_limit : c.usageLimit,
  usageCount: c.usage_count !== undefined ? c.usage_count : (c.usageCount || 0),
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

const mapSupabaseReferralStats = (r: any): ReferralStats => ({
  ...r,
  userId: r.user_id || r.userId,
  userName: r.user_name || r.userName,
  referralCode: r.referral_code || r.referralCode,
  totalReferrals: r.total_referrals !== undefined ? r.total_referrals : (r.totalReferrals || 0),
  totalEarned: r.total_earned !== undefined ? r.total_earned : (r.totalEarned || 0),
  pendingPayout: r.pending_payout !== undefined ? r.pending_payout : (r.pendingPayout || 0),
  createdAt: r.created_at || r.createdAt,
});

const mapSupabaseCampaign = (c: any): NewsletterCampaign => ({
  ...c,
  sentDate: c.sent_date || c.sentDate,
  recipientCount: c.recipient_count !== undefined ? c.recipient_count : c.recipientCount,
  openRate: c.open_rate !== undefined ? c.open_rate : c.openRate,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

const mapSupabaseSubscriber = (s: any): NewsletterSubscriber => ({
  ...s,
  dateSubscribed: s.date_subscribed || s.dateSubscribed,
  updatedAt: s.updated_at || s.updatedAt
});

const mapSupabaseChannel = (c: any): TelegramChannel => ({
  ...c,
  channelId: c.channel_id || c.channelId,
  inviteLink: c.invite_link || c.inviteLink,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

const mapSupabasePlan = (p: any): SubscriptionPlan => ({
  ...p,
  isBestValue: p.is_best_value !== undefined ? p.is_best_value : p.isBestValue,
  createdAt: p.created_at || p.createdAt,
  updatedAt: p.updated_at || p.updatedAt
});

const mapSupabaseGenre = (g: any): Genre => ({
  ...g,
  coverUrl: g.cover_url || g.coverUrl,
  createdAt: g.created_at || g.createdAt,
  updatedAt: g.updated_at || g.updatedAt
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
    'youtubeVideos': 'videos',
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

const SUPABASE_COLLECTIONS = [
  'profiles',
  'users'
];

const useCollection = <T extends { id: string }>(
  colName: string,
  initialData: T[],
  enabled: boolean = true,
  transform?: (data: any) => T,
  limit?: number,
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'desc',
  isRealtime: boolean = false
) => {
  const tableName = getTableName(colName);
  const isSupabase = SUPABASE_COLLECTIONS.includes(tableName);

  if (isSupabase) {
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

    const loadMore = () => { console.warn("loadMore not implemented for Supabase yet"); };
    return [data, setData, isLoading, loadMore, error, refresh] as const;
  } else {
    // Use R2 for content data
    const [data, setData, isLoading, error, refresh] = useR2Collection<T>(
      tableName,
      initialData,
      enabled,
      transform,
      orderByField,
      orderDirection
    );

    const loadMore = () => { console.warn("loadMore not implemented for R2 yet"); };
    return [data, setData, isLoading, loadMore, error, refresh] as const;
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasQuotaExceeded, setHasQuotaExceeded] = useState(false);

  // Determine roles for conditional fetching
  const isAdmin = user?.role === 'admin';
  const isSubscriber = user?.isSubscriber || isAdmin;

  // -- REALTIME DATA SUBSCRIPTIONS --

  // Site Config (R2)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await fetchFromR2<any>('settings');
        const config = data.find((s: any) => s.id === 'siteConfig');
        if (config && config.data) {
          setSiteConfig(config.data as SiteConfig);
        }
      } catch (error) {
        console.warn("R2 fetch error for siteConfig:", error);
      }
    };

    fetchConfig();
  }, []);

  // Public Collections (Supabase)
  const [products, setProducts, productsLoading, , productsError, refreshProducts] = useCollection<Product>('products', PRODUCTS, true, mapSupabaseProduct, 200, 'createdAt', 'desc', false);
  const [mixtapes, setMixtapes, mixtapesLoading, , mixtapesError, refreshMixtapes] = useCollection<Mixtape>('mixtapes', FEATURED_MIXTAPES, true, mapSupabaseMixtape, 200, 'createdAt', 'desc', false);
  const [sessionTypes, setSessionTypes, sessionTypesLoading, , , refreshSessionTypes] = useCollection<SessionType>('sessionTypes', [], true, mapSupabaseSessionType, undefined, 'createdAt', 'desc', false);
  const [studioEquipment, setStudioEquipment, equipmentLoading, , , refreshEquipment] = useCollection<StudioEquipment>('studioEquipment', INITIAL_STUDIO_EQUIPMENT, true, mapSupabaseGeneric, undefined, 'createdAt', 'desc', false);
  const [subscriptionPlans, setSubscriptionPlans, plansLoading, , , refreshPlans] = useCollection<SubscriptionPlan>('subscriptionPlans', SUBSCRIPTION_PLANS, true, mapSupabasePlan, undefined, 'price', 'asc', false);
  const [shippingZones, setShippingZones, zonesLoading, , , refreshZones] = useCollection<ShippingZone>('shippingZones', INITIAL_SHIPPING_ZONES, true, mapSupabaseGeneric, undefined, 'createdAt', 'desc', false);
  const [genres, setGenres, genresLoading, , , refreshGenres] = useCollection<Genre>('genres', INITIAL_GENRES, true, mapSupabaseGenre, undefined, 'createdAt', 'desc', false);
  const [youtubeVideos, setYoutubeVideos, videosLoading, , , refreshVideos] = useCollection<Video>('youtubeVideos', [], true, mapSupabaseGeneric, undefined, 'createdAt', 'desc', false);


  // Restricted Collections (Subscriber/Admin) - Supabase handles large music pool library
  const [poolTracks, , poolLoading, , poolError] = useCollection<Track>('poolTracks', [], isSubscriber || isAdmin, mapSupabaseTrack, 2000, 'dateAdded', 'desc', false);

  const loadMorePoolTracks = () => {
    // With progressive loading, we might not need this
  };

  const refreshPoolTracks = () => {
    // refresh logic is handled by the hook
  };

  // Admin Only Collections (Supabase)
  const [orders, , ordersLoading, , ordersError, refreshOrders] = useCollection<Order>('orders', [], isAdmin, mapSupabaseOrder, 500, 'createdAt', 'desc', false);
  const [users, , usersLoading, , usersError, refreshUsers] = useCollection<User>('profiles', [], isAdmin, mapSupabaseUser, 500, 'createdAt', 'desc', false);
  const [subscriptions, , subscriptionsLoading, , subscriptionsError, refreshSubscriptions] = useCollection<Subscription>('subscriptions', [], isAdmin, mapSupabaseSubscription, 500, 'startDate', 'desc', false);
  const [bookings, , bookingsLoading, , bookingsError, refreshBookings] = useCollection<Booking>('bookings', [], isAdmin, mapSupabaseBooking, 200, 'createdAt', 'desc', false);

  const [studioRooms, , studioRoomsLoading, , , refreshRooms] = useCollection<StudioRoom>('studio_rooms', [], isAdmin, mapSupabaseStudioRoom, undefined, 'createdAt', 'desc', false);
  const [maintenanceLogs, , maintenanceLogsLoading, , , refreshLogs] = useCollection<MaintenanceLog>('maintenance_logs', [], isAdmin, mapSupabaseMaintenanceLog, 100, 'createdAt', 'desc', false);
  const [coupons, , couponsLoading, , , refreshCoupons] = useCollection<Coupon>('coupons', [], isAdmin, mapSupabaseCoupon, undefined, 'createdAt', 'desc', false);
  const [referralStats, , referralStatsLoading, , , refreshReferrals] = useCollection<ReferralStats>('referral_stats', [], isAdmin, mapSupabaseReferralStats, 200, 'createdAt', 'desc', false);
  const [newsletterCampaigns, , campaignsLoading, , , refreshCampaigns] = useCollection<NewsletterCampaign>('newsletter_campaigns', [], isAdmin, mapSupabaseCampaign, 50, 'createdAt', 'desc', false);
  const [newsletterSegments, , segmentsLoading, , , refreshSegments] = useCollection<NewsletterSegment>('newsletter_segments', [], isAdmin, mapSupabaseGeneric, 50, 'createdAt', 'desc', false);
  const [subscribers, , subscribersLoading, , , refreshSubscribers] = useCollection<NewsletterSubscriber>('newsletter_subscribers', [], isAdmin, mapSupabaseSubscriber, 500, 'date_subscribed', 'desc', false);
  const [telegramChannels, , tgChannelsLoading, , , refreshTelegramChannels] = useCollection<TelegramChannel>('telegram_channels', [], isAdmin, mapSupabaseChannel, undefined, 'createdAt', 'desc', false);
  const [payments, , paymentsLoading, , , refreshPayments] = useCollection<any>('payments', [], isAdmin, (p) => ({ ...p, createdAt: p.created_at }), 200, 'created_at', 'desc', false);
  const [tips, , tipsLoading, , , refreshTips] = useCollection<any>('tips', [], isAdmin, (t) => ({ ...t, createdAt: t.created_at }), 200, 'created_at', 'desc', false);
  const [telegramMappings] = useCollection<TelegramMapping>('telegram_mappings', [], isAdmin, mapSupabaseGeneric, 200, 'createdAt', 'desc', false);
  const [telegramUsers] = useCollection<TelegramUser>('telegram_users', [], isAdmin, mapSupabaseGeneric, 500, 'createdAt', 'desc', false);
  const [telegramLogs] = useCollection<TelegramLog>('telegram_logs', [], isAdmin, mapSupabaseGeneric, 200, 'timestamp', 'desc', false);
  const [contactMessages, , messagesLoading, , , refreshContactMessages] = useCollection<ContactMessage>('contact_messages', [], isAdmin, mapSupabaseGeneric, 200, 'createdAt', 'desc', false);

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
    try {
      setSiteConfig(config);
      await saveToR2('settings', { id: 'siteConfig', ...config });
      console.log("Site config saved to R2");
    } catch (err: any) {
      console.error("Update site config failed:", err.message);
    }
  };

  const addProduct = async (product: Product) => {
    try {
      const finalId = product.id || `p${Date.now()}`;
      const mappedProduct: Product = {
        ...product,
        id: finalId,
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newProducts = [mappedProduct, ...products.filter(p => p.id !== finalId)];
      setProducts(newProducts);

      // Sync with R2
      await saveToR2('products', newProducts);
      console.log("Product saved to R2");
      refreshProducts();
    } catch (err: any) {
      console.error("Add product failed:", err.message);
      refreshProducts();
    }
  };
  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      const updatedProducts = products.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
      setProducts(updatedProducts);

      // Sync with R2
      await saveToR2('products', updatedProducts);
      console.log("Product updated on R2");
      refreshProducts();
    } catch (err: any) {
      console.error("Update product failed:", err.message);
      refreshProducts();
    }
  };
  const deleteProduct = async (id: string) => {
    try {
      const updatedProducts = products.filter(p => p.id !== id);
      setProducts(updatedProducts);

      // Sync with R2
      await saveToR2('products', updatedProducts);
      console.log("Product deleted from R2");
      refreshProducts();
    } catch (err: any) {
      console.error("Delete product failed:", err.message);
      refreshProducts();
    }
  };

  const addMixtape = async (mixtape: Mixtape) => {
    try {
      const finalId = mixtape.id || `m${Date.now()}`;
      const mapped: Mixtape = {
        ...mixtape,
        id: finalId,
        createdAt: mixtape.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updatedMixtapes = [mapped, ...mixtapes.filter(m => m.id !== finalId)];
      setMixtapes(updatedMixtapes);

      // Sync with R2
      await saveToR2('mixtapes', updatedMixtapes);
      console.log("Mixtape saved to R2");
      refreshMixtapes();
    } catch (err: any) {
      console.error("Add mixtape failed:", err.message);
      refreshMixtapes();
    }
  };
  const updateMixtape = async (id: string, data: Partial<Mixtape>) => {
    try {
      const updatedMixtapes = mixtapes.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m);
      setMixtapes(updatedMixtapes);

      // Sync with R2
      await saveToR2('mixtapes', updatedMixtapes);
      console.log("Mixtape updated on R2");
      refreshMixtapes();
    } catch (err: any) {
      console.error("Update mixtape failed:", err.message);
      refreshMixtapes();
    }
  };
  const deleteMixtape = async (id: string) => {
    try {
      const updatedMixtapes = mixtapes.filter(m => m.id !== id);
      setMixtapes(updatedMixtapes);

      // Sync with R2
      await saveToR2('mixtapes', updatedMixtapes);
      console.log("Mixtape deleted from R2");
      refreshMixtapes();
    } catch (err: any) {
      console.error("Delete mixtape failed:", err.message);
      refreshMixtapes();
    }
  };

  const addPoolTrack = async (track: Track) => {
    try {
      const newTracks = [track, ...poolTracks];
      // Note: We don't have a local state for poolTracks since it's huge, 
      // but if we do manual sync, we should update R2
      await saveToR2('pool_tracks', newTracks);
      refreshPoolTracks();
    } catch (error: any) {
      console.error("Add track failed:", error.message);
    }
  };

  const updatePoolTrack = async (id: string, data: Partial<Track>) => {
    try {
      const newTracks = poolTracks.map(t => t.id === id ? { ...t, ...data } : t);
      await saveToR2('pool_tracks', newTracks);
      refreshPoolTracks();
    } catch (error: any) {
      console.error("Update track failed:", error.message);
    }
  };

  const deletePoolTrack = async (id: string) => {
    try {
      const newTracks = poolTracks.filter(t => t.id !== id);
      await saveToR2('pool_tracks', newTracks);
      refreshPoolTracks();
    } catch (err: any) {
      console.error("Delete track failed:", err.message);
    }
  };

  const updateGenre = async (id: string, data: Partial<Genre>) => {
    try {
      const updatedGenres = genres.map(g => g.id === id ? { ...g, ...data, updatedAt: new Date().toISOString() } : g);
      setGenres(updatedGenres);
      await saveToR2('genres', updatedGenres);
      console.log("Genre updated on R2");
    } catch (err: any) {
      console.error("Update genre failed:", err.message);
    }
  };

  const addBooking = async (booking: Booking) => {
    try {
      const finalId = booking.id || `b${Date.now()}`;
      const newBookings = [{ ...booking, id: finalId }, ...bookings];
      await saveToR2('bookings', newBookings);
      alert("Booking saved successfully to R2");
      refreshBookings();
    } catch (err: any) {
      console.error("Add booking failed:", err.message);
    }
  };

  const updateBooking = async (id: string, data: Partial<Booking>) => {
    try {
      const newBookings = bookings.map(b => b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b);
      await saveToR2('bookings', newBookings);
      alert("Booking updated on R2");
      refreshBookings();
    } catch (err: any) {
      console.error("Update booking failed:", err.message);
    }
  };

  const addSessionType = async (session: SessionType) => {
    try {
      const finalId = session.id || `st${Date.now()}`;
      const newSessions = [{ ...session, id: finalId, updatedAt: new Date().toISOString() }, ...sessionTypes];
      setSessionTypes(newSessions);
      await saveToR2('session_types', newSessions);
      alert("Session Type saved to R2");
      refreshSessionTypes();
    } catch (err: any) {
      console.error("Add session type failed:", err.message);
    }
  };
  const updateSessionType = async (id: string, data: Partial<SessionType>) => {
    try {
      const newSessions = sessionTypes.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
      setSessionTypes(newSessions);
      await saveToR2('session_types', newSessions);
      refreshSessionTypes();
    } catch (err: any) {
      console.error("Update session type failed:", err.message);
    }
  };

  const deleteSessionType = async (id: string) => {
    try {
      const newSessions = sessionTypes.filter(s => s.id !== id);
      setSessionTypes(newSessions);
      await saveToR2('session_types', newSessions);
      refreshSessionTypes();
    } catch (err: any) {
      console.error("Delete session type failed:", err.message);
    }
  };

  const addVideo = async (video: Video) => {
    try {
      const finalId = video.id || `v${Date.now()}`;
      const newVideos = [{ ...video, id: finalId, updatedAt: new Date().toISOString() }, ...youtubeVideos];
      setYoutubeVideos(newVideos);
      await saveToR2('videos', newVideos);
      refreshVideos();
    } catch (err: any) {
      console.error("Add video failed:", err.message);
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      const newVideos = youtubeVideos.filter(v => v.id !== id);
      setYoutubeVideos(newVideos);
      await saveToR2('videos', newVideos);
      refreshVideos();
    } catch (err: any) {
      console.error("Delete video failed:", err.message);
    }
  };

  const addStudioEquipment = async (equipment: StudioEquipment) => {
    try {
      const finalId = equipment.id || `eq${Date.now()}`;
      const newEquipment = [{ ...equipment, id: finalId, updatedAt: new Date().toISOString() }, ...studioEquipment];
      setStudioEquipment(newEquipment);
      await saveToR2('studio_equipment', newEquipment);
      refreshEquipment();
    } catch (err: any) {
      console.error("Add equipment failed:", err.message);
    }
  };

  const updateStudioEquipment = async (id: string, data: Partial<StudioEquipment>) => {
    try {
      const newEquipment = studioEquipment.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e);
      setStudioEquipment(newEquipment);
      await saveToR2('studio_equipment', newEquipment);
      refreshEquipment();
    } catch (err: any) {
      console.error("Update equipment failed:", err.message);
    }
  };

  const deleteStudioEquipment = async (id: string) => {
    try {
      const newEquipment = studioEquipment.filter(e => e.id !== id);
      setStudioEquipment(newEquipment);
      await saveToR2('studio_equipment', newEquipment);
      refreshEquipment();
    } catch (err: any) {
      console.error("Delete equipment failed:", err.message);
    }
  };

  const addSubscription = async (sub: Subscription) => {
    try {
      const finalId = sub.id || `sub${Date.now()}`;
      const newSub = { ...sub, id: finalId, updatedAt: new Date().toISOString() };

      // 1. Log in R2
      const newSubs = [newSub, ...subscriptions];
      await saveToR2('subscriptions', newSubs);

      // 2. Sync with User Profile to grant access (SUPABASE - AUTH)
      if (sub.status === 'active') {
        const { error: profileError } = await supabase.from('profiles').update({
          is_subscriber: true,
          subscription_plan: sub.planId,
          subscription_expiry: sub.expiryDate
        }).eq('id', sub.userId);

        if (profileError) {
          console.error("Failed to update user profile for subscription:", profileError);
        } else {
          refreshUsers();
        }
      }
      refreshSubscriptions();
    } catch (err: any) {
      console.error("Add subscription failed:", err.message);
    }
  };
  const updateSubscription = async (id: string, data: Partial<Subscription>) => {
    try {
      // 1. Update in R2
      const newSubs = subscriptions.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
      await saveToR2('subscriptions', newSubs);

      // 2. Sync changes to User Profile (SUPABASE - AUTH)
      const sub = subscriptions.find(s => s.id === id);
      if (sub && sub.userId) {
        const profileUpdate: any = {};
        if (data.status === 'active') {
          profileUpdate.is_subscriber = true;
          if (data.expiryDate) profileUpdate.subscription_expiry = data.expiryDate;
        } else if (data.status) {
          profileUpdate.is_subscriber = false;
        }
        if (data.expiryDate) {
          profileUpdate.subscription_expiry = data.expiryDate;
        }

        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('profiles').update(profileUpdate).eq('id', sub.userId);
          refreshUsers();
        }
      }
      refreshSubscriptions();
    } catch (err: any) {
      console.error("Update subscription failed:", err.message);
    }
  };

  const addSubscriptionPlan = async (plan: SubscriptionPlan) => {
    try {
      const docId = plan.id || `plan_${Date.now()}`;
      const newPlans = [{ ...plan, id: docId }, ...subscriptionPlans];
      setSubscriptionPlans(newPlans);
      await saveToR2('subscription_plans', newPlans);
      alert("Plan saved to R2");
      if (typeof refreshPlans === 'function') refreshPlans();
    } catch (err: any) {
      console.error("Add plan failed:", err.message);
    }
  };

  const updateSubscriptionPlan = async (id: string, data: Partial<SubscriptionPlan>) => {
    try {
      const newPlans = subscriptionPlans.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
      setSubscriptionPlans(newPlans);
      await saveToR2('subscription_plans', newPlans);
      alert("Plan updated on R2");
      if (typeof refreshPlans === 'function') refreshPlans();
    } catch (error: any) {
      console.error("Update plan failed:", error);
    }
  };

  const deleteSubscriptionPlan = async (id: string) => {
    try {
      const newPlans = subscriptionPlans.filter(p => p.id !== id);
      setSubscriptionPlans(newPlans);
      await saveToR2('subscription_plans', newPlans);
      alert("Plan removed from R2");
      if (typeof refreshPlans === 'function') refreshPlans();
    } catch (error: any) {
      console.error("Delete plan failed:", error);
    }
  };

  const addStudioRoom = async (room: StudioRoom) => {
    try {
      const docId = room.id || `rm_${Date.now()}`;
      const newRooms = [{ ...room, id: docId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...studioRooms];
      await saveToR2('studio_rooms', newRooms);
      refreshRooms();
    } catch (err: any) {
      console.error("Add room failed:", err.message);
    }
  };
  const updateStudioRoom = async (id: string, data: Partial<StudioRoom>) => {
    try {
      const newRooms = studioRooms.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r);
      await saveToR2('studio_rooms', newRooms);
      refreshRooms();
    } catch (err: any) {
      console.error("Update room failed:", err.message);
    }
  };

  const deleteStudioRoom = async (id: string) => {
    try {
      const newRooms = studioRooms.filter(r => r.id !== id);
      await saveToR2('studio_rooms', newRooms);
      refreshRooms();
    } catch (err: any) {
      console.error("Delete room failed:", err.message);
    }
  };

  const addMaintenanceLog = async (log: MaintenanceLog) => {
    try {
      const docId = log.id || `log_${Date.now()}`;
      const newLogs = [{ ...log, id: docId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...maintenanceLogs];
      await saveToR2('maintenance_logs', newLogs);
      refreshLogs();
    } catch (err: any) {
      console.error("Add log failed:", err.message);
    }
  };

  const updateMaintenanceLog = async (id: string, data: Partial<MaintenanceLog>) => {
    try {
      const newLogs = maintenanceLogs.map(l => l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l);
      await saveToR2('maintenance_logs', newLogs);
      refreshLogs();
    } catch (err: any) {
      console.error("Update log failed:", err.message);
    }
  };

  const addOrder = async (order: Order) => {
    try {
      const newOrders = [order, ...orders];
      await saveToR2('orders', newOrders);
      refreshOrders();
    } catch (err: any) {
      console.error("Add order failed:", err.message);
    }
  };

  const updateOrder = async (id: string, data: Partial<Order>) => {
    try {
      const newOrders = orders.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o);
      await saveToR2('orders', newOrders);
      refreshOrders();
    } catch (err: any) {
      console.error("Update order failed:", err.message);
    }
  };

  const addPayment = async (payment: any) => {
    try {
      const newPayments = [payment, ...payments];
      await saveToR2('payments', newPayments);
      if (typeof refreshPayments === 'function') refreshPayments();
    } catch (err: any) {
      console.error("Add payment failed:", err.message);
    }
  };

  const addTip = async (tip: any) => {
    try {
      const newTips = [tip, ...tips];
      await saveToR2('tips', newTips);
      if (typeof refreshTips === 'function') refreshTips();
    } catch (err: any) {
      console.error("Add tip failed:", err.message);
    }
  };

  const addCampaign = async (camp: NewsletterCampaign) => {
    try {
      const docId = camp.id || `camp_${Date.now()}`;
      const newCampaigns = [{ ...camp, id: docId, updatedAt: new Date().toISOString() }, ...newsletterCampaigns];
      await saveToR2('newsletter_campaigns', newCampaigns);
      refreshCampaigns();
    } catch (err: any) {
      console.error("Add campaign failed:", err.message);
    }
  };

  const updateCampaign = async (id: string, data: Partial<NewsletterCampaign>) => {
    try {
      const newCampaigns = newsletterCampaigns.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      await saveToR2('newsletter_campaigns', newCampaigns);
      refreshCampaigns();
    } catch (err: any) {
      console.error("Update campaign failed:", err.message);
    }
  };

  const addCoupon = async (coupon: Coupon) => {
    try {
      const docId = coupon.id || `cpn_${Date.now()}`;
      const newCoupons = [{ ...coupon, id: docId, updatedAt: new Date().toISOString() }, ...coupons];
      await saveToR2('coupons', newCoupons);
      refreshCoupons();
    } catch (err: any) {
      console.error("Add coupon failed:", err.message);
    }
  };

  const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    try {
      const newCoupons = coupons.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      await saveToR2('coupons', newCoupons);
      refreshCoupons();
    } catch (err: any) {
      console.error("Update coupon failed:", err.message);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const newCoupons = coupons.filter(c => c.id !== id);
      await saveToR2('coupons', newCoupons);
      refreshCoupons();
    } catch (err: any) {
      console.error("Delete coupon failed:", err.message);
    }
  };

  const validateCoupon = async (code: string): Promise<{ success: boolean; coupon?: Coupon; message?: string }> => {
    try {
      // Fetch from R2 (since it's the primary source now)
      const data = await fetchFromR2<any>('coupons');
      const couponData = data.find((c: any) => c.code === code.toUpperCase() && c.active);

      if (!couponData) {
        return { success: false, message: 'Invalid or expired coupon code.' };
      }

      const coupon = couponData as Coupon;
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

  const updateTelegramConfig = async (configData: Partial<TelegramConfig>) => {
    try {
      const newConfig = { ...telegramConfig, ...configData };
      setTelegramConfig(newConfig);
      await saveToR2('telegram_config', { id: 'main', ...newConfig });
    } catch (err: any) {
      console.error("Update telegram config failed:", err.message);
    }
  };
  const addTelegramChannel = async (channel: TelegramChannel) => {
    try {
      const docId = channel.id || `tg_${Date.now()}`;
      const newChannels = [{ ...channel, id: docId, updatedAt: new Date().toISOString() }, ...telegramChannels];
      await saveToR2('telegram_channels', newChannels);
      refreshTelegramChannels();
    } catch (err: any) {
      console.error("Add channel failed:", err.message);
    }
  };
  const updateTelegramChannel = async (id: string, data: Partial<TelegramChannel>) => {
    try {
      const newChannels = telegramChannels.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      await saveToR2('telegram_channels', newChannels);
      refreshTelegramChannels();
    } catch (err: any) {
      console.error("Update channel failed:", err.message);
    }
  };

  const deleteTelegramChannel = async (id: string) => {
    try {
      const newChannels = telegramChannels.filter(c => c.id !== id);
      await saveToR2('telegram_channels', newChannels);
      refreshTelegramChannels();
    } catch (err: any) {
      console.error("Delete channel failed:", err.message);
    }
  };

  const updateShippingZone = async (id: string, data: Partial<ShippingZone>) => {
    try {
      const newZones = shippingZones.map(z => z.id === id ? { ...z, ...data, updatedAt: new Date().toISOString() } : z);
      await saveToR2('shipping_zones', newZones);
      refreshZones();
    } catch (err: any) {
      console.error("Update shipping zone failed:", err.message);
    }
  };

  const addSubscriber = async (email: string, source: string = 'Manual') => {
    try {
      const now = new Date().toISOString();
      const newSubscriber = {
        id: `sub_${Date.now()}`,
        email,
        date_subscribed: now,
        status: 'active',
        source,
        updatedAt: now
      };
      const newSubscribers = [newSubscriber, ...subscribers];
      await saveToR2('newsletter_subscribers', newSubscribers);
      refreshSubscribers();
    } catch (err: any) {
      console.error("Add subscriber failed:", err.message);
    }
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
    try {
      const now = new Date().toISOString();
      const newMessage = { ...msg, id: `msg_${Date.now()}`, createdAt: now, updatedAt: now };
      const newMessages = [newMessage, ...contactMessages];
      await saveToR2('contact_messages', newMessages);
      refreshContactMessages();
    } catch (err: any) {
      console.error("Add contact message failed:", err.message);
    }
  };

  const updateContactMessage = async (id: string, data: Partial<ContactMessage>) => {
    try {
      const newMessages = contactMessages.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m);
      await saveToR2('contact_messages', newMessages);
      refreshContactMessages();
    } catch (err: any) {
      console.error("Update contact message failed:", err.message);
    }
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
    addOrder, updateOrder, addPayment, addTip, addCampaign, updateCampaign,
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
    addOrder, updateOrder, addPayment, addTip, addCampaign, updateCampaign,
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
