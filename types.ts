
export interface MixtapeTrack {
  id: string;
  position: number;
  artist: string;
  title: string;
  timestamp: string;
  label?: string;
}

export interface Mixtape {
  id: string;
  title: string;
  slug: string;
  genre: string;
  description: string;
  releaseDate: string;
  status: 'draft' | 'published' | 'unlisted';
  coverUrl: string;
  audioUrl: string;
  duration: string;
  previewStartTime?: string;
  allowFullStream: boolean;
  allowDownload: boolean;
  downloadType: 'free' | 'logged_in' | 'music_pool';
  streamQuality: 'standard' | 'high';
  tracklist: MixtapeTrack[];
  isFeatured: boolean;
  showInGallery: boolean;
  showInMusicPool: boolean;
  tags: string[];
  enableComments: boolean;
  requireLoginToComment: boolean;
  moderateComments: boolean;
  downloadUrl?: string;
  videoDownloadUrl?: string;
  downloadLimit?: number;
  downloadExpiryDays?: number;
  requiredTier?: string;
  youtubeUrl?: string;
  soundcloudUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  isExclusive: boolean;
  date?: string;
  downloadsCount?: number;
  commentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}


export interface ProductVariant {
  id: string;
  name: string; // e.g. "1TB", "Gold", "Large"
  price: number;
  discountPrice?: number;
  compareAtPrice?: number;
  stock?: number;
  stock_quantity?: number; // DB field name
  sku?: string;
  image?: string;
  image_url?: string; // DB field name
  weight?: number;
}

export interface ProductVariantGroup {
  name: string; // e.g. "Storage", "Color", "Size"
  options?: string[]; // Legacy/Simple
  variants?: ProductVariant[]; // Detailed/Nested structure from Admin
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  type: 'physical' | 'digital' | 'subscription';
  category: string;
  brand?: string;
  releaseDate?: string;
  os?: 'macOS' | 'Windows' | 'Android' | 'iOS' | 'Linux' | 'None';
  shortDescription: string;
  description: string;
  price: number; // Base price or starting price
  discountPrice?: number; // Special offer price
  compareAtPrice?: number;
  currency: string;
  isActive: boolean;
  visibility: 'public' | 'members_only';
  tags: string[];
  isHot?: boolean;
  isFeatured?: boolean;
  image: string;
  images?: string[];
  videoUrl?: string;
  imageAlt?: string;
  hasVariants: boolean;
  variantGroups?: ProductVariantGroup[]; // New structure
  variants?: ProductVariant[];
  trackStock: boolean;
  stock: number; // Total stock if no variants, or sum of variant stocks
  inventory?: number;
  lowStockThreshold?: number;
  sku?: string;
  weight?: string;
  dimensions?: string;
  shippingClass?: string;
  requiresShipping: boolean;
  size?: string;
  digitalFileUrl?: string;
  downloadPassword?: string;
  secureDownloadLink?: string;
  downloadLimit?: number;
  expiryDays?: number;
  allowRedownload?: boolean;
  isFree?: boolean;
  isBestSeller?: boolean;
  isSpecialOffer?: boolean;
  isTrending?: boolean;
  offerExpiry?: string;
  whatsappEnabled: boolean;
  technicalDetails?: { title: string; description: string }[];
  hotspots?: { x: number; y: number; title: string; description: string }[];
  useCases?: { title: string; description: string; icon?: string }[];
  shippingPrice?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  metaTitle?: string; // Legacy
  metaDescription?: string; // Legacy
  ogImage?: string;
  condition?: 'new' | 'refurbished';
  status: 'draft' | 'published' | 'hidden';
  rating?: number;
  reviewCount?: number;
  reviews?: Review[];
  commentsCount?: number;
  sharesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  verifiedPurchase?: boolean;
  status: 'pending' | 'published' | 'hidden';
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  mixtapeId: string;
  text: string;
  date: string;
  status: 'pending' | 'published' | 'hidden';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'guest' | 'user' | 'admin';
  isSubscriber: boolean;
  subscriptionPlan?: 'weekly' | 'monthly' | '3months' | '6months' | 'yearly';
  subscriptionExpiry?: string; // ISO String
  avatarUrl?: string;
  isAdmin?: boolean;
  status?: 'active' | 'suspended';
  lastLogin?: string;
  referralCode?: string;
  lastSeen?: string;
  referredBy?: string;
  phoneNumber?: string;
  downloadsToday?: number;
  lastDownloadDate?: string; // ISO date string YYYY-MM-DD
  hasUsedTrial?: boolean;
  balance?: number;
  auraPoints?: number;
  auraLevel?: number;
  createdAt?: string;
  updatedAt?: string;
  presenceStatus?: 'online' | 'offline';
  referralCount?: number;
  downloadCountTotal?: number;
}

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  planId: string; // weekly, monthly, etc.
  amount: number;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'cancelled';
  paymentMethod: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  active: boolean;
  isBestValue?: boolean;
  isTrial?: boolean;
  promoExpiry?: string;
  link?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  variant?: string;
  type: 'physical' | 'digital' | 'subscription';
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  city?: string;
  address?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  date: string;
  time?: string;
  referenceCode?: string;
  shippingAddress?: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedArrival?: string;
  pickupLocation?: string;
  receiptUrl?: string;
  adminMessage?: string;
  shippedAt?: string;
  deliveryMethod?: string;
  requiresShipping?: boolean;
  subtotal?: number;
  discountAmount?: number;
  shippingCost?: number;
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'store' | 'subscription' | 'booking' | 'all';
  applicablePlans?: string[]; // IDs of plans this coupon works for
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
  active: boolean;
  isSingleUse?: boolean;
  assignedUserId?: string; // If set, only this user can use it
  minSpend?: number;
}

