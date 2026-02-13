
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, Mixtape, Booking, Track, SessionType, SiteConfig, Video, TelegramConfig, TelegramChannel, TelegramMapping, TelegramUser, TelegramLog, StudioEquipment, ShippingZone, NewsletterSubscriber, Genre, Subscription, Order, NewsletterCampaign, NewsletterSegment, SubscriptionPlan, StudioRoom, MaintenanceLog, Coupon, ReferralStats, User } from '../types';
import { PRODUCTS, FEATURED_MIXTAPES, POOL_TRACKS, YOUTUBE_VIDEOS, INITIAL_STUDIO_EQUIPMENT, INITIAL_SHIPPING_ZONES, MOCK_SUBSCRIBERS, INITIAL_GENRES, SUBSCRIPTION_PLANS } from '../constants';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { useAuth } from './AuthContext';

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

  telegramConfig: TelegramConfig;
  telegramChannels: TelegramChannel[];
  telegramMappings: TelegramMapping[];
  telegramUsers: TelegramUser[];
  telegramLogs: TelegramLog[];
  poolError: string | null;
  productsError: string | null;
  mixtapesError: string | null;

  // Actions
  seedDatabase: () => Promise<void>;
  updateSiteConfig: (data: Partial<SiteConfig>) => void;

  addProduct: (product: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addMixtape: (mixtape: Mixtape) => void;
  updateMixtape: (id: string, data: Partial<Mixtape>) => void;
  deleteMixtape: (id: string) => void;

  addPoolTrack: (track: Track) => void;
  updatePoolTrack: (id: string, data: Partial<Track>) => void;
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

  updateTelegramConfig: (config: Partial<TelegramConfig>) => void;
  addTelegramChannel: (channel: TelegramChannel) => void;
  updateTelegramChannel: (id: string, data: Partial<TelegramChannel>) => void;
  deleteTelegramChannel: (id: string) => void;

  updateShippingZone: (id: string, data: Partial<ShippingZone>) => void;
  addSubscriber: (email: string) => void;

  updateUser: (id: string, data: Partial<User>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to fetch collection (Namespaced V8 style)
// Added 'enabled' parameter to conditionally fetch based on rules
// Added 'limit' parameter for pagination to improve performance
const useCollection = <T extends { id: string }>(
  colName: string,
  initialData: T[],
  enabled: boolean = true,
  limit?: number,
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'desc',
  isRealtime: boolean = true
) => {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [currentLimit, setLimit] = useState(limit);
  const [error, setError] = useState<string | null>(null);

  const loadMore = (count: number = 20) => {
    if (currentLimit) setLimit(prev => (prev || 0) + count);
  };
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    if (!enabled) {
      setData(initialData);
      setIsLoading(false);
      return;
    }

    if (data.length === 0) setIsLoading(true);
    setError(null);

    let query: firebase.firestore.Query = db.collection(colName);
    if (orderByField) query = query.orderBy(orderByField, orderDirection);
    if (currentLimit) query = query.limit(currentLimit);

    if (isRealtime) {
      const unsub = query.onSnapshot(
        (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
          setData(items);
          setIsLoading(false);
        },
        (error) => {
          if (error.code === 'resource-exhausted') {
            setError('Quota exceeded. Please try again later.');
          }
          if (error.code !== 'permission-denied') {
            console.warn(`Firestore access error for collection '${colName}':`, error.message);
          }
          setIsLoading(false);
        }
      );
      return () => unsub();
    } else {
      query.get().then(snapshot => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(items);
        setIsLoading(false);
      }).catch(error => {
        if (error.code === 'resource-exhausted') {
          setError('Quota exceeded.');
        }
        console.warn(`Firestore fetch error for collection '${colName}':`, error.message);
        setIsLoading(false);
      });
    }
  }, [colName, enabled, currentLimit, orderByField, orderDirection, isRealtime, refreshTrigger]);

  return [data, setData, isLoading, loadMore, error, refresh] as const;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Determine roles for conditional fetching
  const isAdmin = user?.role === 'admin';
  const isSubscriber = user?.isSubscriber || isAdmin;

  // -- REALTIME DATA SUBSCRIPTIONS --

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  useEffect(() => {
    const docRef = db.collection('settings').doc('siteConfig');
    const unsub = docRef.onSnapshot(
      (doc) => {
        if (doc.exists) {
          setSiteConfig(doc.data() as SiteConfig);
        }
      },
      (error) => console.warn("Firestore access error for siteConfig:", error.message)
    );
    return () => unsub();
  }, []);

  // Public Collections - Added 'createdAt' sorting
  // Public Collections - Realtime is good here for small updates
  const [products, , , , productsError, refreshProducts] = useCollection<Product>('products', [], true, 100, 'createdAt', 'desc', false);
  const [mixtapes, , , , mixtapesError, refreshMixtapes] = useCollection<Mixtape>('mixtapes', [], true, 100, 'createdAt', 'desc', false);
  const [sessionTypes, , , , , refreshSessionTypes] = useCollection<SessionType>('sessionTypes', [], true, undefined, undefined, 'desc', false);
  const [studioEquipment, , , , , refreshEquipment] = useCollection<StudioEquipment>('studioEquipment', [], true, undefined, undefined, 'desc', false);
  const [subscriptionPlans, , , , , refreshPlans] = useCollection<SubscriptionPlan>('subscriptionPlans', [], true, undefined, undefined, 'desc', true);
  const [shippingZones, , , , , refreshZones] = useCollection<ShippingZone>('shippingZones', INITIAL_SHIPPING_ZONES, true, undefined, undefined, 'desc', false);
  const [genres, , , , , refreshGenres] = useCollection<Genre>('genres', INITIAL_GENRES, true, undefined, undefined, 'desc', false);
  const [youtubeVideos, , , , , refreshVideos] = useCollection<Video>('youtubeVideos', [], true, undefined, undefined, 'desc', false);

  // Restricted Collections (Subscriber/Admin) - Non-realtime for Pool Tracks to save quota
  const [poolTracks, , , loadMorePoolTracks, poolError, refreshPoolTracks] = useCollection<Track>('poolTracks', [], isSubscriber || isAdmin, 50, 'createdAt', 'desc', true);

  // Admin Only Collections - Re-enabled real-time for better admin experience
  const [orders, , , , , refreshOrders] = useCollection<Order>('orders', [], isAdmin, 50, 'createdAt', 'desc', true);
  const [users, , , , , refreshUsers] = useCollection<User>('users', [], isAdmin, 50, undefined, 'desc', true);
  const [subscriptions, , , , , refreshSubscriptions] = useCollection<Subscription>('subscriptions', [], isAdmin, 50, undefined, 'desc', true);
  const [bookings, , , , , refreshBookings] = useCollection<Booking>('bookings', [], isAdmin, 50, 'createdAt', 'desc', true);

  const [studioRooms, , , , , refreshRooms] = useCollection<StudioRoom>('studioRooms', [], isAdmin, undefined, undefined, 'desc', false);
  const [maintenanceLogs, , , , , refreshLogs] = useCollection<MaintenanceLog>('maintenanceLogs', [], isAdmin, 50, 'createdAt', 'desc', false);
  const [coupons, , , , , refreshCoupons] = useCollection<Coupon>('coupons', [], isAdmin, undefined, undefined, 'desc', false);
  const [referralStats, , , , , refreshReferrals] = useCollection<ReferralStats>('referralStats', [], isAdmin, undefined, undefined, 'desc', false);
  const [newsletterCampaigns, , , , , refreshCampaigns] = useCollection<NewsletterCampaign>('newsletterCampaigns', [], isAdmin, undefined, 'createdAt', 'desc', false);
  const [newsletterSegments, , , , , refreshSegments] = useCollection<NewsletterSegment>('newsletterSegments', [], isAdmin, undefined, undefined, 'desc', false);
  const [subscribers, , , , , refreshSubscribers] = useCollection<NewsletterSubscriber>('subscribers', [], isAdmin, 100, 'dateSubscribed', 'desc', false);
  const [telegramChannels, , , , , refreshTelegramChannels] = useCollection<TelegramChannel>('telegramChannels', [], isAdmin, undefined, undefined, 'desc', false);
  const [telegramMappings] = useCollection<TelegramMapping>('telegramMappings', [], isAdmin, undefined, undefined, 'desc', false);
  const [telegramUsers] = useCollection<TelegramUser>('telegramUsers', [], isAdmin, undefined, undefined, 'desc', false);
  const [telegramLogs] = useCollection<TelegramLog>('telegramLogs', [], isAdmin, 100, 'timestamp', 'desc', false);

  // useAdminCollection is no longer needed since we use useCollection directly above
  // Telegram (Admin) - Non-realtime
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({ botToken: '', botUsername: '', status: 'Disconnected' });

  // Fetch Telegram Config (Single Doc)
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = db.collection('telegramConfig').doc('main').onSnapshot(doc => {
      if (doc.exists) setTelegramConfig(doc.data() as TelegramConfig);
    });
    return () => unsub();
  }, [isAdmin]);


  // --- ACTIONS (Write to Firestore using Namespaced V8 style) ---

  const seedDatabase = async () => {
    if (!isAdmin) {
      alert("Admin privileges required to seed database.");
      return;
    }
    try {
      const batch = db.batch();

      const now = new Date().toISOString();

      // Seed Products
      PRODUCTS.forEach(p => {
        const ref = db.collection('products').doc(p.id);
        batch.set(ref, { ...p, createdAt: p.createdAt || now, updatedAt: p.updatedAt || now });
      });

      // Seed Mixtapes
      FEATURED_MIXTAPES.forEach(m => {
        const ref = db.collection('mixtapes').doc(m.id);
        batch.set(ref, { ...m, createdAt: m.createdAt || now, updatedAt: m.updatedAt || now });
      });

      // Seed Pool Tracks
      POOL_TRACKS.forEach(t => {
        const ref = db.collection('poolTracks').doc(t.id);
        batch.set(ref, { ...t, createdAt: t.createdAt || now, updatedAt: t.updatedAt || now });
      });

      // Seed Equipment
      INITIAL_STUDIO_EQUIPMENT.forEach(e => {
        const ref = db.collection('studioEquipment').doc(e.id);
        batch.set(ref, { ...e, createdAt: now, updatedAt: now });
      });

      // Seed Plans
      SUBSCRIPTION_PLANS.forEach(p => {
        const ref = db.collection('subscriptionPlans').doc(p.id);
        batch.set(ref, { ...p, active: true, createdAt: now, updatedAt: now });
      });

      // Seed Shipping Zones
      INITIAL_SHIPPING_ZONES.forEach(z => {
        const ref = db.collection('shippingZones').doc(z.id);
        batch.set(ref, { ...z, createdAt: now, updatedAt: now });
      });

      // Seed Genres
      INITIAL_GENRES.forEach(g => {
        const ref = db.collection('genres').doc(g.id);
        batch.set(ref, { ...g, createdAt: now, updatedAt: now });
      });

      // Seed Config
      batch.set(db.collection('settings').doc('siteConfig'), { ...INITIAL_CONFIG, updatedAt: now });

      await batch.commit();
      console.log("Database Seeded Successfully!");
      alert("Database has been connected and seeded with initial data!");
    } catch (e: any) {
      console.error("Error seeding database:", e);
      alert("Error seeding database: " + e.message);
    }
  };

  const updateSiteConfig = async (data: Partial<SiteConfig>) => {
    const newConfig = { ...siteConfig, ...data };
    await db.collection('settings').doc('siteConfig').set(newConfig);
  };

  const addProduct = async (product: Product) => {
    const { id, ...rest } = product;
    if (id) {
      await db.collection('products').doc(id).set(rest);
    } else {
      await db.collection('products').add(rest);
    }
    refreshProducts();
  };
  const updateProduct = async (id: string, data: Partial<Product>) => {
    await db.collection('products').doc(id).update(data);
    refreshProducts();
  };
  const deleteProduct = async (id: string) => {
    console.log(`Attempting to delete product with ID: ${id}`);
    try {
      await db.collection('products').doc(id).delete();
      console.log(`Product ${id} deleted successfully`);
      refreshProducts();
    } catch (err: any) {
      console.error("Delete failed for product:", id, err);
      alert("Failed to delete product: " + (err.message || 'Unknown error'));
      throw err;
    }
  };

  const addMixtape = async (mixtape: Mixtape) => {
    const { id, ...rest } = mixtape;
    if (id) {
      await db.collection('mixtapes').doc(id).set(rest);
    } else {
      await db.collection('mixtapes').add(rest);
    }
    refreshMixtapes();
  };
  const updateMixtape = async (id: string, data: Partial<Mixtape>) => {
    await db.collection('mixtapes').doc(id).update(data);
    refreshMixtapes();
  };
  const deleteMixtape = async (id: string) => {
    try {
      await db.collection('mixtapes').doc(id).delete();
      console.log(`Mixtape ${id} deleted successfully`);
      refreshMixtapes();
    } catch (err: any) {
      console.error("Delete failed for mixtape:", id, err);
      alert("Failed to delete mixtape: " + (err.message || 'Unknown error'));
      throw err;
    }
  };

  const addPoolTrack = async (track: Track) => {
    const { id, ...rest } = track;
    if (id) {
      await db.collection('poolTracks').doc(id).set(rest);
    } else {
      await db.collection('poolTracks').add(rest);
    }
    refreshPoolTracks();
  };
  const updatePoolTrack = async (id: string, data: Partial<Track>) => {
    await db.collection('poolTracks').doc(id).update(data);
    refreshPoolTracks();
  };
  const deletePoolTrack = async (id: string) => {
    await db.collection('poolTracks').doc(id).delete();
    refreshPoolTracks();
  };

  const updateGenre = async (id: string, data: Partial<Genre>) => {
    await db.collection('genres').doc(id).update(data);
    refreshGenres();
  };

  const addBooking = async (booking: Booking) => {
    const { id, ...rest } = booking;
    await db.collection('bookings').add(rest);
    refreshBookings();
  };
  const updateBooking = async (id: string, data: Partial<Booking>) => {
    await db.collection('bookings').doc(id).update(data);
    refreshBookings();
  };

  const addSessionType = async (session: SessionType) => {
    const { id, ...rest } = session;
    await db.collection('sessionTypes').add(rest);
    refreshSessionTypes();
  };
  const updateSessionType = async (id: string, data: Partial<SessionType>) => {
    await db.collection('sessionTypes').doc(id).update(data);
    refreshSessionTypes();
  };
  const deleteSessionType = async (id: string) => {
    await db.collection('sessionTypes').doc(id).delete();
    refreshSessionTypes();
  };

  const addVideo = async (video: Video) => {
    const { id, ...rest } = video;
    await db.collection('youtubeVideos').add(rest);
  };
  const deleteVideo = async (id: string) => {
    await db.collection('youtubeVideos').doc(id).delete();
  };

  const addStudioEquipment = async (equipment: StudioEquipment) => {
    const { id, ...rest } = equipment;
    await db.collection('studioEquipment').add(rest);
    refreshEquipment();
  };
  const updateStudioEquipment = async (id: string, data: Partial<StudioEquipment>) => {
    await db.collection('studioEquipment').doc(id).update(data);
    refreshEquipment();
  };
  const deleteStudioEquipment = async (id: string) => {
    await db.collection('studioEquipment').doc(id).delete();
    refreshEquipment();
  };

  const addSubscription = async (sub: Subscription) => {
    const { id, ...rest } = sub;
    await db.collection('subscriptions').add(rest);
  };
  const updateSubscription = async (id: string, data: Partial<Subscription>) => {
    await db.collection('subscriptions').doc(id).update(data);
  };

  const addSubscriptionPlan = async (plan: SubscriptionPlan) => {
    const docId = plan.id || `plan_${Date.now()}`;
    await db.collection('subscriptionPlans').doc(docId).set({ ...plan, id: docId, updatedAt: new Date().toISOString() });
    refreshPlans();
  };
  const updateSubscriptionPlan = async (id: string, data: Partial<SubscriptionPlan>) => {
    await db.collection('subscriptionPlans').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    refreshPlans();
  };
  const deleteSubscriptionPlan = async (id: string) => {
    await db.collection('subscriptionPlans').doc(id).delete();
    refreshPlans();
  };

  const addStudioRoom = async (room: StudioRoom) => {
    const docId = room.id || `rm_${Date.now()}`;
    await db.collection('studioRooms').doc(docId).set({ ...room, id: docId, updatedAt: new Date().toISOString() });
    refreshRooms();
  };
  const updateStudioRoom = async (id: string, data: Partial<StudioRoom>) => { await db.collection('studioRooms').doc(id).update(data); refreshRooms(); };
  const deleteStudioRoom = async (id: string) => { await db.collection('studioRooms').doc(id).delete(); refreshRooms(); };

  const addMaintenanceLog = async (log: MaintenanceLog) => {
    const docId = log.id || `log_${Date.now()}`;
    await db.collection('maintenanceLogs').doc(docId).set({ ...log, id: docId, updatedAt: new Date().toISOString() });
    refreshLogs();
  };
  const updateMaintenanceLog = async (id: string, data: Partial<MaintenanceLog>) => {
    await db.collection('maintenanceLogs').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    refreshLogs();
  };

  const updateOrder = async (id: string, data: Partial<Order>) => {
    await db.collection('orders').doc(id).update(data);
    refreshOrders();
  };

  const addCampaign = async (camp: NewsletterCampaign) => {
    const { id, ...rest } = camp;
    const docId = id || `camp_${Date.now()}`;
    await db.collection('newsletterCampaigns').doc(docId).set({ ...rest, updatedAt: new Date().toISOString() });
    refreshCampaigns();
  };
  const updateCampaign = async (id: string, data: Partial<NewsletterCampaign>) => {
    await db.collection('newsletterCampaigns').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    refreshCampaigns();
  };

  const addCoupon = async (coupon: Coupon) => {
    const { id, ...rest } = coupon;
    const docId = id || `cpn_${Date.now()}`;
    await db.collection('coupons').doc(docId).set({ ...rest, updatedAt: new Date().toISOString() });
    refreshCoupons();
  };
  const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    await db.collection('coupons').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    refreshCoupons();
  };
  const deleteCoupon = async (id: string) => {
    await db.collection('coupons').doc(id).delete();
    refreshCoupons();
  };

  const updateTelegramConfig = async (config: Partial<TelegramConfig>) => { await db.collection('telegramConfig').doc('main').set(config, { merge: true }); };
  const addTelegramChannel = async (channel: TelegramChannel) => {
    const { id, ...rest } = channel;
    const docId = id || `tg_${Date.now()}`;
    await db.collection('telegramChannels').doc(docId).set({ ...rest, updatedAt: new Date().toISOString() });
    refreshTelegramChannels();
  };
  const updateTelegramChannel = async (id: string, data: Partial<TelegramChannel>) => {
    await db.collection('telegramChannels').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    refreshTelegramChannels();
  };
  const deleteTelegramChannel = async (id: string) => {
    await db.collection('telegramChannels').doc(id).delete();
    refreshTelegramChannels();
  };

  const updateShippingZone = async (id: string, data: Partial<ShippingZone>) => {
    await db.collection('shippingZones').doc(id).update(data);
    refreshZones();
  };

  const addSubscriber = async (email: string) => {
    await db.collection('subscribers').add({
      email, dateSubscribed: new Date().toISOString().split('T')[0], status: 'active', source: 'Manual'
    });
    refreshSubscribers();
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    await db.collection('users').doc(id).update(data);
    refreshUsers();
  };

  return (
    <DataContext.Provider value={{
      siteConfig, products, mixtapes, bookings, sessionTypes, youtubeVideos, poolTracks, genres, studioEquipment, shippingZones, subscribers, subscriptions, orders, newsletterCampaigns, newsletterSegments,
      subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users,
      telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
      poolError, productsError, mixtapesError,
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
      addCoupon, updateCoupon, deleteCoupon,
      updateTelegramConfig, addTelegramChannel, updateTelegramChannel, deleteTelegramChannel,
      updateShippingZone, addSubscriber,
      updateUser
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Helper for admin collections
function useAdminCollection(colName: string, setData: (data: any[]) => void, isAdmin: boolean) {
  useEffect(() => {
    if (!isAdmin) {
      setData([]);
      return;
    }
    const unsub = db.collection(colName).onSnapshot(
      snapshot => setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      err => console.warn(`Admin Fetch Error ${colName}:`, err.message)
    );
    return () => unsub();
  }, [colName, isAdmin, setData]);
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
