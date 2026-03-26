
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Product, Mixtape, Booking, Track, SessionType, SiteConfig, Video, TelegramConfig, TelegramChannel, TelegramMapping, TelegramUser, TelegramLog, StudioEquipment, ShippingZone, NewsletterSubscriber, Genre, Subscription, Order, NewsletterCampaign, NewsletterSegment, SubscriptionPlan, StudioRoom, MaintenanceLog, Coupon, ReferralStats, User, ReferralSettings, ReferralLog, ContactMessage, Review, AppNotification, StudioSession, EventGig } from '../types';
import { PRODUCTS, FEATURED_MIXTAPES, POOL_TRACKS, YOUTUBE_VIDEOS, INITIAL_STUDIO_EQUIPMENT, INITIAL_SHIPPING_ZONES, INITIAL_GENRES, SUBSCRIPTION_PLANS } from '../constants';
import { useAuth } from './AuthContext';
import { useR2Collection } from '../hooks/useR2Collection';
import { fetchFromR2, saveToR2, addR2Item, updateR2Item, removeR2Item, addBatchR2Items, removeBatchR2Items, saveToD1, getAuthHeader, STORAGE_WORKER_URL, syncPoolTrackToD1, deletePoolTrackFromD1, syncGenresToD1 } from '../utils/r2';



