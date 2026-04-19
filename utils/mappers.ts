
import { Product, Mixtape, Booking, Track, SessionType, Video, TelegramChannel, Subscription, Order, NewsletterCampaign, NewsletterSubscriber, SubscriptionPlan, Genre, AppNotification, InstallmentPlan, InstallmentPayment, StudioRoom, StudioEquipment, MaintenanceLog, ReferralStats, ReferralLog, Coupon } from '../types';

/**
 * Helper to prevent hanging calls
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Operation timed out (30s limit reached).")), ms))
  ]);
}

/**
 * Label Cleaning Helper (removes (123 tracks) from name)
 */
export const cleanLabel = (label: string) => {
  if (!label) return '';
  return label.replace(/\s\(\d+\s*tracks\)/i, '').trim();
};

/**
 * Extract YouTube ID from URL
 */
export const getYoutubeId = (url: string | undefined): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Safe JSON Parse helper
 */
export const safeJsonParse = (val: any, fallback: any = []) => {
  if (!val) return fallback;
  if (typeof val !== 'string') return Array.isArray(val) ? val : fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

/**
 * R2 Track Mapper
 */
export const mapR2Track = (t: any): Track => {
  const DEFAULT_CDN_BASE = `/api/files`;

  const encodeR2Url = (u: string): string => {
    if (!u) return u;
    if (u.startsWith('/api/files/')) return u;

    try {
      const urlObj = new URL(u);
      const lowerHost = urlObj.hostname.toLowerCase();

      if (lowerHost.includes('vicknickvideopool.com') || lowerHost.includes('dennismacharia20')) {
        const parts = u.split(lowerHost.includes('.com/') ? '.com/' : '.dev/');
        const path = parts[1] || '';
        const origin = lowerHost.includes('dennismacharia20') ? '?origin=remix' : '';
        return `/api/files/${path}${origin}`;
      }

      urlObj.pathname = urlObj.pathname
        .split('/')
        .map(seg => encodeURIComponent(decodeURIComponent(seg)))
        .join('/');
      return urlObj.toString();
    } catch {
      if (u.startsWith('http')) return u;
      const cleanPath = u.replace(/^\//, '').replace(/ /g, '%20').replace(/&(?![a-z#0-9]+;)/g, '%26');
      return `/api/files/${cleanPath}`;
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

  const seenUrls = new Set();
  versions = versions.filter((v: any) => {
    const url = v.download_url || v.preview_url || '';
    const normalized = url.split('?')[0].replace(/\(\d+\)\.[^.]+$/, (m) => m.split('.').pop() || '');
    if (!normalized || seenUrls.has(normalized)) return false;
    seenUrls.add(normalized);
    return true;
  });

  const labelCounts = new Map<string, number>();
  versions.forEach((v: any) => {
    const base = (v.version_name || v.type || 'Main').replace(/\((Audio|Video)\)$/i, '').trim();
    labelCounts.set(base, (labelCounts.get(base) || 0) + 1);
  });

  versions = versions.map((v: any) => {
    const base = (v.version_name || v.type || 'Main').replace(/\((Audio|Video)\)$/i, '').trim();
    if (labelCounts.get(base)! > 1 && !v.version_name.includes('(Audio)') && !v.version_name.includes('(Video)')) {
      const url = (v.download_url || '').toLowerCase();
      const isVideo = url.endsWith('.mp4') || url.endsWith('.mkv') || url.endsWith('.mov') || url.includes('/video/');
      return { ...v, version_name: `${base} (${isVideo ? 'Video' : 'Audio'})` };
    }
    return v;
  });

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

/**
 * Generic Mapper
 */
export const mapR2Generic = (item: any): any => ({
  ...item,
  createdAt: item.createdAt || item.created_at,
  updatedAt: item.updatedAt || item.updated_at
});

/**
 * R2 Product Mapper
 */
export const mapR2Product = (p: any): Product => {
  try {
    const images = safeJsonParse(p.images || p.image_list || p.product_images, p.image ? [p.image] : []);
    const mainImage = p.image || images[0] || '';
    const type = p.type || (['Software', 'Samples', 'digital', 'DJ Software'].includes(p.category || '') ? 'digital' : 'physical');
    const requiresShipping = Boolean(p.requires_shipping !== undefined ? p.requires_shipping : (p.requiresShipping !== undefined ? p.requiresShipping : (type === 'physical')));

    return {
      ...p,
      type,
      id: String(p.id || ''),
      name: String(p.name || 'Untitled Product'),
      slug: String(p.slug || ''),
      image: mainImage,
      images,
      isActive: Boolean(p.is_active !== undefined ? p.is_active : (p.isActive !== undefined ? p.isActive : (p.status === 'published' || p.status === 'active'))),
      status: p.status === 'active' ? 'published' : (p.status || (Boolean(p.is_active || p.isActive) ? 'published' : 'draft')),
      isHot: Boolean(p.is_hot !== undefined ? p.is_hot : (p.isHot !== undefined ? p.isHot : false)),
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
      features: safeJsonParse(p.features, typeof p.features === 'string' ? p.features.split('\n').map((f: string) => f.trim()).filter(Boolean) : []),
      technicalDetails: safeJsonParse(p.technical_details || p.technicalDetails, typeof (p.technical_details || p.technicalDetails) === 'string' ? (p.technical_details || p.technicalDetails).split('\n').map((s: string) => s.trim()).filter(Boolean) : []),
      useCases: safeJsonParse(p.use_cases || p.useCases, typeof (p.use_cases || p.useCases) === 'string' ? (p.use_cases || p.useCases).split('\n').map((u: string) => u.trim()).filter(Boolean) : []),
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
      requiresShipping,
      isBestSeller: Boolean(p.is_best_seller !== undefined ? p.is_best_seller : (p.isBestSeller !== undefined ? p.isBestSeller : false)),
      isSpecialOffer: Boolean(p.is_special_offer !== undefined ? p.is_special_offer : (p.isSpecialOffer !== undefined ? p.isSpecialOffer : false)),
      isTrending: Boolean(p.is_trending !== undefined ? p.is_trending : (p.isTrending !== undefined ? p.isTrending : false)),
      offerExpiry: p.offer_expiry || p.offerExpiry || '',
      hotspots: safeJsonParse(p.hotspots)

    };
  } catch (err) {
    console.error("Error mapping product:", p, err);
    return { ...p, id: p.id || 'error', name: p.name || 'Error Loading', price: 0, isActive: false } as Product;
  }
};

/**
 * R2 Mixtape Mapper
 */
export const mapR2Mixtape = (m: any): Mixtape => {
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
      requiredTier: 'free',
      youtubeUrl: m.youtube_url || m.youtubeUrl,
      soundcloudUrl: m.soundcloud_url || m.soundcloudUrl,
      metaTitle: m.meta_title || m.metaTitle,
      metaDescription: m.meta_description || m.metaDescription,
      ogImage: m.og_image || m.ogImage,
      isExclusive: Boolean(m.is_exclusive !== undefined ? m.is_exclusive : m.isExclusive),
      isPremium: Boolean(m.is_premium !== undefined ? m.is_premium : m.isPremium),
      createdAt: m.created_at || m.createdAt,
      updatedAt: m.updated_at || m.updatedAt,
      tracklist: safeJsonParse(m.tracklist || m.track_list, []),
      tags: Array.isArray(m.tags) ? m.tags : (typeof m.tags === 'string' ? m.tags.split(',').map((t: string) => t.trim()) : [])
    };
  } catch (err) {
    console.error("Error mapping mixtape:", m, err);
    return { ...m, id: m.id || 'error', title: m.title || 'Error Loading' } as Mixtape;
  }
};

/**
 * R2 Order Mapper
 */
export const mapR2Order = (o: any): Order => {
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

/**
 * R2 User Mapper
 */
export const mapR2User = (u: any): any => ({
  ...u,
  fullName: u.full_name || u.name || u.fullName,
  full_name: u.full_name || u.name || u.fullName,
  displayName: u.full_name || u.name || u.displayName || u.fullName,
  isSubscriber: u.is_subscriber !== undefined ? (u.is_subscriber === 1 || u.is_subscriber === true) : u.isSubscriber,
  subscriptionPlan: u.subscription_plan || u.subscriptionPlan,
  subscriptionExpiry: u.subscription_expiry || u.subscriptionExpiry,
  avatarUrl: u.avatar_url || u.avatarUrl,
  referralCode: u.referral_code || u.referralCode,
  lastLogin: u.last_login || u.lastLogin,
  phoneNumber: u.phone_number || u.phoneNumber,
  lastSeen: u.last_seen || u.lastSeen,
  referredBy: u.referred_by || u.referredBy,
  balance: u.balance !== undefined ? u.balance : (u.balance || 0),
  loyaltyPoints: u.loyalty_points || u.loyaltyPoints || 0,
  totalSpent: u.total_spent || u.totalSpent || 0,
  presenceStatus: u.presence_status || u.presenceStatus,
  createdAt: u.created_at || u.createdAt,
  updatedAt: u.updated_at || u.updatedAt
});

/**
 * R2 Subscription Mapper
 */
export const mapR2Subscription = (s: any): Subscription => ({
  ...s,
  id: s.id || s.user_id,
  userId: s.user_id || s.userId || s.id,
  userName: s.user_name || s.userName || s.full_name,
  userEmail: s.user_email || s.userEmail || s.email,
  planId: s.plan_id || s.planId || s.subscription_plan,
  startDate: s.start_date || s.startDate,
  expiryDate: s.expiry_date || s.expiryDate || s.end_date || s.subscription_expiry,
  paymentMethod: s.payment_method || s.paymentMethod,
  status: 'active',
  createdAt: s.created_at || s.createdAt,
  updatedAt: s.updated_at || s.updatedAt
});

/**
 * R2 Booking Mapper
 */
export const mapR2Booking = (b: any): Booking => ({
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

/**
 * Session Type Mapper
 */
export const mapR2SessionType = (s: any): SessionType => ({
  ...s,
  depositRequired: s.deposit_required !== undefined ? s.deposit_required : s.depositRequired,
  equipmentIncluded: s.equipment_included !== undefined ? s.equipment_included : s.equipmentIncluded,
  createdAt: s.created_at || s.createdAt,
  updatedAt: s.updated_at || s.updatedAt
});

/**
 * Maintenance Log Mapper
 */
export const mapR2MaintenanceLog = (l: any): MaintenanceLog => ({
  ...l,
  itemId: l.item_id || l.itemId,
  itemName: l.item_name || l.itemName,
  itemType: l.item_type || l.itemType,
  createdAt: l.created_at || l.createdAt,
  updatedAt: l.updated_at || l.updatedAt
});

/**
 * D1 Studio Room Mapper
 */
export const mapD1StudioRoom = (r: any): StudioRoom => ({
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

/**
 * D1 Studio Equipment Mapper
 */
export const mapD1StudioEquipment = (e: any): StudioEquipment => ({
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

/**
 * D1 Maintenance Log Mapper
 */
export const mapD1MaintenanceLog = (l: any): MaintenanceLog => ({
  id: String(l.id),
  itemId: l.gear_id || l.studio_id || '',
  itemName: '',
  type: l.gear_id ? 'equipment' : 'room',
  description: l.issue || '',
  date: l.created_at || new Date().toISOString(),
  status: l.status === 'resolved' ? 'resolved' : 'pending'
});

/**
 * R2 Coupon Mapper
 */
export const mapR2Coupon = (c: any): Coupon => ({
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

/**
 * Referral Stats Mapper
 */
export const mapR2ReferralStats = (r: any): ReferralStats => ({
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

/**
 * D1 Referral Log Mapper
 */
export const mapD1ReferralLog = (l: any): ReferralLog => ({
  id: String(l.id),
  referrerId: l.referrer_id,
  referredId: l.referred_id,
  actionType: l.action_type,
  rewardType: l.reward_type,
  rewardAmount: l.reward_amount,
  createdAt: l.created_at
});

/**
 * R2 Campaign Mapper
 */
export const mapR2Campaign = (c: any): NewsletterCampaign => ({
  ...c,
  sentDate: c.sent_date || c.sentDate,
  recipientCount: c.recipient_count !== undefined ? c.recipient_count : c.recipientCount,
  openRate: c.open_rate !== undefined ? c.open_rate : c.openRate,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

/**
 * R2 Subscriber Mapper
 */
export const mapR2Subscriber = (s: any): NewsletterSubscriber => ({
  ...s,
  dateSubscribed: s.dateSubscribed || s.date_subscribed || s.created_at || s.subscribed_at,
  updatedAt: s.updated_at || s.updatedAt
});

/**
 * R2 Channel Mapper
 */
export const mapR2Channel = (c: any): TelegramChannel => ({
  ...c,
  channelId: c.channel_id || c.channelId,
  inviteLink: c.invite_link || c.inviteLink,
  createdAt: c.created_at || c.createdAt,
  updatedAt: c.updated_at || c.updatedAt
});

/**
 * R2 Plan Mapper
 */
export const mapR2Plan = (p: any): SubscriptionPlan => ({
  ...p,
  isBestValue: p.is_best_value !== undefined ? (p.is_best_value === 1 || p.is_best_value === true) : p.isBestValue,
  isEliteChoice: p.is_elite_choice !== undefined ? (p.is_elite_choice === 1 || p.is_elite_choice === true) : p.isEliteChoice,
  createdAt: p.created_at || p.createdAt,
  updatedAt: p.updated_at || p.updatedAt
});

/**
 * R2 Genre Mapper
 */
export const mapR2Genre = (g: any): Genre => ({
  ...g,
  coverUrl: g.cover_url || g.coverUrl,
  createdAt: g.created_at || g.createdAt,
  updatedAt: g.updated_at || g.updatedAt
});

/**
 * R2 Notification Mapper
 */
export const mapR2Notification = (n: any): AppNotification => ({
  ...n,
  userId: n.user_id || n.userId,
  createdAt: n.created_at || n.createdAt
});

/**
 * R2 Tip/Payment Mapper
 */
export const mapR2Tip = (t: any): any => ({
  ...t,
  amount: t.amount !== undefined ? t.amount : t.total_amount,
  status: t.status || 'completed',
  customerName: t.donor_name || t.customer_name || t.customerName || t.name,
  customerEmail: t.donor_email || t.customer_email || t.customerEmail || t.user_email || t.email,
  userEmail: t.donor_email || t.user_email || t.userEmail || t.email,
  createdAt: t.created_at || t.createdAt
});

/**
 * R2 Installment Payment Mapper
 */
export const mapR2InstallmentPayment = (p: any): InstallmentPayment => ({
  ...p,
  amount: Number(p.amount || 0),
  createdAt: p.created_at || p.createdAt
});

/**
 * R2 Installment Plan Mapper
 */
export const mapR2InstallmentPlan = (p: any): InstallmentPlan => ({
  ...p,
  total_amount: Number(p.total_amount || 0),
  deposit_amount: Number(p.deposit_amount || 0),
  paid_amount: Number(p.paid_amount || 0),
  balance: Number(p.balance || 0),
  is_reminder_enabled: Boolean(p.is_reminder_enabled === 1 || p.is_reminder_enabled === true),
  payments: Array.isArray(p.payments) ? p.payments.map(mapR2InstallmentPayment) : [],
  createdAt: p.created_at || p.createdAt,
  updatedAt: p.updated_at || p.updatedAt
});