export interface ReferralStats {
  id: string;
  userId: string;
  userName: string;
  referralCode: string;
  totalReferrals: number;
  totalEarned: number;
  pendingPayout: number;
  createdAt?: string;
}

export interface NewsletterCampaign {
  id: string;
  name: string;
  subject: string;
  type: 'announcement' | 'mixtape' | 'product';
  status: 'draft' | 'scheduled' | 'sent';
  sentDate?: string;
  recipientCount?: number;
  openRate?: number;
}

export interface NewsletterSegment {
  id: string;
  name: string;
  criteria: string;
  count: number;
}

// --- NEW MUSIC POOL TYPES ---

export interface TrackVersion {
  id: string;
  type: string; // e.g. 'Clean', 'Dirty', 'Intro - Clean', 'Acapella'
  label?: string; // e.g. "Extended Mix"
  downloadUrl: string;
  previewUrl?: string;
}

export interface Track {
  id: string;
  artist: string;
  title: string;
  /** Legacy/raw genre string — kept for backward compat */
  genre: string;
  /** Cleaned, UI-facing genre label (e.g. 'Afrohouse', 'RnB Remixes') */
  displayGenre?: string;
  /** Top-level hub / collection (e.g. 'Remix & Mashups Hub', "Riddimz F'") */
  collectionHub?: string;
  /** Sub-category within a hub (e.g. specific Riddim folder name) */
  subGenre?: string;
  /** Energy vibe: 'Hype' | 'Low Hype' | 'Chill' | 'Energetic' */
  vibe?: string;
  /** Release year extracted from URL/folder (e.g. 2025) */
  releaseYear?: number;
  /** Release month extracted from URL/folder (e.g. 'March') */
  releaseMonth?: string;
  category: string[];
  bpm: number;
  key?: string;
  /** Kept for legacy — use releaseYear instead */
  year?: number | string;
  versions: TrackVersion[];
  dateAdded: string;
  /** Streamable preview URL for the mini player */
  previewUrl?: string;
  /** Direct download URL (primary version) */
  downloadUrl?: string;
  /** Link health: 'ok' | 'broken' | 'unchecked' */
  linkStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Genre {
  id: string;
  name: string;
  coverUrl: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: string;
}

export interface SessionType {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  depositRequired: boolean;
  equipmentIncluded: string[];
  active: boolean;
}

export interface StudioEquipment {
  id: string;
  name: string;
  category: string;
  image: string;
  description?: string;
  status?: 'available' | 'maintenance' | 'booked';
  hourlyRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudioRoom {
  id: string;
  name: string;
  capacity: number;
  description: string;
  status: 'active' | 'maintenance';
  rate?: number;
  features?: string[];
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceLog {
  id: string;
  itemId: string; // Room or Equipment ID
  itemName: string;
  type: 'room' | 'equipment';
  description: string;
  date: string;
  status: 'pending' | 'resolved';
}

export interface Booking {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceType: string;
  serviceName?: string;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'paid' | 'deposit' | 'pending' | 'refunded';
  amount: number;
  budget?: string;
  notes?: string;
  source: 'web' | 'manual';
  location?: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

export interface StudioSession {
  id: string;
  dj_id?: string;
  customer_email: string;
  session_date: string;
  start_time: string;
  duration_hours: number;
  extras: string; // JSON string from D1
  total_price_kes: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  paystack_ref?: string;
  created_at: string;
}

export interface EventGig {
  id: string;
  client_id?: string;
  client_name: string;
  client_email: string;
  event_date: string;
  event_type: string;
  location_details: string;
  guests_estimate?: number;
  requirements?: string;
  status: 'inquiry' | 'quote_sent' | 'confirmed' | 'completed' | 'cancelled';
  deposit_received?: number;
  paystack_ref?: string;
  created_at: string;
}

export interface TelegramConfig {
  botToken: string;
  botUsername: string;
  status: 'Connected' | 'Disconnected' | 'Error';
}

export interface TelegramChannel {
  id: string;
  name: string;
  channelId: string;
  genre: string;
  inviteLink: string;
  active: boolean;
}

export interface TelegramMapping {
  id: string;
  planId: string;
  channelIds: string[];
  autoInvite: boolean;
}

export interface TelegramUser {
  id: string;
  userId: string;
  userName: string;
  telegramUsername: string;
  telegramUserId: string;
  status: 'Verified' | 'Pending' | 'Unlinked';
  linkedAt: string;
}

export interface TelegramLog {
  id: string;
  action: string;
  details: string;
  user?: string;
  channel?: string;
  timestamp: string;
  status: 'Success' | 'Failure';
}

export interface ShippingRate {
  id: string;
  type: 'instant' | 'express' | 'standard';
  label: string;
  price: number;
  timeline: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  description: string;
  rates: ShippingRate[];
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  dateSubscribed: string;
  status: 'active' | 'unsubscribed';
  source?: string;
  tags?: string[];
}

export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
  bgImage: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
}

export interface SocialLinks {
  instagram: string;
  twitter: string;
  youtube: string;
  facebook: string;
  tiktok?: string;
  telegram?: string;
}

export interface HomeSectionConfig {
  featuredMixtapes: { title: string; subtitle: string; ctaText: string };
  musicPool: { title: string; description: string; benefits: string[]; ctaText: string; bgImage?: string };
  storePromo: { title: string; description: string; ctaText: string };
  studioPromo: { title: string; description: string; ctaText: string };
  tipJar: { title: string; message: string; ctaText: string };
}

export interface AboutConfig {
  title: string;
  bio: string;
  image: string;
  careerTimeline?: { year: string; event: string }[];
}

export interface LegalConfig {
  terms: string;
  privacy: string;
  refunds: string;
}

export interface SEOConfig {
  siteTitle: string;
  description: string;
  keywords: string;
  ogImage: string;
}

export interface SiteConfig {
  baseUrl: string;
  hero: HeroContent;
  contact: ContactInfo;
  socials: SocialLinks;
  home: HomeSectionConfig;
  about: AboutConfig;
  legal: LegalConfig;
  footer: { description: string; copyright: string };
  referralSettings?: ReferralSettings;
  seo: SEOConfig;
  notice?: {
    enabled: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error';
  };
}

export interface ReferralSettings {
  newUserDiscount: number;
  newUserDiscountType: 'flat' | 'percentage';
  referrerRewardAmount: number;
  rewardType: 'flat' | 'percentage';
  enabled: boolean;
  firstTimeDiscountEnabled?: boolean;
  firstTimeDiscount?: number;
  firstTimeDiscountType?: 'flat' | 'percentage';
}

export interface ReferralLog {
  id: string;
  referrerId: string;
  refereeId: string;
  referrerName: string;
  refereeName: string;
  planPurchased: string;
  discountApplied: number;
  rewardIssued: boolean;
  createdAt: string;
  status: 'pending' | 'completed';
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  source: 'web' | 'whatsapp' | 'ai';
  userId?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string | 'all';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'product' | 'mixtape' | 'promotion' | 'subscription';
  link?: string;
  read: boolean;
  createdAt: string;
}