// Initial Site Config Data (Fallback only if DB is empty)
const INITIAL_CONFIG: SiteConfig = {
  baseUrl: "https://djflowerz.co.ke",
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
    title: "Welcome",
    message: "Welcome to DJ Flowerz. Experience the best mixtapes and music pool.",
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
  studioSessions: StudioSession[];
  eventGigs: EventGig[];
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
  productsError: string | null;
  ordersError: string | null;
  usersError: string | null;
  subscriptionsError: string | null;
  bookingsError: string | null;
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
  refreshNotifications: () => void;
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

  sendEmail: (data: { to: string | string[]; subject: string; html: string; text?: string }) => Promise<{ success: boolean; message: string }>;
  sendNewsletterConfirmation: (email: string) => Promise<void>;
  uploadTrackList: (file: File) => Promise<{ success: boolean; message: string; count?: number }>;
  downloadTrackList: () => void;
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

const getYoutubeId = (url: string | undefined): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// R2 Mapping Helpers
const mapR2Track = (t: any): Track => {
  // Common CDN bases for relative URLs
  const WORKER_BASE = 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
  const DEFAULT_CDN_BASE = `${WORKER_BASE}/files`;

  /**
   * Fix track media URLs so they point to the correct publicly accessible CDN.
   *
   * Key insight:
   *  - `r2.vicknickvideopool.com` is the private/origin R2 bucket (403/404 publicly)
   *  - `cdn.vicknickvideopool.com` is the PUBLIC Cloudflare CDN that serves the actual files
   *  - `remix-and-mashups-worker.dennismacharia20.workers.dev` is a UI worker, NOT a file CDN;
   *    all its tracks are also served from `cdn.vicknickvideopool.com`
   *
   * Pool tracks JSON was built with `r2.` domain — we fix that here at read time.
   */
  const encodeR2Url = (u: string): string => {
    if (!u) return u;
    try {
      const urlObj = new URL(u);
      const PUBLIC_CDN = 'cdn.vicknickvideopool.com';

      // Fix private/origin R2 domain → public CDN
      if (urlObj.hostname === 'r2.vicknickvideopool.com') {
        urlObj.hostname = PUBLIC_CDN;
      }

      // Remix-and-mashups-worker is a UI, its actual files live on the vicknick CDN.
      // The path structure in pool_tracks.json already has the correct key path.
      if (urlObj.hostname === 'remix-and-mashups-worker.dennismacharia20.workers.dev') {
        urlObj.hostname = PUBLIC_CDN;
        // Strip any leading /api path if present from the remix worker fetch
        urlObj.pathname = urlObj.pathname.replace(/^\/api\//, '/');
      }

      // Encode each path segment individually (handles spaces, &, parens, etc.)
      urlObj.pathname = urlObj.pathname
        .split('/')
        .map(seg => encodeURIComponent(decodeURIComponent(seg)))
        .join('/');
      return urlObj.toString();
    } catch {
      return u.replace(/ /g, '%20').replace(/&(?![a-z#0-9]+;)/g, '%26');
    }
  };

  const ensureAbsolute = (u: string) => {
    if (!u) return u;
    if (u.startsWith('http') || u.startsWith('data:') || u.startsWith('blob:')) return encodeR2Url(u);
    return encodeR2Url(`${DEFAULT_CDN_BASE}/${u.replace(/^\//, '')}`);
  };

  let versions = safeJsonParse(t.versions, []).map((v: any) => ({
    ...v,
    id: String(v.id || Math.random().toString(36).substr(2, 9)),
    type: String(v.type || v.version_name || v.label || 'Main'),
    version_name: String(v.version_name || v.type || v.label || 'Main'),
    preview_url: ensureAbsolute(v.preview_url || v.previewUrl || v.file_url || v.download_url || v.downloadUrl),
    previewUrl: ensureAbsolute(v.previewUrl || v.preview_url || v.file_url || v.download_url || v.downloadUrl),
    download_url: ensureAbsolute(v.download_url || v.downloadUrl || v.file_url || v.preview_url || v.previewUrl),
    downloadUrl: ensureAbsolute(v.downloadUrl || v.download_url || v.file_url || v.previewUrl || v.preview_url),
    is_main_version: Boolean(v.is_main_version || v.isMainVersion || false)
  }));

  // Deduplicate versions by name and URL to prevent "2 same versions" issue
  versions = versions.filter((v, index, self) =>
    index === self.findIndex((t) => (
      t.version_name === v.version_name && (t.download_url === v.download_url || t.preview_url === v.preview_url)
    ))
  );

  // Robustly handle URLs - prioritizing streamable content
  let previewUrl = t.preview_url || t.previewUrl || (versions.length > 0 ? versions[0].downloadUrl : undefined) || t.audio_url || t.audioUrl;
  previewUrl = ensureAbsolute(previewUrl);

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
const mapR2Generic = (item: any): any => ({
  ...item,
  createdAt: item.createdAt || item.created_at,
  updatedAt: item.updatedAt || item.updated_at
});

const safeJsonParse = (val: any, fallback: any = []) => {
  if (!val) return fallback;
  if (typeof val !== 'string') return Array.isArray(val) ? val : fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const mapR2Product = (p: any): Product => {
  try {
    const images = safeJsonParse(p.images || p.image_list || p.product_images, p.image ? [p.image] : []);
    const mainImage = p.image || images[0] || '';

    const type = p.type || (['Software', 'Samples', 'digital', 'DJ Software'].includes(p.category || '') ? 'digital' : 'physical');
    const requiresShipping = Boolean(p.requires_shipping !== undefined ? p.requires_shipping : (p.requiresShipping !== undefined ? p.requiresShipping : (type === 'physical')));

    return {
      ...p,
      type: type,
      id: String(p.id || ''),
      name: String(p.name || 'Untitled Product'),
      slug: String(p.slug || ''),
      image: mainImage,
      images: images,
      isActive: Boolean(p.is_active !== undefined ? p.is_active : (p.isActive !== undefined ? p.isActive : (p.status === 'published' || p.status === 'active'))),
      status: p.status === 'active' ? 'published' : (p.status || (Boolean(p.is_active || p.isActive) ? 'published' : 'draft')),
      isHot: Boolean(p.is_featured !== undefined ? p.is_featured : (p.isHot !== undefined ? p.isHot : false)),
      isFeatured: Boolean(p.is_featured !== undefined ? p.is_featured : (p.isFeatured !== undefined ? p.isFeatured : false)),
      price: Number(p.price !== undefined ? p.price : 0),
      discountPrice: p.discount_price !== undefined ? Number(p.discount_price) : (p.discountPrice !== undefined ? Number(p.discountPrice) : undefined),
      compareAtPrice: p.compare_at_price !== undefined ? Number(p.compare_at_price) : (p.compareAtPrice !== undefined ? Number(p.compareAtPrice) : undefined),
      variantGroups: safeJsonParse(p.variant_groups || p.variantGroups),
      variants: safeJsonParse(p.variants || p.variant_list, []).map((v: any) => {
        if (typeof v === 'string') return { id: v, name: v, price: Number(p.price || 0) };
        return {
          id: String(v.id || v.sku || Math.random().toString(36).substr(2, 9)),
          name: String(v.name || v.label || ''),
          price: Number(v.price !== undefined ? v.price : (p.price || 0)),
          discountPrice: v.discount_price !== undefined ? Number(v.discount_price) : (v.discountPrice !== undefined ? Number(v.discountPrice) : undefined),
          compareAtPrice: v.compare_at_price !== undefined ? Number(v.compare_at_price) : (v.compareAtPrice !== undefined ? Number(v.compareAtPrice) : undefined),
          stock: Number(v.stock !== undefined ? v.stock : (v.stock_quantity !== undefined ? v.stock_quantity : 0)),
          image: v.image || v.image_url || ''
        };
      }),
      stock: Number(p.stock !== undefined ? p.stock : (p.inventory !== undefined ? p.inventory : 0)),
      features: safeJsonParse(p.features),
      weight: p.weight,
      dimensions: p.dimensions,
      releaseDate: p.release_date || p.releaseDate,
      tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? p.tags.split(',').map((t: string) => t.trim()) : (p.tag_list ? String(p.tag_list).split(',').map((t: string) => t.trim()) : [])),
      createdAt: p.created_at || p.createdAt || new Date().toISOString(),
      updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
      digitalFileUrl: p.digital_file_url || p.digitalFileUrl || '',
      downloadPassword: p.download_password || p.downloadPassword || '',
      secureDownloadLink: p.secure_download_link || p.secureDownloadLink || '',
      meta_title: p.meta_title || p.metaTitle || '',
      meta_description: p.meta_description || p.metaDescription || '',
      meta_keywords: p.meta_keywords || '',
      whatsappEnabled: Boolean(p.whatsapp_enabled !== undefined ? p.whatsapp_enabled : (p.whatsappEnabled !== undefined ? p.whatsappEnabled : true)),
      requiresShipping: requiresShipping,
      isBestSeller: Boolean(p.is_best_seller !== undefined ? p.is_best_seller : (p.isBestSeller !== undefined ? p.isBestSeller : false)),
      isSpecialOffer: Boolean(p.is_special_offer !== undefined ? p.is_special_offer : (p.isSpecialOffer !== undefined ? p.isSpecialOffer : false)),
      isTrending: Boolean(p.is_trending !== undefined ? p.is_trending : (p.isTrending !== undefined ? p.isTrending : false)),
      offerExpiry: p.offer_expiry || p.offerExpiry || '',
      technicalDetails: safeJsonParse(p.technical_details || p.technicalDetails),
      hotspots: safeJsonParse(p.hotspots),
      useCases: safeJsonParse(p.use_cases || p.useCases)
    };
  } catch (err) {
    console.error("[DataContext] Error mapping product:", p, err);
    // Return a minimal valid product to avoid crashing the whole list
    return { ...p, id: p.id || 'error', name: p.name || 'Error Loading', price: 0, isActive: false } as Product;
  }
};

const mapR2Mixtape = (m: any): Mixtape => {
  try {
    const ytUrl = m.youtube_url || m.youtubeUrl;
    const ytId = getYoutubeId(ytUrl);
    const ytFallback = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : '';

    return {
      ...m,
      id: String(m.id || ''),
      title: String(m.title || 'Untitled Mixtape'),
      coverUrl: m.cover_url || m.coverUrl || m.cover_image || ytFallback || '',
      audioUrl: m.audio_url || m.audioUrl || '',
      duration: String(m.duration || '0:00'),
      releaseDate: m.release_date || m.releaseDate || new Date().toISOString(),
      previewStartTime: m.preview_start_time || m.previewStartTime,
      allowFullStream: Boolean(m.allow_full_stream !== undefined ? m.allow_full_stream : m.allowFullStream),
      allowDownload: Boolean(m.allow_download !== undefined ? m.allow_download : m.allowDownload),
      downloadType: m.download_type || m.downloadType || 'free',
      streamQuality: m.stream_quality || m.streamQuality || 'standard',
      isFeatured: Boolean(m.is_featured !== undefined ? m.is_featured : m.isFeatured),
      showInGallery: Boolean(m.show_in_gallery !== undefined ? m.show_in_gallery : m.showInGallery),
      showInMusicPool: Boolean(m.show_in_music_pool !== undefined ? m.show_in_music_pool : m.showInMusicPool),
      enableComments: Boolean(m.enable_comments !== undefined ? m.enable_comments : m.enableComments),
      requireLoginToComment: Boolean(m.require_login_to_comment !== undefined ? m.require_login_to_comment : m.requireLoginToComment),
      moderateComments: Boolean(m.moderate_comments !== undefined ? m.moderate_comments : m.moderateComments),
      downloadUrl: m.download_url || m.downloadUrl,
      videoDownloadUrl: m.video_download_url || m.videoDownloadUrl,
      downloadLimit: m.download_limit !== undefined ? Number(m.download_limit) : undefined,
      downloadExpiryDays: m.download_expiry_days !== undefined ? Number(m.download_expiry_days) : undefined,
      requiredTier: m.required_tier || m.requiredTier,
      youtubeUrl: m.youtube_url || m.youtubeUrl,
      soundcloudUrl: m.soundcloud_url || m.soundcloudUrl,
      metaTitle: m.meta_title || m.metaTitle,
      metaDescription: m.meta_description || m.metaDescription,
      ogImage: m.og_image || m.ogImage,
      isExclusive: Boolean(m.is_exclusive !== undefined ? m.is_exclusive : m.isExclusive),
      createdAt: m.created_at || m.createdAt,
      updatedAt: m.updated_at || m.updatedAt,
      tracklist: safeJsonParse(m.tracklist || m.track_list, []),
      tags: Array.isArray(m.tags) ? m.tags : (typeof m.tags === 'string' ? m.tags.split(',').map((t: string) => t.trim()) : [])
    };
  } catch (err) {
    console.error("[DataContext] Error mapping mixtape:", m, err);
    return { ...m, id: m.id || 'error', title: m.title || 'Error Loading' } as Mixtape;
  }
};

const mapR2Order = (o: any): Order => {
  let parsedItems = o.items;
  if (typeof o.items === 'string') {
    try {
      parsedItems = JSON.parse(o.items);
    } catch (e) {
      console.error("Failed to parse order items:", e);
      parsedItems = [];
    }
  }

  return {
    ...o,
    items: Array.isArray(parsedItems) ? parsedItems : [],
    total: o.total !== undefined ? o.total : (o.total_amount !== undefined ? o.total_amount : o.amount),
    customerName: o.customer_name || o.customerName,
    customerEmail: o.customer_email || o.customerEmail,
    customerPhone: o.customer_phone || o.customerPhone || o.phone,
    city: o.city,
    address: o.address,
    paymentStatus: o.payment_status || o.paymentStatus,
    referenceCode: o.reference_code || o.referenceCode,
    trackingNumber: o.tracking_number || o.trackingNumber,
    courierName: o.shipping_provider || o.courier_name || o.courierName,
    estimatedArrival: o.estimated_arrival || o.estimatedArrival,
    pickupLocation: o.pickup_location || o.pickupLocation,
    receiptUrl: o.receipt_url || o.receiptUrl,
    adminMessage: o.notes || o.admin_message || o.adminMessage,
    shippedAt: o.shipped_at || o.shippedAt,
    deliveryMethod: o.delivery_method || o.deliveryMethod || o.shipping_method,
    requiresShipping: o.requires_shipping !== undefined ? o.requires_shipping : o.requiresShipping,
    subtotal: o.subtotal !== undefined ? o.subtotal : o.subtotal,
    discountAmount: o.discount_amount !== undefined ? o.discount_amount : o.discountAmount,
    shippingCost: o.shipping_cost !== undefined ? o.shipping_cost : o.shippingCost,
    couponCode: o.coupon_code || o.couponCode,
    createdAt: o.created_at || o.createdAt,
    updatedAt: o.updated_at || o.updatedAt
  };
};

const mapR2User = (u: any): User => ({
  ...u,
  fullName: u.full_name || u.name || u.fullName,
  full_name: u.full_name || u.name || u.fullName, // Keep both for safety
  isSubscriber: u.is_subscriber !== undefined ? (u.is_subscriber === 1 || u.is_subscriber === true) : u.isSubscriber,
  subscriptionPlan: u.subscription_plan || u.subscriptionPlan,
  subscriptionExpiry: u.subscription_expiry || u.subscriptionExpiry,
  hasUsedTrial: Boolean(u.has_used_trial || u.hasUsedTrial),
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

const mapR2Subscription = (s: any): Subscription => ({
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

const mapR2Booking = (b: any): Booking => ({
  ...b,
  budget: b.budget !== undefined ? b.budget : (b.total_price_kes || b.quote_amount || 0),
  clientName: b.client_name || b.clientName,
  clientEmail: b.client_email || b.clientEmail,
  clientPhone: b.client_phone || b.clientPhone,
  serviceType: b.service_type || b.serviceType,
  serviceName: b.service_name || b.serviceName,
  paymentStatus: b.payment_status || b.paymentStatus,
  createdAt: b.created_at || b.createdAt,
  updatedAt: b.updated_at || b.updatedAt
});

const mapR2SessionType = (s: any): SessionType => ({
  ...s,
  depositRequired: s.deposit_required !== undefined ? s.deposit_required : s.depositRequired,
  equipmentIncluded: s.equipment_included !== undefined ? s.equipment_included : s.equipmentIncluded,
  createdAt: s.created_at || s.createdAt,
  updatedAt: s.updated_at || s.updatedAt
});

const mapR2StudioRoom = (r: any): StudioRoom => ({
  ...r,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

const mapR2MaintenanceLog = (l: any): MaintenanceLog => ({
  ...l,
  itemId: l.item_id || l.itemId,
  itemName: l.item_name || l.itemName,
  itemType: l.item_type || l.itemType,
  createdAt: l.created_at || l.createdAt,
  updatedAt: l.updated_at || l.updatedAt
});

const mapD1StudioRoom = (r: any): StudioRoom => ({
  id: String(r.id),
  name: String(r.name),
  capacity: Number(r.capacity || 0),
  description: String(r.description || ''),
  status: r.status || 'active',
  rate: Number(r.rate || 0),
  features: typeof r.features === 'string' ? JSON.parse(r.features) : (r.features || []),
  imageUrl: r.image_url || r.imageUrl || '',
  createdAt: r.created_at || r.createdAt,
  updatedAt: r.updated_at || r.updatedAt
});

const mapD1StudioEquipment = (e: any): StudioEquipment => ({
  id: String(e.id),
  name: String(e.name),
  category: String(e.category),
  image: e.image_url || e.image || '',
  description: String(e.description || ''),
  status: e.status || 'available',
  hourlyRate: Number(e.hourly_rate || 0),
  createdAt: e.created_at || e.createdAt,
  updatedAt: e.updated_at || e.updatedAt
});

const mapD1MaintenanceLog = (l: any): MaintenanceLog => ({
  id: String(l.id),
  itemId: l.gear_id || l.studio_id || '',
  itemName: '', // UI will need to resolve this or we can join later
  type: l.gear_id ? 'equipment' : 'room',
  description: l.issue || '',
  date: l.created_at || new Date().toISOString(),
  status: l.status === 'resolved' ? 'resolved' : 'pending'
});

const mapR2Coupon = (c: any): Coupon => ({
  ...c,
  discountType: c.discount_type || c.discountType,
  discountValue: c.discount_value !== undefined ? c.discount_value : c.discountValue,
  appliesTo: c.scope || c.applies_to || c.appliesTo,
  applicablePlans: safeJsonParse(c.applicable_plans || c.applicablePlans),
  expiryDate: c.expiry_date || c.expiryDate,
  usageLimit: c.max_uses_total !== undefined ? c.max_uses_total : (c.usage_limit !== undefined ? c.usage_limit : c.usageLimit),
  usageCount: c.usage_count !== undefined ? c.usage_count : (c.usageCount || 0),
  active: Boolean(c.is_active !== undefined ? c.is_active : (c.active !== undefined ? c.active : true)),
  minSpend: c.min_spend !== undefined ? c.min_spend : c.minSpend,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

const mapCouponToD1 = (c: Partial<Coupon>) => {
  const mapped: any = { ...c };
  if (c.discountType) mapped.discount_type = c.discountType;
  if (c.discountValue !== undefined) mapped.discount_value = c.discountValue;
  if (c.appliesTo) mapped.scope = c.appliesTo;
  if (c.expiryDate) mapped.expiry_date = c.expiryDate;
  if (c.usageLimit !== undefined) mapped.usage_limit = c.usageLimit;
  if (c.active !== undefined) mapped.is_active = c.active ? 1 : 0;
  if (c.minSpend !== undefined) mapped.min_spend = c.minSpend;
  if (c.isOneTimePerUser !== undefined) mapped.is_one_time_per_user = c.isOneTimePerUser ? 1 : 0;
  if (c.applicablePlans) mapped.applicable_plans = JSON.stringify(c.applicablePlans);
  
  // Clean up camelCase fields
  delete mapped.discountType;
  delete mapped.discountValue;
  delete mapped.appliesTo;
  delete mapped.expiryDate;
  delete mapped.usageLimit;
  delete mapped.active;
  delete mapped.minSpend;
  delete mapped.isOneTimePerUser;
  delete mapped.applicablePlans;
  
  return mapped;
};

const mapR2ReferralStats = (r: any): ReferralStats => ({
  ...r,
  userId: r.user_id || r.userId,
  userName: r.user_name || r.userName,
  referralCode: r.referral_code || r.referralCode,
  totalReferrals: r.total_referrals !== undefined ? r.total_referrals : (r.totalReferrals || 0),
  totalEarnedKes: r.total_earned_kes !== undefined ? r.total_earned_kes : (r.total_earned !== undefined ? r.total_earned : (r.totalEarnedKes || r.totalEarned || 0)),
  totalEarnedDays: r.total_earned_days !== undefined ? r.total_earned_days : (r.totalEarnedDays || 0),
  pendingPayout: r.pending_payout !== undefined ? r.pending_payout : (r.pendingPayout || 0),
  createdAt: r.created_at || r.createdAt,
  updatedAt: r.updated_at || r.updatedAt
});

const mapD1ReferralLog = (l: any): ReferralLog => ({
  id: String(l.id),
  referrerId: l.referrer_id,
  referredId: l.referred_id,
  actionType: l.action_type,
  rewardType: l.reward_type,
  rewardAmount: l.reward_amount,
  createdAt: l.created_at
});

const mapR2Campaign = (c: any): NewsletterCampaign => ({
  ...c,
  sentDate: c.sent_date || c.sentDate,
  recipientCount: c.recipient_count !== undefined ? c.recipient_count : c.recipientCount,
  openRate: c.open_rate !== undefined ? c.open_rate : c.openRate,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

const mapR2Subscriber = (s: any): NewsletterSubscriber => ({
  ...s,
  dateSubscribed: s.date_subscribed || s.dateSubscribed,
  updatedAt: s.updated_at || s.updatedAt
});

const mapR2Channel = (c: any): TelegramChannel => ({
  ...c,
  channelId: c.channel_id || c.channelId,
  inviteLink: c.invite_link || c.inviteLink,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

const mapR2Plan = (p: any): SubscriptionPlan => ({
  ...p,
  isBestValue: p.is_best_value !== undefined ? p.is_best_value : p.isBestValue,
  createdAt: p.created_at || p.createdAt,
  updatedAt: p.updated_at || p.updatedAt
});

const mapR2Genre = (g: any): Genre => ({
  ...g,
  coverUrl: g.cover_url || g.coverUrl,
  createdAt: g.created_at || g.createdAt,
  updatedAt: g.updated_at || g.updatedAt
});

const mapR2Notification = (n: any): AppNotification => ({
  ...n,
  userId: n.user_id || n.userId,
  createdAt: n.created_at || n.createdAt
});

const mapR2Tip = (t: any): any => ({
  ...t,
  amount: t.amount !== undefined ? t.amount : t.total_amount,
  status: t.status || 'completed',
  customerName: t.donor_name || t.customer_name || t.customerName || t.name,
  customerEmail: t.donor_email || t.customer_email || t.customerEmail || t.user_email || t.email,
  userEmail: t.donor_email || t.user_email || t.userEmail || t.email,
  createdAt: t.created_at || t.createdAt
});

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
    'studio_sessions': 'bookings/studio',
    'event_gigs': 'bookings/gigs',
    'mixtape_comments': 'mixtape_comments',
    'contactMessages': 'support/tickets',
    'contact_messages': 'support/tickets',
    'bookings': 'bookings/gigs',
    'syncNotifications': 'pool/sync-notifications',
    // --- Subscription plans (critical fix: camelCase → snake_case route) ---
    'subscriptionPlans': 'subscription_plans',
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
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      let results: any[] = [];
      if (source === 'D1') {
        const authHeader = await getAuthHeader();
        // Use /api/admin for dashboard/admin collections to bypass public cache/filters
        const apiPrefix = useAdminPath ? '/api/admin' : '/api';
        const response = await fetch(`${STORAGE_WORKER_URL}${apiPrefix}/${tableName}?t=${Date.now()}`, {
          headers: authHeader,
          cache: 'no-store'
        });
        if (response.ok) {
          const rawData = await response.json();
          // Handle both { results: [] } and raw array formats
          results = Array.isArray(rawData) ? rawData : (rawData.results || []);
        } else {
          console.warn(`[D1] Fetch failed for ${tableName}, falling back to R2...`);
          results = await fetchFromR2<any>(tableName);
        }
      } else {
        results = await fetchFromR2<any>(tableName);
      }

      let transformed = results.map(item => transform ? transform(item) : (item as unknown as T));

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
      if (transformed.length === 0 && data.length > 0) {
        console.warn(`[useCollection] Fetch for ${tableName} returned 0 items, keeping current state of ${data.length} items to avoid flickering.`);
        return;
      }

      setData(transformed.length === 0 && initialData.length > 0 ? initialData : transformed);
      setError(null);
    } catch (err: any) {
      console.error(`${source} fetch error (${tableName}):`, err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [colName, enabled, orderByField, orderDirection, useAdminPath]);

  const loadMore = () => { console.warn("loadMore not implemented"); };
  return [data, setData, isLoading, loadMore, error, fetchData] as const;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log("DataProvider Render:", { hasChildren: !!children });
  const { user, updateUserProfile } = useAuth();

  // Determine roles for conditional fetching
  const isAdmin = user?.role === 'admin';
  const isSubscriber = user?.isSubscriber || isAdmin;

  // -- REALTIME DATA SUBSCRIPTIONS --

  // Site Config (R2)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(INITIAL_CONFIG);

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

  useEffect(() => {
    fetchConfig();

    // Poll for config updates every 60 seconds
    const interval = setInterval(fetchConfig, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Public Collections (R2)
  // Public Collections
  const [products, setProducts, productsLoading, , productsError, refreshProducts] = useCollection<Product>('products', PRODUCTS, true, mapR2Product, 'createdAt', 'desc', 'D1', isAdmin);
  const [mixtapes, setMixtapes, mixtapesLoading, , mixtapesError, refreshMixtapes] = useCollection<Mixtape>('mixtapes', FEATURED_MIXTAPES, true, mapR2Mixtape, 'createdAt', 'desc', 'D1', isAdmin);
  const [sessionTypes, setSessionTypes, sessionTypesLoading, , , refreshSessionTypes] = useCollection<SessionType>('sessionTypes', [], true, mapR2SessionType, 'createdAt', 'desc', 'D1', isAdmin);
  const [studioEquipment, setStudioEquipment, equipmentLoading, , , refreshEquipment] = useCollection<StudioEquipment>('studioEquipment', INITIAL_STUDIO_EQUIPMENT, true, mapD1StudioEquipment, 'createdAt', 'desc', 'D1', isAdmin);
  const [subscriptionPlans, setSubscriptionPlans, plansLoading, , , refreshPlans] = useCollection<SubscriptionPlan>('subscriptionPlans', SUBSCRIPTION_PLANS, true, mapR2Plan, 'price', 'asc', 'D1', isAdmin);

  const [shippingZones, setShippingZones, zonesLoading, , , refreshZones] = useCollection<ShippingZone>('shippingZones', INITIAL_SHIPPING_ZONES, true, mapR2Generic, 'createdAt', 'desc');
  const [genres, setGenres, genresLoading, , , refreshGenres] = useCollection<Genre>('genres', INITIAL_GENRES, true, mapR2Genre, 'createdAt', 'desc');
  const [youtubeVideos, setYoutubeVideos, videosLoading, , , refreshVideos] = useCollection<Video>('youtubeVideos', [], true, mapR2Generic, 'createdAt', 'desc');


  // Pool tracks: fetch directly from our Cloudflare Worker proxying KV caching to avoid DB lag
  const [poolTracks, setPoolTracks] = useState<Track[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState<Error | null>(null);
  const [poolPagination, setPoolPagination] = useState({ page: 1, limit: 50, totalRecords: 0, totalPages: 0 });

  const refreshPoolTracks = async (filters: any = {}) => {
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

      const qs = params.toString();
      const url = `${STORAGE_WORKER_URL}/api/pool/tracks${qs ? '?' + qs : ''}`;

      const response = await fetch(url, {
        headers: authHeader,
        cache: 'no-store'
      });
      if (response.ok) {
        const result = await response.json();
        const tracksArray = result.tracks || [];
        console.log(`[DataContext] Fetched ${tracksArray.length} pool tracks from D1`);
        
        // If it's page 1, replace. If it's > 1, append.
        if (filters.page && filters.page > 1) {
          setPoolTracks(prev => [...prev, ...tracksArray.map(mapR2Track)]);
        } else {
          setPoolTracks(tracksArray.map(mapR2Track));
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
  };

  useEffect(() => {
    refreshPoolTracks({ page: 1, limit: 50 });
    // Refresh pool tracks periodically 
    const interval = setInterval(() => refreshPoolTracks({ page: 1, limit: 50 }), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Scanned Tracks (R2) - Only for admins
  const [scannedTracks, setScannedTracks, scannedLoading, , , refreshScannedTracks] = useCollection<any>('scannedTracks', [], isAdmin, (d) => d, 'created_at', 'desc');

  // Auto-deduplicate scanned tracks on load and periodically for admins
  useEffect(() => {
    if (isAdmin && scannedTracks.length > 0) {
      const unique = new Map();
      let hasDuplicates = false;

      scannedTracks.forEach((t: any) => {
        const key = t.downloadUrl || t.url || t.id;
        if (!unique.has(key)) {
          unique.set(key, t);
        } else {
          hasDuplicates = true;
        }
      });

      if (hasDuplicates) {
        console.log(`🧹 Found and removing ${scannedTracks.length - unique.size} duplicates from scanned tracks.`);
        const cleaned = Array.from(unique.values());
        setScannedTracks(cleaned);
        saveToR2('scanned_tracks', cleaned).catch(err => console.error("Failed to persist cleaned scanned tracks:", err));
      }
    }
  }, [isAdmin, scannedTracks.length]);

  const [orders, , ordersLoading, , ordersError, refreshOrders] = useCollection<Order>('orders', [], true, mapR2Order, 'createdAt', 'desc', 'D1', isAdmin);
  const [users, setUsers, usersLoading, , usersError, refreshUsers] = useCollection<User>('profiles', [], true, mapR2User, 'createdAt', 'desc', 'D1', isAdmin);

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

  const [subscriptions, , subscriptionsLoading, , subscriptionsError, refreshSubscriptions] = useCollection<Subscription>('subscriptions', [], true, mapR2Subscription, 'startDate', 'desc', 'D1', isAdmin);
  const [bookings, , bookingsLoading, , bookingsError, refreshBookings] = useCollection<Booking>('bookings', [], true, mapR2Booking, 'createdAt', 'desc', 'D1', isAdmin);

  const [studioRooms, , studioRoomsLoading, , , refreshRooms] = useCollection<StudioRoom>('studio_rooms', [], true, mapD1StudioRoom, 'createdAt', 'desc', 'D1', isAdmin);
  const [maintenanceLogs, , maintenanceLogsLoading, , , refreshLogs] = useCollection<MaintenanceLog>('maintenance_logs', [], true, mapD1MaintenanceLog, 'createdAt', 'desc', 'D1', isAdmin);
  const [coupons, , couponsLoading, , , refreshCoupons] = useCollection<Coupon>('coupons', [], true, mapR2Coupon, 'createdAt', 'desc', 'D1', isAdmin);
  const [referralStats, , referralStatsLoading, , , refreshReferrals] = useCollection<ReferralStats>('referral_stats', [], true, mapR2ReferralStats, 'createdAt', 'desc', 'D1', isAdmin);
  const [referralLogs, , referralLogsLoading, , , refreshReferralLogs] = useCollection<ReferralLog>('referral_logs', [], true, mapD1ReferralLog, 'createdAt', 'desc', 'D1', isAdmin);
  const [newsletterCampaigns, , campaignsLoading, , , refreshCampaigns] = useCollection<NewsletterCampaign>('newsletter_campaigns', [], true, mapR2Campaign, 'createdAt', 'desc', 'D1', isAdmin);
  const [newsletterSegments, , segmentsLoading, , , refreshSegments] = useCollection<NewsletterSegment>('newsletter_segments', [], true, mapR2Generic, 'createdAt', 'desc', 'R2', isAdmin);
  const [subscribers, , subscribersLoading, , , refreshSubscribers] = useCollection<NewsletterSubscriber>('newsletter_subscribers', [], true, mapR2Subscriber, 'date_subscribed', 'desc', 'D1', isAdmin);
  const [telegramChannels, , tgChannelsLoading, , , refreshTelegramChannels] = useCollection<TelegramChannel>('telegram_channels', [], true, mapR2Channel, 'createdAt', 'desc', 'R2', isAdmin);
  const [payments, , paymentsLoading, , , refreshPayments] = useCollection<any>('payments', [], true, mapR2Tip, 'createdAt', 'desc', 'R2', isAdmin);
  const [tips, , tipsLoading, , , refreshTips] = useCollection<any>('tips', [], true, mapR2Tip, 'createdAt', 'desc', 'D1', isAdmin);

  // NEW collections for Admin Dashboard
  const [studioSessions, , studioSessionsLoading, , , refreshStudioSessions] = useCollection<StudioSession>('studio_sessions', [], true, undefined, 'created_at', 'desc', 'D1', isAdmin);
  const [eventGigs, , eventGigsLoading, , , refreshEventGigs] = useCollection<EventGig>('event_gigs', [], true, undefined, 'created_at', 'desc', 'D1', isAdmin);

  const [telegramMappings] = useCollection<TelegramMapping>('telegram_mappings', [], true, mapR2Generic, 'createdAt', 'desc', 'R2', isAdmin);
  const [telegramUsers] = useCollection<TelegramUser>('telegram_users', [], true, mapR2Generic, 'createdAt', 'desc', 'R2', isAdmin);
  const [telegramLogs] = useCollection<TelegramLog>('telegram_logs', [], true, mapR2Generic, 'timestamp', 'desc', 'R2', isAdmin);
  const [contactMessages, , messagesLoading, , , refreshContactMessages] = useCollection<ContactMessage>('contact_messages', [], true, mapR2Generic, 'createdAt', 'desc', 'D1', isAdmin);

  const [reviews, , reviewsLoading, , , refreshReviews] = useCollection<Review>('reviews', [], true, (r) => ({ ...r, date: r.date || r.created_at }), 'date', 'desc', 'D1', isAdmin);
  const [comments, , commentsLoading, , , refreshComments] = useCollection<any>('comments', [], true, (c) => ({ ...c, date: c.date || c.created_at }), 'date', 'desc', 'D1', isAdmin);
  const [syncNotifications, , syncNotificationsLoading, , , refreshSyncNotifications] = useCollection<any>('syncNotifications', [], true, undefined, 'created_at', 'desc', 'D1', isAdmin);
  const [notifications, setNotifications, notificationsLoading, , , refreshNotifications] = useCollection<AppNotification>('notifications', [], true, mapR2Notification, 'createdAt', 'desc', 'R2', isAdmin);

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
  };  // Admin Data Polling
  useEffect(() => {
    if (!isAdmin) return;

    // Poll for high-priority admin data every 2 minutes
    const interval = setInterval(() => {
      refreshOrders();
      refreshUsers();
      refreshSubscriptions();
      refreshBookings();
      refreshPayments();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAdmin, refreshOrders, refreshUsers, refreshSubscriptions, refreshBookings, refreshPayments]);

  const checkSubscriptionExpiry = async (profiles: any[], userSubscriptions: any[]) => {
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
      // Create a notification for expired
      const notifId = `exp_${user.id}_${expiryDate.getTime()}`;
      // Only add if not already notified for this expiry
      const existing = (await fetchFromR2<any[]>('notifications')) || [];
      const alreadyNotified = existing.some((n: any) => n.userId === user.id && n.id === notifId);

      if (!alreadyNotified) {
        await addR2Item('notifications', {
          id: notifId,
          userId: user.id,
          title: 'Subscription Expired',
          message: `Your ${userProfile.subscription_plan || 'Music Pool'} access has expired. Please renew to continue downloading.`,
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
        if (typeof refreshNotifications === 'function') refreshNotifications();
      }
    }
  };

  useEffect(() => {
    if (user && users.length > 0) {
      checkSubscriptionExpiry(users, subscriptions);
    }
  }, [user?.id, users.length, subscriptions.length]);

  const startFreeTrial = async () => {
    if (!user) return { success: false, message: 'Please login first.' };

    try {
      const allProfiles = await fetchFromR2<any>('profiles');
      const profile = allProfiles.find((p: any) => p.id === user.id);

      if (profile?.has_used_trial || profile?.hasUsedTrial) {
        return { success: false, message: 'You have already used your free trial.' };
      }

      // Promo expiry check
      const promoExpiry = new Date('2026-04-04T23:59:59Z');
      if (Date.now() > promoExpiry.getTime()) {
        return { success: false, message: 'This promotion has ended (Expired April 4th).' };
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const updates = {
        is_subscriber: true,
        subscription_plan: 'trial',
        subscription_expiry: expiryDate.toISOString(),
        has_used_trial: true,
        updated_at: new Date().toISOString()
      };

      await saveToD1('profiles', 'PUT', updates, user.id);

      // Also record as a "free" subscription for admin tracking
      const subId = `sub_trial_${user.id}_${Date.now()}`;
      await saveToD1('subscriptions', 'POST', {
        id: subId,
        user_id: user.id,
        user_name: user.name || user.email,
        user_email: user.email,
        plan_id: 'trial',
        amount: 0,
        start_date: new Date().toISOString(),
        expiry_date: expiryDate.toISOString(),
        status: 'active',
        payment_method: 'Trial'
      });

      if (typeof refreshUsers === 'function') refreshUsers();
      if (typeof refreshSubscriptions === 'function') refreshSubscriptions();

      return { success: true, message: 'Free trial activated! Enjoy 10 downloads per day for 7 days.' };
    } catch (err: any) {
      console.error("Trial activation error:", err);
      return { success: false, message: 'Failed to activate trial: ' + err.message };
    }
  };

  const applyReferralCode = async (code: string) => {
    if (!referralSettings.enabled) return { success: false, message: 'Referral system is currently disabled.' };

    const normalizedCode = (code || '').trim().toUpperCase();

    // 1. Check for Administrative Coupons first
    const activeCoupon = coupons.find(c => c.active && c.code.toUpperCase() === normalizedCode);
    if (activeCoupon) {
      // Basic check for expiry
      if (activeCoupon.expiryDate && new Date(activeCoupon.expiryDate).getTime() < Date.now()) {
        return { success: false, message: 'This promo code has expired.' };
      }

      // Check for usage limit
      if (activeCoupon.usageLimit > 0 && activeCoupon.usageCount >= activeCoupon.usageLimit) {
        return { success: false, message: 'This promo code has reached its maximum usage limit.' };
      }

      // NEW: Check for Target User Assignment
      if (activeCoupon.assignedUserId && activeCoupon.assignedUserId !== user?.id) {
        return { success: false, message: 'This promo code is not valid for your account.' };
      }

      // NEW: Check for Single Use status (if already used by THIS user)
      // Since we don't have a reliable usage log per user for every coupon yet,
      // we'll assume if it's single-use and usageCount > 0 OR if we can verify in user's profile
      // But for a true "One-time" globally, usageCount check is enough.
      // If it's single use PER USER, we'd need a different check. 
      // Given the requirement "coupons that can ONLY be used once", globally OR per user?
      // Usually "single-use" in this context means globally unique or once per user.
      // Let's assume once per user or globally unique depending on intent.
      // If usageLimit is 1, it's globally unique.
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

    // 2. Special handling for legacy/hardcoded PROMO_DISCOUNT if not in coupons
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

    // 3. Check for User Referral Codes (Auto-generated)
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
  };

  const issueReferralReward = async (referrerId: string, refereeId: string, refereeName: string) => {
    try {
      const settings = await fetchFromR2<any>('settings');
      const refSettings = settings.find(s => s.id === 'referralSettings')?.data;
      const rewardAmount = refSettings?.referrerRewardAmount || 50;

      // 1. Log the referral
      // 1. Log the referral action in D1
      const logEntry = {
        referrer_id: referrerId,
        referred_id: refereeId,
        action_type: 'subscription',
        reward_type: 'kes',
        reward_amount: rewardAmount,
        created_at: new Date().toISOString()
      };
      await saveToD1('referral_logs', 'POST', logEntry);

      // 2. Update referral stats in D1
      // Note: Backend might handle this via triggers, but for immediate UI update we refresh
      
      // 3. Update referrer balance in D1
      const profiles = await fetchFromR2<any>('profiles'); // Profiles still primarily in R2 for some reason? 
      // Actually, balance should be in D1 as per previous sessions.
      const referrer = profiles.find(p => p.id === referrerId);
      if (referrer) {
        await saveToD1('profiles', 'PUT', { balance: (referrer.balance || 0) + rewardAmount }, referrerId);
      }

      refreshReferrals();
      refreshReferralLogs();
      refreshUsers();
      console.log(`[Referral] Issued KES ${rewardAmount} reward to ${referrerId}`);
    } catch (err) {
      console.error('Failed to issue referral reward to R2:', err);
      throw err;
    }
  };

  const seedDatabase = async () => {
    if (!user?.isAdmin) {
      alert("Admin privileges required to seed database.");
      return;
    }

    try {
      await saveToR2('products', PRODUCTS);
      await saveToR2('mixtapes', FEATURED_MIXTAPES);
      await saveToR2('studio_equipment', INITIAL_STUDIO_EQUIPMENT);
      await saveToR2('subscription_plans', SUBSCRIPTION_PLANS);
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
  };

  const updateSiteConfig = async (config: SiteConfig) => {
    try {
      setSiteConfig(config);
      await updateR2Item('settings', 'siteConfig', { data: config, updated_at: new Date().toISOString() });
      alert("Site Configuration saved successfully!");
      if (typeof fetchConfig === 'function') fetchConfig();
    } catch (err: any) {
      console.error("Update site config failed:", err.message);
      alert("Failed to save configuration: " + err.message);
    }
  };


  const addProduct = async (product: Partial<Product>) => {
    try {
      // Respect existing ID/Slug if provided, otherwise generate
      const newProduct = {
        ...product,
        id: product.id || `p${Date.now()}`,
        slug: product.slug || (product.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: product.isActive ?? true
      };

      console.log("[DataContext] Adding product to DB:", newProduct);
      const res = await saveToD1('products', 'POST', newProduct);

      if (res) {
        setProducts(prev => [newProduct as Product, ...prev]);
        console.log("[DataContext] Product cataloged successfully in matrix!");
        
        // Background Sync to R2 for storefront consistency
        addR2Item('products', newProduct).catch(e => console.error("[R2 Sync] Failed to add product:", e));
        
        refreshProducts();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Add product failed:", err.message);
      alert("Failed to add product: " + err.message);
      return false;
    }
  };
  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      const updatedData = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      console.log(`[DataContext] Updating product ${id} via API:`, updatedData);

      const res = await saveToD1('products', 'PUT', updatedData, id);

      if (res) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
        console.log(`[DataContext] Product updated in matrix!`);
        
        // Background Sync to R2 for storefront consistency
        updateR2Item('products', id, updatedData).catch(e => console.error("[R2 Sync] Failed to update product:", e));
        
        refreshProducts();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Update product failed:", err.message);
      alert("Failed to update product: " + err.message);
      return false;
    }
  };
  const deleteProduct = async (id: string) => {
    try {
      const newProducts = products.filter(p => p.id !== id);
      setProducts(newProducts);
      await saveToD1('products', 'DELETE', undefined, id);
      
      // Sync to R2
      removeR2Item('products', id).catch(e => console.error("[R2 Sync] Failed to delete product:", e));
      
      console.log(`[DataContext] Product deleted successfully!`);
    } catch (err: any) {
      console.error("Delete product failed:", err.message);
      alert("Failed to delete product: " + err.message);
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

      // Optimistic update using functional state to avoid closure staleness
      setMixtapes(prev => [mapped, ...prev.filter(m => m.id !== finalId)]);

      const ok = await saveToD1('mixtapes', 'POST', mapped);
      if (!ok) throw new Error("Database insertion failed");

      // Sync to R2
      addR2Item('mixtapes', mapped).catch(e => console.error("[R2 Sync] Failed to add mixtape:", e));

      alert("Mixtape added successfully!");
      refreshMixtapes();
    } catch (err: any) {
      console.error("Add mixtape failed:", err.message);
      alert("Failed to add mixtape: " + err.message);
      // Revert if fetch is desired, but usually silence is better for UX if it's intermittent
    }
  };
  const updateMixtape = async (id: string, data: Partial<Mixtape>) => {
    try {
      setMixtapes(prev => prev.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m));
      const ok = await saveToD1('mixtapes', 'PUT', data, id);
      if (!ok) throw new Error("Database update failed");

      // Sync to R2
      updateR2Item('mixtapes', id, data).catch(e => console.error("[R2 Sync] Failed to update mixtape:", e));

      alert("Mixtape updated successfully!");
      refreshMixtapes();
    } catch (err: any) {
      console.error("Update mixtape failed:", err.message);
      alert("Failed to update mixtape: " + err.message);
    }
  };
  const deleteMixtape = async (id: string) => {
    try {
      const updatedMixtapes = mixtapes.filter(m => m.id !== id);
      setMixtapes(updatedMixtapes);
      await saveToD1('mixtapes', 'DELETE', undefined, id);
      
      // Sync to R2
      removeR2Item('mixtapes', id).catch(e => console.error("[R2 Sync] Failed to delete mixtape:", e));
      alert("Mixtape deleted successfully!");
      if (typeof refreshMixtapes === 'function') refreshMixtapes();
    } catch (err: any) {
      console.error("Delete mixtape failed:", err.message);
      alert("Failed to delete mixtape: " + err.message);
    }
  };


  const addPoolTrack = async (track: Track) => {
    try {
      await addR2Item('pool_tracks', track);
      await syncPoolTrackToD1(track);
      refreshPoolTracks();
    } catch (error: any) {
      console.error("Add track failed:", error.message);
    }
  };

  // Bulk-add many tracks in a SINGLE R2 write (instead of N sequential writes)
  const bulkAddPoolTracks = async (newTracks: Track[], idsToRemoveFromScanned: string[]) => {
    try {
      // 1. Send the new tracks in an addBatch request
      await addBatchR2Items('pool_tracks', newTracks);

      // 2. Sync to D1 in chunks of 50 to avoid worker timeouts/payload limits
      const chunkSize = 50;
      const authHeader = await getAuthHeader();
      for (let i = 0; i < newTracks.length; i += chunkSize) {
        const chunk = newTracks.slice(i, i + chunkSize);
        const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/pool/bulk-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ tracks: chunk }),
        });
        if (!response.ok) {
           const errText = await response.text();
           console.error(`Bulk sync failed for chunk ${i / chunkSize}:`, errText);
           throw new Error(`Bulk sync failed for chunk ${i / chunkSize}`);
        }
      }

      // 3. Update local poolTracks state
      setPoolTracks(prev => [...newTracks, ...(prev || [])]);

      // 4. Remove promoted tracks from scanned_tracks
      if (idsToRemoveFromScanned.length > 0) {
        await removeBatchR2Items('scanned_tracks', idsToRemoveFromScanned);
      }

      // 5. Update local scannedTracks state
      setScannedTracks(prev => (prev || []).filter(t => !idsToRemoveFromScanned.includes(t.id)));

    } catch (error: any) {
      console.error("Bulk add pool tracks failed:", error.message);
      refreshPoolTracks();
      refreshScannedTracks();
      throw error;
    }
  };

  const addScannedTracks = async (tracks: any[]) => {
    try {
      // Robust Deduplication: Use a Map to ensure unique downloadUrls/IDs locally first
      const uniqueIncoming = new Map();
      tracks.forEach(t => {
        const key = t.downloadUrl || t.url || t.id;
        if (key && !uniqueIncoming.has(key)) {
          uniqueIncoming.set(key, t);
        }
      });

      setScannedTracks(prev => {
        // Filter out those that already exist in our LATEST scannedTracks state
        const existingKeys = new Set((prev || []).map((st: any) => st.downloadUrl || st.url || st.id));
        const newUniqueItems = Array.from(uniqueIncoming.values()).filter((ni: any) => {
          const key = ni.downloadUrl || ni.url || ni.id;
          return !existingKeys.has(key);
        });

        if (newUniqueItems.length === 0) return prev || [];

        // Merge newest first (new tracks at the front)
        const merged = [...newUniqueItems, ...(prev || [])].slice(0, 50000);

        // Persist to R2 in background
        saveToR2('scanned_tracks', merged).catch(err => {
          console.error("Delayed R2 save error for scanned_tracks add:", err);
        });

        return merged;
      });
    } catch (err: any) {
      console.error("Add scanned tracks failed:", err.message);
      refreshScannedTracks();
    }
  };

  const clearAllScannedTracks = async () => {
    try {
      const allIds = scannedTracks.map((t: any) => t.id).filter(Boolean);
      setScannedTracks([]);
      if (allIds.length > 0) {
        await removeBatchR2Items('scanned_tracks', allIds);
      } else {
        await saveToR2('scanned_tracks', []);
      }
    } catch (err: any) {
      console.error("Clear scanned tracks failed:", err.message);
      refreshScannedTracks();
    }
  };

  const loadMorePoolTracks = async (limit: number = 5000) => {
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
  };

  const updatePoolTrack = async (id: string, data: Partial<Track>) => {
    try {
      await updateR2Item('pool_tracks', id, data);
      
      const existingTrack = poolTracks.find(t => t.id === id);
      if (existingTrack) {
        await syncPoolTrackToD1({ ...existingTrack, ...data });
      }
      
      refreshPoolTracks();
    } catch (error: any) {
      console.error("Update track failed:", error.message);
    }
  };

  const deletePoolTrack = async (id: string) => {
    try {
      await removeR2Item('pool_tracks', id);
      await deletePoolTrackFromD1(id);
      refreshPoolTracks();
    } catch (err: any) {
      console.error("Delete track failed:", err.message);
    }
  };

  const deployPoolToStorefront = async () => {
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
  };

  const updateGenre = async (id: string, data: Partial<Genre>) => {
    try {
      const updatedGenres = genres.map(g => g.id === id ? { ...g, ...data, updatedAt: new Date().toISOString() } : g);
      setGenres(updatedGenres);
      await saveToR2('genres', updatedGenres);
      
      // Sync to D1
      await syncGenresToD1(updatedGenres);
      
      console.log("Genre updated on R2 & D1");
    } catch (err: any) {
      console.error("Update genre failed:", err.message);
    }
  };

  const addBooking = async (booking: Booking) => {
    try {
      const path = booking.serviceType === 'studio' ? '/api/bookings/studio' : '/api/bookings/gig';
      const endpoint = `${STORAGE_WORKER_URL}${path}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add booking');
      
      alert(`Booking ${result.success ? 'saved' : 'failed'}`);
      refreshBookings();
    } catch (err: any) {
      console.error("Add booking failed:", err.message);
    }
  };

  const updateBooking = async (id: string, data: Partial<Booking>) => {
    try {
      const type = data.serviceType === 'studio' ? 'studio' : 'gig';
      // Use bookings/${type} - saveToD1 prepends /api/admin
      const res = await saveToD1(`bookings/${type}`, 'PATCH', data, id);
      if (res) {
        alert("Booking updated in D1");
        refreshBookings();
      }
    } catch (err: any) {
      console.error("Update booking failed:", err.message);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    return updateBooking(id, { status } as any);
  };

  const addSessionType = async (session: SessionType) => {
    try {
      const ok = await saveToD1('session_types', 'POST', session);
      if (ok) refreshSessionTypes();
    } catch (err: any) {
      console.error("Add session type failed:", err.message);
    }
  };
  const updateSessionType = async (id: string, data: Partial<SessionType>) => {
    try {
      const ok = await saveToD1('session_types', 'PATCH', data, id);
      if (ok) refreshSessionTypes();
    } catch (err: any) {
      console.error("Update session type failed:", err.message);
    }
  };

  const deleteSessionType = async (id: string) => {
    try {
      const ok = await saveToD1('session_types', 'DELETE', undefined, id);
      if (ok) refreshSessionTypes();
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

  const deleteStudioEquipment = async (id: string) => {
    try {
      const ok = await saveToD1('studio/gear', 'DELETE', undefined, id);
      if (ok) refreshEquipment();
    } catch (err: any) {
      console.error("Delete equipment failed:", err.message);
    }
  };

  const addSubscription = async (sub: Subscription) => {
    try {
      const finalId = sub.id || `sub${Date.now()}`;
      const newSub = { ...sub, id: finalId, updatedAt: new Date().toISOString() };
      const newSubs = [newSub, ...subscriptions];
      await saveToR2('subscriptions', newSubs);
      refreshSubscriptions();
    } catch (err: any) {
      console.error("Add subscription failed:", err.message);
    }
  };

  const isFirstTimeSubscriber = async (userId: string): Promise<boolean> => {
    try {
      // Find user in local state
      const u = users.find(user => user.id === userId);
      if (u) return !u.hasUsedTrial;

      // Fallback: Check subscriptions (legacy)
      const hasPastSubs = subscriptions.some(s => s.userId === userId);
      return !hasPastSubs;
    } catch (err) {
      return true;
    }
  };
  const updateSubscription = async (id: string, data: Partial<Subscription>) => {
    try {
      // 1. Update in R2
      const newSubs = subscriptions.map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
      await saveToR2('subscriptions', newSubs);

      // 2. Sync changes to User Profile (R2)
      const sub = subscriptions.find(s => s.id === id);
      if (sub && sub.userId) {
        const profileUpdate: any = { updatedAt: new Date().toISOString() };
        if (data.status === 'active') {
          profileUpdate.isSubscriber = true;
          if (data.expiryDate) profileUpdate.subscriptionExpiry = data.expiryDate;
        } else if (data.status) {
          profileUpdate.isSubscriber = false;
        }
        if (data.expiryDate) {
          profileUpdate.subscriptionExpiry = data.expiryDate;
        }

        if (Object.keys(profileUpdate).length > 1) { // more than just updatedAt
          await saveToD1('profiles', 'PUT', profileUpdate, sub.userId);
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
      const ok = await saveToD1('subscription_plans', 'POST', plan);
      if (ok) refreshPlans();
    } catch (err: any) {
      console.error("Add plan failed:", err.message);
    }
  };

  const updateSubscriptionPlan = async (id: string, data: Partial<SubscriptionPlan>) => {
    try {
      const ok = await saveToD1('subscription_plans', 'PATCH', data, id);
      if (ok) refreshPlans();
    } catch (error: any) {
      console.error("Update plan failed:", error.message);
    }
  };

  const deleteSubscriptionPlan = async (id: string) => {
    try {
      const ok = await saveToD1('subscription_plans', 'DELETE', undefined, id);
      if (ok) refreshPlans();
    } catch (err: any) {
      console.error("Delete plan failed:", err.message);
    }
  };

  const addStudioRoom = async (room: StudioRoom) => {
    try {
      const ok = await saveToD1('studio/locations', 'POST', room);
      if (ok) refreshRooms();
    } catch (err: any) {
      console.error("Add room failed:", err.message);
    }
  };
  const updateStudioRoom = async (id: string, data: Partial<StudioRoom>) => {
    try {
      const ok = await saveToD1('studio/locations', 'PATCH', data, id);
      if (ok) refreshRooms();
    } catch (err: any) {
      console.error("Update room failed:", err.message);
    }
  };

  const deleteStudioRoom = async (id: string) => {
    try {
      const ok = await saveToD1('studio/locations', 'DELETE', undefined, id);
      if (ok) refreshRooms();
    } catch (err: any) {
      console.error("Delete room failed:", err.message);
    }
  };

  const addMaintenanceLog = async (log: MaintenanceLog) => {
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
  };

  const updateMaintenanceLog = async (id: string, data: Partial<MaintenanceLog>) => {
    try {
      const payload: any = {};
      if (data.description) payload.issue = data.description;
      if (data.status) payload.status = data.status;
      
      const ok = await saveToD1('studio/maintenance', 'PATCH', payload, id);
      if (ok) refreshLogs();
    } catch (err: any) {
      console.error("Update log failed:", err.message);
    }
  };

  const addOrder = async (order: Order) => {
    try {
      const newOrders = [order, ...orders];
      // Save directly to D1
      await saveToD1('orders', 'POST', order);
      refreshOrders();
    } catch (err: any) {
      console.error("Add order failed:", err.message);
    }
  };

  const updateOrder = async (id: string, data: Partial<Order>) => {
    try {
      const newOrders = orders.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o);
      // Save directly to D1
      await saveToD1('orders', 'PUT', data, id);
      refreshOrders();
    } catch (err: any) {
      console.error("Update order failed:", err.message);
    }
  };


  const addCampaign = async (camp: NewsletterCampaign) => {
    try {
      const ok = await saveToD1('newsletter_campaigns', 'POST', camp);
      if (ok) refreshCampaigns();
    } catch (err: any) {
      console.error("Add campaign failed:", err.message);
    }
  };

  const updateCampaign = async (id: string, data: Partial<NewsletterCampaign>) => {
    try {
      const ok = await saveToD1('newsletter_campaigns', 'PATCH', data, id);
      if (ok) refreshCampaigns();
    } catch (err: any) {
      console.error("Update campaign failed:", err.message);
    }
  };

  const addCoupon = async (coupon: Partial<Coupon>) => {
    try {
      const dbCoupon = mapCouponToD1(coupon);
      const ok = await saveToD1('coupons', 'POST', dbCoupon);
      if (ok) refreshCoupons();
    } catch (err: any) {
      console.error("Add coupon failed:", err.message);
    }
  };

  const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    try {
      const dbCoupon = mapCouponToD1(data);
      const ok = await saveToD1('coupons', 'PATCH', dbCoupon, id);
      if (ok) refreshCoupons();
    } catch (err: any) {
      console.error("Update coupon failed:", err.message);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const ok = await saveToD1('coupons', 'DELETE', undefined, id);
      if (ok) refreshCoupons();
    } catch (err: any) {
      console.error("Delete coupon failed:", err.message);
    }
  };

  const validateCoupon = async (code: string): Promise<{ success: boolean; coupon?: Coupon; message?: string }> => {
    try {
      // Fetch from D1 via our worker API
      const authHeader = await getAuthHeader();
      const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/coupons?t=${Date.now()}`, {
          headers: authHeader,
          cache: 'no-store'
      });
      
      if (!response.ok) throw new Error("Failed to fetch coupons for validation");
      
      const rawData = await response.json();
      const allCoupons = Array.isArray(rawData) ? rawData : (rawData.results || []);
      const couponData = allCoupons.find((c: any) => c.code === code.toUpperCase() && (c.is_active || c.isActive));

      if (!couponData) {
        return { success: false, message: 'Invalid or expired coupon code.' };
      }

      const coupon = mapR2Coupon(couponData);
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

  const addSubscriber = async (email: string, source: string = 'newsletter') => {
    try {
      // Optimistic check
      if (subscribers.some(s => s.email.toLowerCase() === email.toLowerCase())) {
        return;
      }

      const response = await fetch(`${STORAGE_WORKER_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response from /api/subscribe:", text);
        throw new Error(response.status === 500 ? "Server Error (500)" : "Unexpected response format");
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to subscribe');
      }

      // Refresh the subscribers list from R2
      refreshSubscribers();
      return data; // Return data if successful
    } catch (error: any) {
      console.error('Add subscriber failed:', error.message);
      throw error; // Propagate to UI
    }
  };

  const sendEmail = async (data: { to: string | string[]; subject: string; html: string; text?: string }) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}` // Simple auth check if needed
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Email send error:", error);
      return { success: false, message: error.message };
    }
  };

  const sendNewsletterConfirmation = async (email: string) => {
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
  };

  const uploadTrackList = async (file: File): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Simple parser: Artist - Title [Genre]
      // Or search for specific patterns
      const parsedTracks: Partial<Track>[] = lines.map(line => {
        let artist = 'Unknown Artist';
        let title = line.trim();
        let genre = 'General';

        // Check for artist - title
        if (line.includes(' - ')) {
          [artist, title] = line.split(' - ').map(s => s.trim());
        }

        // Check for genre in brackets [Genre]
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

      // Update poolTracks state
      const updatedPool = [...(parsedTracks as Track[]), ...poolTracks];
      setPoolTracks(updatedPool);
      await saveToR2('pool_tracks', updatedPool);

      return { success: true, message: `Successfully parsed and added ${parsedTracks.length} track references.`, count: parsedTracks.length };
    } catch (err: any) {
      console.error("List upload failed:", err);
      return { success: false, message: err.message };
    }
  };

  const downloadTrackList = () => {
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
  };




  const updateUser = async (id: string, data: Partial<User>) => {
    try {
      const ok = await saveToD1('users', 'PUT', data, id);
      if (ok) refreshUsers();
    } catch (err: any) {
      console.error("Update user failed:", err.message);
    }
  };

  const addPayment = async (payment: any) => {
    try {
      const newPayment = {
        ...payment,
        id: payment.id || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: payment.createdAt || new Date().toISOString()
      };
      
      const currentPayments = payments || [];
      await saveToR2('payments', [newPayment, ...currentPayments]);
      refreshPayments();
    } catch (err: any) {
      console.error("Add payment failed:", err.message);
    }
  };

  const addTip = async (tip: any) => {
    try {
      const newTip = {
        ...tip,
        id: tip.id || `tip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: tip.createdAt || new Date().toISOString()
      };
      
      const currentTips = tips || [];
      await saveToR2('tips', [newTip, ...currentTips]);
      
      // Also try saving to D1 for admin dashboard table.
      // D1 schema expects specific fields for tips based on mapR2Tip parsing
      try {
        const d1Payload = {
            id: newTip.id,
            amount: newTip.amount,
            message: newTip.message,
            donor_name: newTip.customerName || 'Guest Tipper',
            donor_email: newTip.email || newTip.userEmail || 'guest@djflowerz.co.ke',
            status: newTip.status || 'completed',
            created_at: newTip.createdAt
        };
        await saveToD1('tips', 'POST', d1Payload);
      } catch (e) {
        console.warn("Failed to sync tip to D1, but saved to R2", e);
      }
      
      refreshTips();
    } catch (err: any) {
      console.error("Add tip failed:", err.message);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const ok = await saveToD1('orders', 'DELETE', undefined, id);
      if (ok) refreshOrders();
    } catch (err: any) {
      console.error("Delete order failed:", err.message);
    }
  };

  const deleteMaintenanceLog = async (id: string) => {
    try {
      const ok = await saveToD1('maintenance_logs', 'DELETE', undefined, id);
      if (ok) refreshLogs();
    } catch (err: any) {
      console.error("Delete maintenance log failed:", err.message);
    }
  };

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

  const deleteMessage = async (id: string) => {
    try {
      const ok = await saveToD1('support/tickets', 'DELETE', undefined, id);
      if (ok) refreshContactMessages();
    } catch (err: any) {
      console.error("Delete message failed:", err.message);
    }
  };

  const updateContactMessage = async (id: string, updates: Partial<ContactMessage>) => {
    try {
      const res = await saveToD1('support/tickets', 'PATCH', updates, id);
      if (res) {
        alert("Message updated in D1");
        refreshContactMessages();
      }
    } catch (err: any) {
      console.error("Update contact message failed:", err.message);
    }
  };

  const removeUser = async (id: string) => {
    try {
      const ok = await saveToD1('users', 'DELETE', undefined, id);
      if (ok) refreshUsers();
    } catch (err: any) {
      console.error("Remove user failed:", err.message);
    }
  };

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

  const addComment = async (mixtapeId: string, text: string) => {
    try {
      if (!user) throw new Error('Must be logged in to comment');

      const payload = {
        mixtapeId,
        userName: user.full_name || user.name || 'User',
        text: text
      };

      const response = await fetch(`${STORAGE_WORKER_URL}/api/mixtapes/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save comment');

      refreshComments();
    } catch (err: any) {
      console.error("Add comment failed:", err.message);
    }
  };

  const addNotification = async (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    try {
      const newNotif: AppNotification = {
        ...notif,
        id: `notif_${Date.now()}`,
        createdAt: new Date().toISOString(),
        read: false
      };

      const currentNotifications = notifications || [];
      await saveToR2('notifications', [newNotif, ...currentNotifications]);
      refreshNotifications();
    } catch (err: any) {
      console.error("Add notification failed:", err.message);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const newNotifications = (notifications || []).map(n => n.id === id ? { ...n, read: true } : n);
      setNotifications(newNotifications);
      await saveToR2('notifications', newNotifications);
    } catch (err: any) {
      console.error("Mark notification read failed:", err.message);
    }
  };

  const clearNotifications = async () => {
    try {
      setNotifications([]);
      await saveToR2('notifications', []);
    } catch (err: any) {
      console.error("Clear notifications failed:", err.message);
    }
  };

  const incrementMixtapeDownload = async (mixtapeId: string) => {
    try {
      // In R2, we update the mixtape's download count directly
      const newMixtapes = mixtapes.map(m => m.id === mixtapeId ? { ...m, downloadsCount: (m.downloadsCount || 0) + 1 } : m);
      await saveToR2('mixtapes', newMixtapes);

      // Update local state
      setMixtapes(newMixtapes);
    } catch (err) {
      console.error("Increment download error:", err);
    }
  };

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
    shippingZones,
    subscribers,
    subscriptions,
    subscriptionPlans,
    studioRooms,
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
    studioRoomsLoading: studioRoomsLoading || false,
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
    studioSessions,
    eventGigs,
    studioSessionsLoading: studioSessionsLoading || false,
    eventGigsLoading: eventGigsLoading || false,
    hasQuotaExceeded: false,
    uploadTrackList,
    downloadTrackList,

    seedDatabase,
    updateSiteConfig,
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
    updateShippingZone,
    addSubscriber,
    updateUser,
    removeUser,
    addContactMessage,
    updateContactMessage,
    deleteMessage,
    addReview,
    addComment,
    markNotificationAsRead,
    clearNotifications,
    incrementMixtapeDownload,
    isFirstTimeSubscriber,
    sendEmail,
    sendNewsletterConfirmation,
    addScannedTracks,
    clearAllScannedTracks,
    deleteScannedTrack: async (id: string) => {
      setScannedTracks(prev => {
        const next = (prev || []).filter((t: any) => t.id !== id);
        // Persist to R2
        saveToR2('scanned_tracks', next).catch(err => {
          console.error("Delayed R2 save error for scanned_tracks delete:", err);
        });
        return next;
      });
    },

    refreshProducts, refreshMixtapes, refreshOrders, refreshUsers, refreshSubscriptions,
    refreshBookings, refreshSubscribers, refreshCampaigns, refreshPayments, refreshTips,
    refreshEquipment, refreshRooms, refreshLogs, refreshSessionTypes,
    refreshStudioSessions, refreshEventGigs,
    refreshScannedTracks, refreshPoolTracks, refreshGenres, refreshVideos, refreshPlans, refreshZones, refreshCoupons, refreshReferrals, refreshTelegramChannels, refreshContactMessages, refreshReviews, refreshComments,
    messages: contactMessages // Alias for component compatibility
  }), [
    siteConfig, products, mixtapes, bookings, sessionTypes, youtubeVideos, poolTracks, poolPagination, genres, studioEquipment, shippingZones, subscribers, subscriptions, orders, newsletterCampaigns, newsletterSegments,
    subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users, referralLogs, contactMessages, scannedTracks,
    notifications,
    notificationsLoading,
    syncNotifications,
    syncNotificationsLoading,
    payments, tips, reviews, comments,
    telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
    mixtapesLoading, productsLoading, ordersLoading, usersLoading, subscriptionsLoading, bookingsLoading, subscribersLoading, campaignsLoading, paymentsLoading, tipsLoading,
    equipmentLoading, studioRoomsLoading, maintenanceLogsLoading, sessionTypesLoading, reviewsLoading, commentsLoading,
    poolError, mixtapesError, productsError, ordersError, usersError, subscriptionsError, bookingsError,
    studioSessions, eventGigs, studioSessionsLoading, eventGigsLoading,
    referralSettings
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
