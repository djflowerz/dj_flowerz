
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
const useCollection = <T,>(colName: string, initialData: T[], enabled: boolean = true) => {
  const [data, setData] = useState<T[]>(initialData);
  useEffect(() => {
    if (!enabled) {
      setData(initialData); 
      return;
    }

    const unsub = db.collection(colName).onSnapshot(
      (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
          setData(items);
        } else {
          setData([]); // Explicitly empty if DB is empty
        }
      },
      (error) => {
        // Suppress permission errors in console for cleaner dev experience if race condition occurs
        if (error.code !== 'permission-denied') {
            console.warn(`Firestore access error for collection '${colName}':`, error.message);
        }
      }
    );
    return () => unsub();
  }, [colName, enabled]);
  return [data, setData] as const;
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

  // Public Collections - Initialized with EMPTY arrays to ensure Real Data only.
  const [products] = useCollection<Product>('products', []);
  const [mixtapes] = useCollection<Mixtape>('mixtapes', []);
  const [sessionTypes] = useCollection<SessionType>('sessionTypes', []);
  const [studioEquipment] = useCollection<StudioEquipment>('studioEquipment', []);
  const [subscriptionPlans] = useCollection<SubscriptionPlan>('subscriptionPlans', []);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>(INITIAL_SHIPPING_ZONES);
  const [genres, setGenres] = useState<Genre[]>(INITIAL_GENRES); 
  const [youtubeVideos, setYoutubeVideos] = useState<Video[]>([]);

  // Restricted Collections (Subscriber/Admin)
  const [poolTracks] = useCollection<Track>('poolTracks', [], isSubscriber);

  // Admin Only Collections
  const [orders] = useCollection<Order>('orders', [], isAdmin);
  const [users] = useCollection<User>('users', [], isAdmin);
  const [subscriptions] = useCollection<Subscription>('subscriptions', [], isAdmin);
  const [bookings] = useCollection<Booking>('bookings', [], isAdmin);
  
  const [studioRooms, setStudioRooms] = useState<StudioRoom[]>([]); 
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]); 
  const [coupons, setCoupons] = useState<Coupon[]>([]); 
  const [referralStats, setReferralStats] = useState<ReferralStats[]>([]); 
  const [newsletterCampaigns, setNewsletterCampaigns] = useState<NewsletterCampaign[]>([]); 
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]); 
  
  // Telegram (Admin)
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({ botToken: '', botUsername: '', status: 'Disconnected' });
  const [telegramChannels, setTelegramChannels] = useState<TelegramChannel[]>([]);
  
  // Dummy states for types compliance
  const [newsletterSegments] = useState<NewsletterSegment[]>([]);
  const [telegramMappings] = useState<TelegramMapping[]>([]);
  const [telegramUsers] = useState<TelegramUser[]>([]);
  const [telegramLogs] = useState<TelegramLog[]>([]);

  // Fetch specialized Admin collections explicitly
  useAdminCollection('studioRooms', setStudioRooms, isAdmin);
  useAdminCollection('maintenanceLogs', setMaintenanceLogs, isAdmin);
  useAdminCollection('coupons', setCoupons, isAdmin);
  useAdminCollection('referralStats', setReferralStats, isAdmin);
  useAdminCollection('newsletterCampaigns', setNewsletterCampaigns, isAdmin);
  useAdminCollection('subscribers', setSubscribers, isAdmin);
  useAdminCollection('telegramChannels', setTelegramChannels, isAdmin);
  
  // Fetch Telegram Config (Single Doc)
  useEffect(() => {
      if(!isAdmin) return;
      const unsub = db.collection('telegramConfig').doc('main').onSnapshot(doc => {
          if(doc.exists) setTelegramConfig(doc.data() as TelegramConfig);
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

      // Seed Products
      PRODUCTS.forEach(p => {
        const ref = db.collection('products').doc(p.id);
        batch.set(ref, p);
      });

      // Seed Mixtapes
      FEATURED_MIXTAPES.forEach(m => {
        const ref = db.collection('mixtapes').doc(m.id);
        batch.set(ref, m);
      });

      // Seed Pool Tracks
      POOL_TRACKS.forEach(t => {
        const ref = db.collection('poolTracks').doc(t.id);
        batch.set(ref, t);
      });

      // Seed Equipment
      INITIAL_STUDIO_EQUIPMENT.forEach(e => {
        const ref = db.collection('studioEquipment').doc(e.id);
        batch.set(ref, e);
      });

      // Seed Plans
      SUBSCRIPTION_PLANS.forEach(p => {
        const ref = db.collection('subscriptionPlans').doc(p.id);
        batch.set(ref, { ...p, active: true });
      });

      // Seed Config
      batch.set(db.collection('settings').doc('siteConfig'), INITIAL_CONFIG);

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
    await db.collection('products').add(rest);
  };
  const updateProduct = async (id: string, data: Partial<Product>) => {
    await db.collection('products').doc(id).update(data);
  };
  const deleteProduct = async (id: string) => {
    await db.collection('products').doc(id).delete();
  };

  const addMixtape = async (mixtape: Mixtape) => {
    const { id, ...rest } = mixtape;
    await db.collection('mixtapes').add(rest);
  };
  const updateMixtape = async (id: string, data: Partial<Mixtape>) => {
    await db.collection('mixtapes').doc(id).update(data);
  };
  const deleteMixtape = async (id: string) => {
    await db.collection('mixtapes').doc(id).delete();
  };

  const addPoolTrack = async (track: Track) => {
    const { id, ...rest } = track;
    await db.collection('poolTracks').add(rest);
  };
  const updatePoolTrack = async (id: string, data: Partial<Track>) => {
    await db.collection('poolTracks').doc(id).update(data);
  };
  const deletePoolTrack = async (id: string) => {
    await db.collection('poolTracks').doc(id).delete();
  };

  const updateGenre = (id: string, data: Partial<Genre>) => setGenres(prev => prev.map(g => g.id === id ? {...g, ...data} : g));

  const addBooking = async (booking: Booking) => {
    const { id, ...rest } = booking;
    await db.collection('bookings').add(rest);
  };
  const updateBooking = async (id: string, data: Partial<Booking>) => {
    await db.collection('bookings').doc(id).update(data);
  };

  const addSessionType = async (session: SessionType) => {
    const { id, ...rest } = session;
    await db.collection('sessionTypes').add(rest);
  };
  const updateSessionType = async (id: string, data: Partial<SessionType>) => {
    await db.collection('sessionTypes').doc(id).update(data);
  };
  const deleteSessionType = async (id: string) => {
    await db.collection('sessionTypes').doc(id).delete();
  };

  const addVideo = (video: Video) => setYoutubeVideos(prev => [video, ...prev]);
  const deleteVideo = (id: string) => setYoutubeVideos(prev => prev.filter(v => v.id !== id));

  const addStudioEquipment = async (equipment: StudioEquipment) => {
    const { id, ...rest } = equipment;
    await db.collection('studioEquipment').add(rest);
  };
  const updateStudioEquipment = async (id: string, data: Partial<StudioEquipment>) => {
    await db.collection('studioEquipment').doc(id).update(data);
  };
  const deleteStudioEquipment = async (id: string) => {
    await db.collection('studioEquipment').doc(id).delete();
  };

  const addSubscription = async (sub: Subscription) => {
    const { id, ...rest } = sub;
    await db.collection('subscriptions').add(rest);
  };
  const updateSubscription = async (id: string, data: Partial<Subscription>) => {
    await db.collection('subscriptions').doc(id).update(data);
  };

  const addSubscriptionPlan = async (plan: SubscriptionPlan) => {
    const { id, ...rest } = plan;
    await db.collection('subscriptionPlans').add(rest);
  };
  const updateSubscriptionPlan = async (id: string, data: Partial<SubscriptionPlan>) => {
    await db.collection('subscriptionPlans').doc(id).update(data);
  };
  const deleteSubscriptionPlan = async (id: string) => {
    await db.collection('subscriptionPlans').doc(id).delete();
  };

  const addStudioRoom = (room: StudioRoom) => setStudioRooms(prev => [room, ...prev]);
  const updateStudioRoom = (id: string, data: Partial<StudioRoom>) => setStudioRooms(prev => prev.map(r => r.id === id ? { ...r, ...data} : r));
  const deleteStudioRoom = (id: string) => setStudioRooms(prev => prev.filter(r => r.id !== id));
  const addMaintenanceLog = (log: MaintenanceLog) => setMaintenanceLogs(prev => [log, ...prev]);
  const updateMaintenanceLog = (id: string, data: Partial<MaintenanceLog>) => setMaintenanceLogs(prev => prev.map(l => l.id === id ? { ...l, ...data} : l));

  const updateOrder = async (id: string, data: Partial<Order>) => {
    await db.collection('orders').doc(id).update(data);
  };

  const addCampaign = (camp: NewsletterCampaign) => setNewsletterCampaigns(prev => [camp, ...prev]);
  const updateCampaign = (id: string, data: Partial<NewsletterCampaign>) => setNewsletterCampaigns(prev => prev.map(c => c.id === id ? {...c, ...data} : c));

  const addCoupon = (coupon: Coupon) => setCoupons(prev => [coupon, ...prev]);
  const updateCoupon = (id: string, data: Partial<Coupon>) => setCoupons(prev => prev.map(c => c.id === id ? {...c, ...data} : c));
  const deleteCoupon = (id: string) => setCoupons(prev => prev.filter(c => c.id !== id));

  const updateTelegramConfig = (config: Partial<TelegramConfig>) => setTelegramConfig(prev => ({...prev, ...config}));
  const addTelegramChannel = (channel: TelegramChannel) => setTelegramChannels(prev => [channel, ...prev]);
  const updateTelegramChannel = (id: string, data: Partial<TelegramChannel>) => setTelegramChannels(prev => prev.map(c => c.id === id ? {...c, ...data} : c));
  const deleteTelegramChannel = (id: string) => setTelegramChannels(prev => prev.filter(c => c.id !== id));

  const updateShippingZone = (id: string, data: Partial<ShippingZone>) => setShippingZones(prev => prev.map(z => z.id === id ? {...z, ...data} : z));
  const addSubscriber = (email: string) => setSubscribers(prev => [{id: `sub_${Date.now()}`, email, dateSubscribed: new Date().toISOString().split('T')[0], status: 'active', source: 'Manual'}, ...prev]);

  const updateUser = async (id: string, data: Partial<User>) => {
    await db.collection('users').doc(id).update(data);
  };

  return (
    <DataContext.Provider value={{
      siteConfig, products, mixtapes, bookings, sessionTypes, youtubeVideos, poolTracks, genres, studioEquipment, shippingZones, subscribers, subscriptions, orders, newsletterCampaigns, newsletterSegments,
      subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users,
      telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
      seedDatabase, 
      updateSiteConfig, addProduct, updateProduct, deleteProduct,
      addMixtape, updateMixtape, deleteMixtape, 
      addPoolTrack, updatePoolTrack, deletePoolTrack, updateGenre,
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
        if(!isAdmin) {
            setData([]);
            return;
        }
        const unsub = db.collection(colName).onSnapshot(
            snapshot => setData(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))),
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
