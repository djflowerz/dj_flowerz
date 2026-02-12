
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
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  type: 'physical' | 'digital';
  category: string;
  os?: 'macOS' | 'Windows' | 'Android' | 'iOS' | 'Linux' | 'None';
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  isActive: boolean;
  visibility: 'public' | 'members_only';
  tags: string[];
  isHot?: boolean;
  image: string;
  images?: string[];
  videoUrl?: string;
  imageAlt?: string;
  hasVariants: boolean;
  variantOptions?: ProductVariant[];
  variants?: string[];
  trackStock: boolean;
  stock: number;
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
  whatsappEnabled: boolean;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  status: 'draft' | 'published';
  inventory?: number;
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
  referredBy?: string;
  phoneNumber?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
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
  link?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  variant?: string;
  type: 'physical' | 'digital';
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
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
}

export interface ReferralStats {
  id: string;
  userId: string;
  userName: string;
  referralCode: string;
  totalReferrals: number;
  totalEarned: number;
  pendingPayout: number;
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
}

export interface Track {
  id: string;
  artist: string;
  title: string;
  genre: string; // Maps to Genre.name
  subGenre?: string;
  category: string[]; // e.g. ['Redrums', 'New Uploads']
  bpm: number;
  key?: string;
  year: number;
  versions: TrackVersion[];
  dateAdded: string;
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
}

export interface StudioRoom {
  id: string;
  name: string;
  capacity: number;
  description: string;
  status: 'active' | 'maintenance';
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
  hero: HeroContent;
  contact: ContactInfo;
  socials: SocialLinks;
  home: HomeSectionConfig;
  about: AboutConfig;
  legal: LegalConfig;
  footer: { description: string; copyright: string };
  seo: SEOConfig;
}
