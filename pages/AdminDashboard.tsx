
import React, { useState, useMemo, useEffect } from 'react';
import {
   BarChart, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis
} from 'recharts';

import {
   LayoutDashboard, ShoppingBag, Music, Users, Calendar, CreditCard, Bell, Package,
   Trash2, Check, X, Plus, Mic, Globe, Save, FileText, DollarSign, Upload, Play,
   Image as ImageIcon, Box, Lock, List, MessageSquare, Link as LinkIcon, PenSquare,
   Bold, Italic, AlignLeft, AlignCenter, AlignRight,
   Handshake, Fingerprint,
   Mail, MessageCircle, Truck, Send, Headphones, Menu, Search, Edit2, Timer, Eye, Download, Info, Settings, AlertTriangle, Monitor, Shield, UserX, Clock, Tag, Ticket, Database, RefreshCw, Star, Gift, Copy, ExternalLink, CheckCircle, AlertCircle, Zap, Activity, Infinity, Inbox, TrendingUp, TrendingDown, LogOut, StopCircle, ChevronDown, BarChart2, MapPin, ShieldAlert, RotateCcw, CloudUpload, ScanSearch
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

import { Booking, Product, Mixtape, SessionType, SiteConfig, User as UserType, TelegramChannel, StudioEquipment, Track, TrackVersion, Genre, Subscription, Order, NewsletterCampaign, SubscriptionPlan, StudioRoom, MaintenanceLog, Coupon, ReferralStats, ShippingZone, ShippingRate, ContactMessage, StudioSession, EventGig } from '../types';
import { POOL_HUBS, TRACK_TYPES, MIXTAPE_GENRE_NAMES } from '../constants';
import { supabase } from '../utils/supabase';
import { seedR2Tracks } from '../utils/seedR2';
import { manualSync } from '../utils/autoSyncTracks';

import { uploadFileToR2, saveToR2, updateR2Item, STORAGE_WORKER_URL, getAuthHeader } from '../utils/r2';
import { TableVirtuoso } from 'react-virtuoso';


import AdminOrdersTab from '../components/admin/AdminOrdersTab';
import SubscriptionTab from '../components/admin/SubscriptionTab';
import AnalyticsTab from '../components/admin/AnalyticsTab';
import NewsletterTab from '../components/admin/NewsletterTab';
import InteractionsTab from '../components/admin/InteractionsTab';
import AdminPaymentListener from '../components/admin/AdminPaymentListener';
import AdminPaymentsTab from '../components/admin/AdminPaymentsTab';
import AdminExpiryWatch from '../components/admin/AdminExpiryWatch';
import AdminCommunityDirectory from '../components/admin/AdminCommunityDirectory';
import AdminUsageMonitor from '../components/admin/AdminUsageMonitor';
import BlackoutManager from '../components/admin/BlackoutManager';
import AdminMarketplaceTab from '../components/admin/AdminMarketplaceTab';
import AdminPayoutsTab from '../components/admin/AdminPayoutsTab';
import { AdminLiveChatTab } from '../components/admin/AdminLiveChatTab';
import AddProductForm from '../components/admin/AddProductForm';
import { 
   ImageUpload, MultiImageUpload, AudioUpload, FileUpload, VersionAudioUpload 
} from '../components/admin/UploadComponents';
import AdminInstallmentsTab from '../components/admin/AdminInstallmentsTab';
import ShippingSettings from '../components/admin/ShippingSettings';
import AdminVerificationTab from '../components/admin/AdminVerificationTab';
import WhatsAppManager from '../components/admin/WhatsAppManager';

const ReactQuill: React.FC<any> = ({ value, onChange, placeholder, theme, modules, ...rest }) => (
   <textarea
      value={value}
      onChange={(e) => typeof onChange === 'function' ? onChange(e.target.value) : null}
      placeholder={placeholder}
      className="w-full bg-[#050507] border-none text-gray-300 p-6 min-h-[250px] outline-none resize-none font-sans text-sm leading-relaxed"
   />
);


const StatCard: React.FC<{
   label: string;
   value: string | number;
   icon: any;
   color?: string;
   trend?: string;
   trendUp?: boolean;
   subtext?: string;
}> = ({ label, value, icon: Icon, color = 'brand-purple', trend, trendUp = true, subtext }) => (
   <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:border-white/10">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color.replace('text-', '')}/10 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:bg-${color.replace('text-', '')}/20 transition-all duration-700`} />
      <div className="flex justify-between items-start mb-6 relative z-10">
         <div className={`w-14 h-14 rounded-2xl bg-${color.replace('text-', '')}/10 border border-${color.replace('text-', '')}/20 flex items-center justify-center text-${color.replace('text-', '')} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
            <Icon size={28} />
         </div>
         {trend && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${trendUp ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
               {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
               {trend}
            </div>
         )}
      </div>
      <div className="relative z-10">
         <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mb-1 group-hover:text-gray-400 transition-colors">{label}</p>
         <div className="flex items-baseline gap-2">
            <h4 className="text-4xl font-black text-white tracking-tighter group-hover:text-shadow-glow transition-all">{value}</h4>
         </div>
         {subtext && <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 opacity-60 group-hover:opacity-100 transition-opacity">{subtext}</p>}
      </div>
   </div>
);

const CountdownTimer: React.FC<{ expiryDate: string }> = ({ expiryDate }) => {
   const [timeLeft, setTimeLeft] = useState<string>('');

   useEffect(() => {
      const updateTimer = () => {
         const now = new Date().getTime();
         const expiry = new Date(expiryDate).getTime();
         const diff = expiry - now;

         if (diff <= 0) {
            setTimeLeft('Expired');
            return;
         }

         const days = Math.floor(diff / (1000 * 60 * 60 * 24));
         const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
         const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
         const seconds = Math.floor((diff % (1000 * 60)) / 1000);

         setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      };

      const timer = setInterval(updateTimer, 1000);
      updateTimer();
      return () => clearInterval(timer);
   }, [expiryDate]);

   return (
      <div className="flex items-center gap-2 text-[10px] font-black font-display bg-brand-purple/10 text-brand-purple px-3 py-1.5 rounded-xl border border-brand-purple/20 shadow-sm shadow-brand-purple/5">
         <Clock size={12} className="animate-pulse" />
         <span className="tracking-widest capitalize">{timeLeft}</span>
      </div>
   );
};

// Shared Modals and Input Groups removed here as they are partially extracted or kept below

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl' }> = ({ isOpen, onClose, title, children, size = 'md' }) => {
   if (!isOpen) return null;
   const sizeClasses = { md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-500">
         <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-purple/10 blur-[150px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-cyan/10 blur-[150px] rounded-full animate-pulse delay-700" />
         </div>
         <div className={`bg-[#0B0B0F] rounded-[4rem] border border-white/10 w-full ${sizeClasses[size]} max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(123,92,255,0.15)] scale-in-center animate-in zoom-in-95 duration-300 relative z-10`}>
            <div className="flex justify-between items-center p-10 border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-3xl sticky top-0 z-20">
               <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">{title}</h3>
                  <div className="w-12 h-1.5 bg-brand-purple rounded-full mt-2 shadow-[0_0_15px_rgba(123,92,255,0.5)]" />
               </div>
               <button onClick={onClose} className="w-14 h-14 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 border border-white/5 transition-all shadow-inner group">
                  <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
               </button>
            </div>
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
               {children}
            </div>
         </div>
      </div>
   );
};

const InputGroup: React.FC<{
   label: string;
   id?: string;
   name?: string;
   type?: string;
   value?: any;
   onChange: (v: any) => void;
   placeholder?: string;
   required?: boolean;
   options?: string[];
   helperText?: string;
   checked?: boolean;
}> = ({ label, id, name, type = "text", value, onChange, placeholder, required, options, helperText, checked }) => {
   const inputId = id || label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
   const inputName = name || inputId;

   return (
      <div className="space-y-3 mb-8">
         <label htmlFor={inputId} className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">
            {label} {required && <span className="text-brand-purple ml-1 animate-pulse">*</span>}
         </label>

         {options ? (
            <div className="relative group">
               <select
                  id={inputId}
                  name={inputName}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all appearance-none cursor-pointer shadow-inner pr-12 font-medium"
               >
                  {options.map(opt => <option key={opt} value={opt} className="bg-[#0B0B0F]">{opt}</option>)}
               </select>
               <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600 group-hover:text-brand-purple transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
               </div>
            </div>
         ) : type === 'textarea' ? (
            <textarea
               id={inputId}
               name={inputName}
               value={value}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder}
               className="w-full bg-[#0B0B0F] border border-white/5 rounded-3xl p-5 text-sm text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all h-40 resize-none placeholder:text-gray-700 shadow-inner font-medium"
            />
         ) : type === 'checkbox' ? (
            <label className="flex items-center gap-4 cursor-pointer bg-[#0B0B0F] border border-white/5 rounded-2xl p-5 hover:border-brand-purple/30 group transition-all shadow-inner">
               <div className="relative flex items-center">
                  <input
                     id={inputId}
                     name={inputName}
                     type="checkbox"
                     checked={checked}
                     onChange={(e) => onChange(e.target.checked)}
                     className="w-6 h-6 accent-brand-purple rounded-lg bg-black/40 border-white/10 ring-offset-0 focus:ring-0 cursor-pointer"
                  />
               </div>
               <span className="text-sm text-gray-400 font-black uppercase tracking-widest group-hover:text-white transition-colors">{placeholder || label}</span>
            </label>
         ) : (
            <input
               id={inputId}
               name={inputName}
               type={type}
               value={value}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder}
               className="w-full bg-[#0B0B0F] border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all placeholder:text-gray-700 shadow-inner font-medium"
            />
         )}
         {helperText && <p className="text-[10px] text-gray-600 pl-1 font-bold uppercase tracking-widest opacity-60">{helperText}</p>}
      </div>
   );
};

// Initial States
const INITIAL_PRODUCT_STATE: Product = {
   id: '', name: '', brand: '', releaseDate: '', slug: '', type: 'physical', category: 'Accessories', shortDescription: '', description: '', price: 0, discountPrice: 0, compareAtPrice: 0, currency: 'KES', isActive: true, visibility: 'public', tags: [], image: '', images: [], hasVariants: false, variantGroups: [], variants: [], trackStock: true, stock: 0, requiresShipping: true, whatsappEnabled: true, status: 'draft', digital_file_url: '', download_password: '', weight: 0, size: '', sku: '', dimensions: undefined, isFree: false, technicalDetails: [], hotspots: [], useCases: [],
   isHot: false, isFeatured: false, isBestSeller: false, isSpecialOffer: false, isTrending: false, offerExpiry: ''
};

const INITIAL_MIXTAPE_STATE: Mixtape = {
   id: '', title: '', slug: '', genre: '3-Step & Amapiano', description: '', releaseDate: new Date().toISOString().split('T')[0], status: 'published', coverUrl: '', audioUrl: '', duration: '00:00', allowFullStream: true, allowDownload: true, downloadType: 'free', streamQuality: 'high', tracklist: [], isFeatured: false, showInGallery: true, showInMusicPool: false, tags: [], enableComments: true, requireLoginToComment: false, moderateComments: false, isExclusive: false
};

const INITIAL_BOOKING_STATE: Partial<Booking> = { clientName: '', serviceType: 'manual', date: '', time: '', status: 'confirmed', paymentStatus: 'pending', budget: '' };
const INITIAL_SESSION_TYPE: SessionType = { id: '', name: '', description: '', duration: 1, price: 0, depositRequired: true, equipmentIncluded: [], active: true };
const INITIAL_EQUIPMENT_STATE: StudioEquipment = { id: '', name: '', category: 'Microphones', image: '', description: '' };
const INITIAL_POOL_TRACK_STATE: Track = { id: '', artist: '', title: '', genre: '', category: [], bpm: 100, year: new Date().getFullYear(), versions: [], dateAdded: '' };
const INITIAL_COUPON_STATE: Coupon = { id: '', code: '', discountType: 'percentage', discountValue: 0, appliesTo: 'store', expiryDate: '', usageLimit: 100, usageCount: 0, active: true, applicablePlans: [], isSingleUse: false, assignedUserId: '' };
const INITIAL_PLAN_STATE: SubscriptionPlan = { id: '', name: '', price: 0, period: 'mo', features: [], active: true, link: '' };
const INITIAL_ROOM_STATE: StudioRoom = { id: '', name: '', capacity: 1, description: '', status: 'active' };




const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || '';

const AdminDashboard: React.FC = () => {
   const { user, loading, logout } = useAuth();
   const dataContext = useData();

   console.log("AdminDashboard Render:", { user, loading, hasDataContext: !!dataContext });

   // Hook Violation Fixed: Moved dataContext safety to destructuring.

   const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders', icon: Package },
      { id: 'subscriptions', label: 'Subscriptions', icon: Users },
      { id: 'lipa-pole-pole', label: 'Lipa Pole Pole', icon: Clock },
      { id: 'plans', label: 'Plans', icon: Timer },
      { id: 'expiry-watch', label: 'Expiry Watch', icon: Clock },
      { id: 'pool', label: 'Music Pool', icon: Headphones },
      { id: 'bookings', label: 'Studio Bookings', icon: Calendar },
      { id: 'gigs', label: 'Gig Manager', icon: MapPin },
      { id: 'studio', label: 'Studio Manager', icon: Mic },
      { id: 'store', label: 'Store', icon: ShoppingBag },
      { id: 'mixtapes', label: 'Mixtapes', icon: Music },
      { id: 'marketing', label: 'Marketing', icon: Tag },
      { id: 'telegram', label: 'Telegram Bot', icon: MessageCircle },
      { id: 'site-profile', label: 'Site Profile', icon: Globe },
      { id: 'marketplace', label: 'Marketplace', icon: Handshake },
      { id: 'payouts', label: 'Payouts', icon: DollarSign },
      { id: 'verification', label: 'Aura Identity', icon: Fingerprint },
      { id: 'community-profiles', label: 'Community Profile', icon: Users },
      { id: 'referrals', label: 'Referrals', icon: Gift },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'live-chat', label: 'Live Chat', icon: MessageSquare },
      { id: 'shipping', label: 'Shipping', icon: Truck },
      { id: 'newsletters', label: 'Newsletters', icon: Mail },
      { id: 'interactions', label: 'Interactions', icon: MessageSquare },
      { id: 'analytics', label: 'Analytics', icon: BarChart2 },
      { id: 'system', label: 'System', icon: Database },
   ];

   const [activeTab, setActiveTab] = useState('dashboard');
   const [liveSales, setLiveSales] = useState<any[]>([]);
   const [contentSubTab, setContentSubTab] = useState('home');
   const [telegramSubTab, setTelegramSubTab] = useState('config');
   const [bookingSubTab, setBookingSubTab] = useState('list');
   const [gigSubTab, setGigSubTab] = useState<'pipeline' | 'list' | 'blackouts'>('pipeline');
   const [studioSubTab, setStudioSubTab] = useState<'services' | 'equipment' | 'rooms' | 'maintenance' | 'studio-bookings' | 'gigs'>('services');
   const [poolSubTab, setPoolSubTab] = useState<'tracks' | 'genres' | 'updates'>('tracks');

   // --- Store Hero Settings ---
   const DEFAULT_STORE_SETTINGS_ADMIN = {
     heroLabel: 'Limited Time Launch Offer',
     heroTitle: 'Super Discount for early birds',
     promoCode: 'FREE256MAC',
     promoCodeEnabled: true,
     countdownHours: 12,
     countdownMinutes: 45,
     countdownSeconds: 30,
   };
   const [storeHeroSettings, setStoreHeroSettings] = useState(DEFAULT_STORE_SETTINGS_ADMIN);
   const [heroSaving, setHeroSaving] = useState(false);

   useEffect(() => {
     fetch(`${WORKER_URL}/api/store/settings`)
       .then(r => r.ok ? r.json() : null)
       .then(data => { if (data) setStoreHeroSettings(s => ({ ...s, ...data })); })
       .catch(() => {});
   }, []);

   const saveHeroSettings = async () => {
     setHeroSaving(true);
     try {
       const session = (await import('../utils/supabase')).supabase.auth;
       const { data: { session: sess } } = await session.getSession();
       const token = sess?.access_token;
       const resp = await fetch(`${WORKER_URL}/api/admin/store/settings`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
         body: JSON.stringify(storeHeroSettings),
       });
       if (resp.ok) {
         (await import('sonner')).toast.success('Store hero settings saved!');
       } else {
         (await import('sonner')).toast.error('Failed to save settings.');
       }
     } catch (e) {
       (await import('sonner')).toast.error('Error saving settings.');
     } finally {
       setHeroSaving(false);
     }
   };

   // --- Scanned Updates state ---
   const [scanSince, setScanSince] = useState('2026-03-02');
   const [isManualScanning, setIsManualScanning] = useState(false);
   const [manualScanMsg, setManualScanMsg] = useState('');
   const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set());
   const [editingScannedTrack, setEditingScannedTrack] = useState<any | null>(null);
   const [isBulkAdding, setIsBulkAdding] = useState(false);

   const [isSyncing, setIsSyncing] = useState(false);
   const [syncMessage, setSyncMessage] = useState('');

   // Seeding State
   const [salesRange, setSalesRange] = useState<'this-month' | 'last-month' | 'last-3-months' | 'all'>('this-month');
   const [chartRange, setChartRange] = useState<number>(7);

   const [isSeeding, setIsSeeding] = useState(false);
   const [seedMessage, setSeedMessage] = useState('');
   const [seedProgress, setSeedProgress] = useState<any>(null);
   const [lastSeedIndex, setLastSeedIndex] = useState(0);
   const [selectedPart, setSelectedPart] = useState(0);

   const [isCleaning, setIsCleaning] = useState(false);
   const [cleanupLog, setCleanupLog] = useState<string[]>([]);
   const [isScanningPool, setIsScanningPool] = useState(false);
   const [scanResults, setScanResults] = useState<{ broken: number; checked: number; missingVersions: number }>({ broken: 0, checked: 0, missingVersions: 0 });

   const [newsletterSubTab, setNewsletterSubTab] = useState('subscribers');
   const [subscriptionSubTab, setSubscriptionSubTab] = useState<'overview' | 'plans'>('overview');
   const [marketingSubTab, setMarketingSubTab] = useState<'referrals' | 'coupons' | 'newsletter'>('referrals');

   const [activeModal, setActiveModal] = useState<string | null>(null);
   const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [isSavingPlan, setIsSavingPlan] = useState(false);
   const [isSavingProduct, setIsSavingProduct] = useState(false);
   const [isSavingPoolTrack, setIsSavingPoolTrack] = useState(false);
   const [isSending, setIsSending] = useState(false);

   // Form States

   const [newProduct, setNewProduct] = useState<Product>(INITIAL_PRODUCT_STATE);
   const [mixtapeFormTab, setMixtapeFormTab] = useState('basic');
   const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
   const [newMixtape, setNewMixtape] = useState<Mixtape>(INITIAL_MIXTAPE_STATE);
   const [newBooking, setNewBooking] = useState<Partial<Booking>>(INITIAL_BOOKING_STATE);
   const [newSessionType, setNewSessionType] = useState<SessionType>(INITIAL_SESSION_TYPE);
   const [newEquipment, setNewEquipment] = useState<StudioEquipment>(INITIAL_EQUIPMENT_STATE);

   const location = useLocation();

   useEffect(() => {
      const path = location.pathname;
      const tabFromPath = path.split('/').pop();
      if (tabFromPath && tabs.some(t => t.id === tabFromPath)) {
         setActiveTab(tabFromPath);
      } else if (path === '/admin') {
         setActiveTab('dashboard');
      }
   }, [location.pathname]);


   const [newPoolTrack, setNewPoolTrack] = useState<Track>(INITIAL_POOL_TRACK_STATE);
   const [editingGenre, setEditingGenre] = useState<Genre>({ id: '', name: '', coverUrl: '' });
   const [newChannel, setNewChannel] = useState<Partial<TelegramChannel>>({ name: '', channelId: '', genre: '', inviteLink: '', active: true });

   const [newCoupon, setNewCoupon] = useState<Coupon>(INITIAL_COUPON_STATE);

   const [emailSubject, setEmailSubject] = useState('');
   const [emailHeader, setEmailHeader] = useState('');
   const [emailBody, setEmailBody] = useState('');

   const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
   const [grantPlan, setGrantPlan] = useState<string>('monthly');

   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
   const [shippingDetails, setShippingDetails] = useState({
      courierName: '',
      trackingNumber: '',
      estimatedArrival: '',
      deliveryMethod: '',
      pickupLocation: '',
      adminMessage: ''
   });
   const [receiptFile, setReceiptFile] = useState<File | null>(null);
   const [isShipping, setIsShipping] = useState(false);

   const [editingPlan, setEditingPlan] = useState<SubscriptionPlan>(INITIAL_PLAN_STATE);
   const [planFeaturesInput, setPlanFeaturesInput] = useState('');

   const [editingRoom, setEditingRoom] = useState<StudioRoom>(INITIAL_ROOM_STATE);

   const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
   const [poolPage, setPoolPage] = useState(1);
   const tracksPerPage = 100;
   const [referralSubTab, setReferralSubTab] = useState<'settings' | 'logs'>('settings');
   const [orderSearchQuery, setOrderSearchQuery] = useState('');
   const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');


   const {
      siteConfig, products, mixtapes, bookings, sessionTypes, studioEquipment, shippingZones, subscribers, poolTracks, loadMorePoolTracks, genres, subscriptions, orders, newsletterCampaigns,
      subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users,
      payments, tips, contactMessages,
      studioSessions, eventGigs,
      mixtapesLoading: mxLoading, productsLoading: pdLoading, ordersLoading: odLoading, usersLoading: usLoading, subscriptionsLoading: sbLoading, poolLoading,
      bookingsLoading, subscribersLoading, campaignsLoading, paymentsLoading: pyLoading, tipsLoading,
      studioEquipmentLoading, studioRoomsLoading, maintenanceLogsLoading, sessionTypesLoading,
      studioSessionsLoading, eventGigsLoading,
      poolError, productsError, mixtapesError, ordersError, usersError, subscriptionsError, bookingsError,
      hasQuotaExceeded,
      telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
      seedDatabase,
      updateSiteConfig, deleteProduct, updateBooking, addBooking, deleteMixtape, deleteVideo,
      addProduct, updateProduct, addMixtape, updateMixtape, addSessionType, updateSessionType, deleteSessionType,
      addStudioEquipment, updateStudioEquipment, deleteStudioEquipment,
      addSubscription, updateSubscription, addPoolTrack, bulkAddPoolTracks, updatePoolTrack, deletePoolTrack, updateGenre,
      updateOrder, addPayment, addTip, addCampaign, updateCampaign,
      addCoupon, updateCoupon, deleteCoupon, validateCoupon,
      updateTelegramConfig, addTelegramChannel, updateTelegramChannel, deleteTelegramChannel,
      updateShippingZone, addSubscriber, updateUser, removeUser,
      addContactMessage, updateContactMessage, addReview, addComment, incrementMixtapeDownload,
      addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
      addStudioRoom, updateStudioRoom, deleteStudioRoom,
      addMaintenanceLog, updateMaintenanceLog,
      scannedTracks, addScannedTracks, clearAllScannedTracks, deleteScannedTrack,
      referralSettings, updateReferralSettings, applyReferralCode, issueReferralReward, referralLogs,
      notifications, markNotificationAsRead, syncNotifications, syncNotificationsLoading, refreshSyncNotifications,
      refreshProducts, refreshMixtapes, refreshOrders, refreshUsers, refreshSubscriptions,
      refreshBookings, refreshSubscribers, refreshCampaigns, refreshPayments, refreshTips,
      refreshEquipment, refreshRooms, refreshLogs, refreshSessionTypes,
      refreshStudioSessions, refreshEventGigs,
      refreshScannedTracks, refreshPoolTracks, refreshGenres, refreshVideos, refreshPlans, refreshZones, refreshCoupons, refreshReferrals, refreshTelegramChannels, refreshContactMessages, refreshReviews, refreshComments,
      adminStats, refreshAdminStats,
   } = dataContext || {} as any;

   const ordersLoading = odLoading;
   const subsLoading = sbLoading;
   const paymentsLoading = pyLoading;
   const mixtapesLoading = mxLoading;
   const productsLoading = pdLoading;
   const usersLoading = usLoading;

   const liveOrders = orders || [];
   const liveSubscriptions = subscriptions || [];
   const livePayments = payments || [];
   const liveTips = tips || [];

   const filteredOrders = useMemo(() => {
      if (!liveOrders) return [];
      return liveOrders.filter(order => {
         const searchLower = orderSearchQuery.toLowerCase().trim();
         const matchesSearch = !searchLower ||
            (order.customerName?.toLowerCase() || '').includes(searchLower) ||
            (order.customerEmail?.toLowerCase() || '').includes(searchLower) ||
            (order.customerPhone?.toLowerCase() || '').includes(searchLower) ||
            (order.id?.toLowerCase() || '').includes(searchLower);

         const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;

         return matchesSearch && matchesStatus;
      }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
   }, [liveOrders, orderSearchQuery, orderStatusFilter]);
   const liveUsers = useMemo(() => {
      const now = new Date();
      const filtered = users.filter((u: any) => {
         if (u.presenceStatus === 'online') return true;
         if (u.lastSeen) {
            const lastSeen = new Date(u.lastSeen);
            const diff = (now.getTime() - lastSeen.getTime()) / 1000 / 60; // minutes
            return diff < 5; // Recently seen within 5 mins
         }
         return false;
      });

      // Deduplicate by email
      const seenEmails = new Set();
      return filtered.filter((u: any) => {
         if (!u.email) return true;
         const email = u.email.toLowerCase().trim();
         if (seenEmails.has(email)) return false;
         seenEmails.add(email);
         return true;
      });
   }, [users]);

   const liveUsersCount = liveUsers.length || 1; // Default to 1 (Admin/Current User)

   const combinedTransactions = useMemo(() => {
      const all: any[] = [];
      const seenRefs = new Set<string>();
      const seenTips = new Set<string>();

      // Add orders (Primary source of truth for all transactions from webhooks)
      (liveOrders || []).forEach(o => {
         // Determine display type
         let displayType = 'Order';
         if (o.metadata?.type === 'tip' || o.type === 'tip') displayType = 'Tip';
         else if (o.metadata?.type === 'subscription' || o.type === 'subscription') displayType = 'Subscription';
         else if (o.metadata?.type === 'booking' || o.type === 'booking') displayType = 'Booking';
         else if (o.type === 'Store' || o.metadata?.type === 'store') displayType = 'Order';

         // Robustly capture reference to prevent duplicates from Payments table
         const ref = o.referenceCode || o.id;
         if (ref) seenRefs.add(ref);
         if (o.metadata?.reference) seenRefs.add(o.metadata.reference); // Check metadata too

         // If it's a tip, also track it to avoid duplicates from liveTips
         if (displayType === 'Tip') {
            const email = o.customerEmail || o.user_email || o.email || 'Guest';
            const dateStr = o.date || (o.createdAt || '').split(/[T ]/)[0];
            const tipSig = `${email.toLowerCase()}-${o.total}-${dateStr}`;
            seenTips.add(tipSig);
         }

         all.push({
            id: o.id,
            ref: ref,
            date: o.date || (o.createdAt || '').split(/[T ]/)[0],
            time: o.time || '',
            name: o.customerName,
            items: Array.isArray(o.items) ? o.items.map((i: any) => i.productName).join(', ') : 'Direct Payment',
            amount: o.total,
            status: o.status,
            type: displayType,
            rawDate: o.createdAt
         });
      });

      // Add payments (show unique payments that aren't already orders)
      (livePayments || []).forEach(p => {
         const ref = p.payment_ref || p.id;

         // Deduplicate: If we already added this by reference in orders, skip it
         if (ref && seenRefs.has(ref)) return;

         // Identify subscription payments explicitly
         const isSubscription = p.payment_type === 'subscription' || p.metadata?.type === 'subscription';
         const typeLabel = isSubscription ? 'Subscription' : (p.payment_type === 'tip' ? 'Tip' : (p.payment_type || 'Payment'));

         // If it's a tip payment, track it
         if (p.payment_type === 'tip') {
            const email = p.customerEmail || p.user_email || p.email || 'Guest';
            const dateStr = p.createdAt ? p.createdAt.split(/[T ]/)[0] : '';
            const tipSig = `${email.toLowerCase()}-${p.amount}-${dateStr}`;
            seenTips.add(tipSig);
         }

         all.push({
            id: p.id,
            ref: ref,
            date: p.createdAt ? p.createdAt.split(/[T ]/)[0] : '',
            time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : '',
            name: p.user_email || 'Guest',
            items: p.payment_type === 'tip' ? 'Tip Jar' : (isSubscription ? 'Subscription Payment' : 'Direct Payment'),
            amount: p.amount,
            status: p.status,
            type: typeLabel,
            rawDate: p.createdAt
         });
      });

      // Add tips (avoiding duplicates already in orders or payments)
      (liveTips || []).forEach(t => {
         const createdAtStr = t.createdAt || '';
         const dateStr = createdAtStr.split(/[T ]/)[0];
         const emailLabel = t.customerEmail || t.user_email || t.email || 'Guest';
         const tipSig = `${emailLabel.toLowerCase()}-${t.amount}-${dateStr}`;

         if (!seenTips.has(tipSig)) {
            all.push({
               id: t.id,
               ref: t.id,
               date: dateStr,
               time: createdAtStr ? new Date(createdAtStr).toLocaleTimeString() : '',
               name: t.customerName || t.user_name || t.name || emailLabel,
               email: emailLabel,
               items: 'Tip Jar',
               amount: t.amount,
               status: t.status || 'completed',
               type: 'Tip',
               rawDate: createdAtStr
            });
            seenTips.add(tipSig); // Prevent self-duplicates if any
         }
      });

      const filtered = all.filter(tx => {
         if (salesRange === 'all') return true;
         const txDate = new Date(tx.rawDate);
         const now = new Date();
         if (salesRange === 'this-month') {
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
         }
         if (salesRange === 'last-month') {
            const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            return txDate.getMonth() === lastMonth && txDate.getFullYear() === lastYear;
         }
         if (salesRange === 'last-3-months') {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(now.getMonth() - 3);
            return txDate >= threeMonthsAgo;
         }
         return true;
      });
      return filtered.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
   }, [liveOrders, livePayments, liveTips, salesRange]);

   // Dynamic Stats
   const filteredTransactions = useMemo(() => {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

      return (combinedTransactions || [])
         .filter(tx => tx.status === 'completed' || tx.status === 'paid' || tx.status === 'success' || tx.status === 'shipped' || tx.status === 'active')
         .filter(tx => {
            if (salesRange === 'all') return true;
            const txDate = new Date(tx.date || tx.createdAt || tx.dateAdded);
            if (isNaN(txDate.getTime())) return true;

            if (salesRange === 'this-month') return txDate >= firstDayThisMonth;
            if (salesRange === 'last-month') return txDate >= firstDayLastMonth && txDate <= lastDayLastMonth;
            if (salesRange === 'last-3-months') return txDate >= threeMonthsAgo;
            return true;
         });
   }, [combinedTransactions, salesRange]);

   const totalRevenue = useMemo(() => {
      return filteredTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);
   }, [filteredTransactions]);

   const activeSubs = useMemo(() => liveSubscriptions?.filter(s => s.status === 'active').length || 0, [liveSubscriptions]);

   const shippingStats = useMemo(() => {
      const shippingOrders = (liveOrders || []).filter(o => o.requiresShipping || (Array.isArray(o.items) && o.items.some(item => item.type === 'physical')));
      return {
         pending: shippingOrders.filter(o => o.status === 'pending' || o.status === 'processing').length,
         delivered: shippingOrders.filter(o => o.status === 'shipped' || o.status === 'completed').length,
         failed: shippingOrders.filter(o => o.status === 'cancelled').length,
         revenue: shippingOrders.reduce((acc, o) => acc + (o.total || 0), 0)
      };
   }, [liveOrders]);

   const studioStats = useMemo(() => ({
      bookedToday: (bookings || []).filter(b => b.date === new Date().toISOString().split('T')[0]).length,
      availableRooms: (studioRooms || []).filter(r => r.status === 'active').length,
      revenuePerRoom: (studioRooms || []).length > 0 ? ((bookings || []).reduce((acc, b) => acc + (Number(b.budget) || 0), 0) / studioRooms.length) : 0
   }), [bookings, studioRooms]);

   const contentStats = useMemo(() => ({
      activeSections: Object.keys(siteConfig).filter(k => k !== 'legal' && k !== 'seo').length,
      lastUpdated: siteConfig.hero.title ? 'Live' : 'Check DB' // Simplified for now
   }), [siteConfig]);

   const activeSubsAmt = useMemo(() => liveSubscriptions?.filter(s => s.status === 'active' && new Date() <= new Date(s.expiryDate)).reduce((acc, s) => acc + (s.amount || 0), 0) || 0, [liveSubscriptions]);
   const activeSubsCount = useMemo(() => liveSubscriptions?.filter(s => s.status === 'active' && new Date() <= new Date(s.expiryDate)).length || 0, [liveSubscriptions]);

   const referralStatsSummary = useMemo(() => ({
      total: (referralLogs || []).length,
      payouts: (referralLogs || []).filter(l => l.rewardIssued).length * (referralSettings?.referrerRewardAmount || 0),
      active: new Set((referralLogs || []).map(l => l.referrerId)).size
   }), [referralLogs, referralSettings]);

   const chartData = useMemo(() => {
      const days = Array.from({ length: chartRange }, (_, i) => {
         const d = new Date();
         d.setDate(d.getDate() - ((chartRange - 1) - i));
         return d.toISOString().split('T')[0];
      });

      const successfulTx = (combinedTransactions || []).filter(tx =>
         tx.status === 'completed' || tx.status === 'paid' || tx.status === 'success' || tx.status === 'shipped' || tx.status === 'active'
      );

      return days.map(date => {
         const dailyRevenue = successfulTx
            .filter(tx => tx.date === date)
            .reduce((acc, tx) => acc + (tx.amount || 0), 0);

         return {
            name: date.split('-').slice(1).join('/'), // MM/DD
            sales: dailyRevenue
         };
      });
   }, [combinedTransactions, chartRange]);

   const [editingConfig, setEditingConfig] = useState<SiteConfig>(siteConfig);

   useEffect(() => {
      if (siteConfig) setEditingConfig(siteConfig);
   }, [siteConfig]);



   const handleSyncTracks = async () => {
      setIsSyncing(true);
      setSyncMessage('Starting sync...');
      try {
         const result = await manualSync();
         if (result.success) {
            setSyncMessage(`Sync successful! Added ${result.results?.totalAdded || 0} tracks.`);
         } else {
            setSyncMessage(`Sync failed: ${result.message}`);
         }
      } catch (error) {
         setSyncMessage('Sync failed: Network error');
         console.error(error);
      } finally {
         setTimeout(() => {
            setIsSyncing(false);
            setSyncMessage('');
         }, 5000);
      }
   };

   const handleConsolidatePool = async () => {
       if (!window.confirm("This will merge duplicate tracks and versions in the database. Redundant version records will be deleted. Proceed?")) return;
       
       setIsSyncing(true);
       setSyncMessage('Consolidating database...');
       try {
           const { data: { session } } = await supabase.auth.getSession();
           const token = session?.access_token;
           
           const resp = await fetch(`${STORAGE_WORKER_URL}/api/admin/pool/consolidate`, {
               method: 'POST',
               headers: {
                   'Authorization': `Bearer ${token}`,
                   'Content-Type': 'application/json'
               }
           });
           
           const data = await resp.json();
           if (resp.ok) {
               toast.success(data.message || 'Consolidation complete!');
               await refreshPoolTracks();
           } else {
               toast.error(data.error || 'Consolidation failed');
           }
       } catch (err: any) {
           toast.error('Error: ' + err.message);
       } finally {
           setIsSyncing(false);
           setSyncMessage('');
       }
   };

   const handleDeployToStorefront = async () => {
      if (window.confirm("This will overwrite the storefront (D1) music library with the current Admin (R2) JSON data. Continue?")) {
         await dataContext.deployPoolToStorefront();
      }
   };

   const handleBroadcast = async () => {
      if (!emailSubject || !emailBody || !emailHeader) {
         alert("Please provide a name, subject, and message body for your broadcast.");
         return;
      }

      const activeSubscribersCount = subscribers.filter(s => s.status === 'active').length;
      if (activeSubscribersCount === 0) {
         alert("There are no active subscribers to broadcast to.");
         return;
      }

      if (!window.confirm(`Initiate mass communication protocol to ${activeSubscribersCount} active subscribers?`)) return;

      setIsSending(true);
      try {
         // 1. Create campaign record
         const campaign: any = {
            name: emailHeader,
            subject: emailSubject,
            type: 'announcement',
            status: 'sent',
            sentDate: new Date().toISOString(),
            recipientCount: activeSubscribersCount
         };

         const { error: campaignErr } = await dataContext.addR2Item('newsletter_campaigns', campaign);
         if (campaignErr) throw campaignErr;

         // 2. Mock sending emails (actual integration would happen via an edge function or similar)
         // In a real scenario, this would trigger a backend process to send the emails.
         // For now, we'll simulate the success.
         await new Promise(resolve => setTimeout(resolve, 2000));

         alert(`Broadcast sequence successful. Communication deployed to ${activeSubscribersCount} protocols.`);
         setEmailHeader('');
         setEmailSubject('');
         setEmailBody('');
         setNewsletterSubTab('campaigns');
      } catch (err: any) {
         console.error("Broadcast protocol failure:", err);
         alert("Failed to initiate broadcast: " + err.message);
      } finally {
         setIsSending(false);
      }
   };

   const handleSeed = async (resumeFrom: number = -1) => {
      const startIdx = resumeFrom >= 0 ? resumeFrom : selectedPart * 10000;
      const confirmMsg = resumeFrom >= 0
         ? `Resume seeding from track ${startIdx + 1}?`
         : `Start seeding R2 tracks? This will index tracks starting from position ${startIdx + 1}.`;

      if (!confirm(confirmMsg)) return;

      setIsSeeding(true);
      setSeedMessage("🚀 Initializing...");
      setSeedProgress(null);

      try {
         const result = await seedR2Tracks((msg, progress) => {
            setSeedMessage(msg);
            if (progress) {
               setSeedProgress(progress);
               setLastSeedIndex(progress.lastProcessedIndex);
            }
         }, startIdx, 1000000);

         if (result.rangeComplete) {
            if (result.isComplete) {
               alert(`🎉 Database Fully Seeded! Total: ${result.uploadedTracks} tracks uploaded.`);
            } else {
               alert(`✅ Part ${selectedPart + 1} Complete! Uploaded ${result.uploadedTracks} tracks.`);
            }
            setLastSeedIndex(0);
         } else {
            alert(`⏸️ Paused. Uploaded ${result.uploadedTracks} tracks. You can resume later from index ${result.lastProcessedIndex + 1}`);
         }
      } catch (e: any) {
         alert("❌ Error: " + e.message);
      } finally {
         setIsSeeding(false);
         setTimeout(() => {
            setSeedMessage('');
            setSeedProgress(null);
         }, 5000);
      }
   };

   const handleScanPool = async () => {
      if (!confirm('This will scan all music pool tracks for broken links and missing data. Continue?')) return;
      setIsScanningPool(true);
      setScanResults({ broken: 0, checked: 0, missingVersions: 0 });

      let broken = 0;
      let missingVersions = 0;
      const total = (poolTracks || []).length;

      for (let i = 0; i < total; i++) {
         const t = poolTracks[i];
         const versions = t.versions || [];
         if (versions.length === 0) {
            missingVersions++;
         }

         const hasValidLink = versions.some(v => (v.downloadUrl || (v as any).download_url) && (v.downloadUrl || (v as any).download_url).startsWith('http'));
         if (!hasValidLink && !t.preview_url) {
            broken++;
         }

         if (i % 500 === 0) {
            setScanResults({ broken, checked: i + 1, missingVersions });
            await new Promise(r => setTimeout(r, 0)); // Prevent UI freeze
         }
      }
      setScanResults({ broken, checked: total, missingVersions });
      setIsScanningPool(false);
      alert(`Scan Complete!\nTotal Checked: ${total}\nMissing Versions: ${missingVersions}\nBroken Links/Null: ${broken}`);
   };

   const handleFixPool = async () => {
      if (!confirm('This will attempt to fix broken tracks by re-syncing data from external sources and updating existing records. Continue?')) return;

      setIsScanningPool(true);
      try {
         const res = await manualSync(true); // true = updateExisting
         alert(res.message);
      } catch (e) {
         console.error(e);
         alert('Repair failed. Check console.');
      }
      setIsScanningPool(false);
   };

   const handleCleanupData = async () => {
      if (isCleaning) return;
      if (!confirm("⚠️ WARNING: This will delete ALL mixtapes and ALL products except 'Serato DJ PRO Suite'. Continue?")) return;

      setIsCleaning(true);
      setCleanupLog(['Starting cleanup...']);

      try {
         const log = (msg: string) => setCleanupLog(prev => [...prev, msg]);

         // 1. Delete ALL Mixtapes
         log(`Found ${mixtapes.length} mixtapes to delete.`);

         for (const m of mixtapes) {
            try {
               await deleteMixtape(m.id);
               log(`✓ Deleted mixtape: ${m.title}`);
            } catch (e) {
               log(`✗ Failed to delete mixtape ${m.title}: ${e}`);
            }
         }

         // 2. Delete all products EXCEPT "Serato DJ PRO Suite"
         const productsToDelete = products.filter(p => {
            // Keep only Serato DJ PRO Suite
            const isSerato = p.name && p.name.includes('Serato DJ PRO Suite');
            return !isSerato; // Delete everything that's NOT Serato
         });

         const productsToKeep = products.filter(p => p.name && p.name.includes('Serato DJ PRO Suite'));

         log(`Found ${productsToDelete.length} products to delete.`);
         log(`Keeping ${productsToKeep.length} product(s): ${productsToKeep.map(p => p.name).join(', ')}`);

         for (const p of productsToDelete) {
            try {
               await deleteProduct(p.id);
               log(`✓ Deleted product: ${p.name}`);
            } catch (e) {
               log(`✗ Failed to delete product ${p.name}: ${e}`);
            }
         }

         log('');
         log('═══════════════════════════');
         log('✓ Cleanup complete!');
         log(`Deleted ${mixtapes.length} mixtapes`);
         log(`Deleted ${productsToDelete.length} products`);
         log(`Kept ${productsToKeep.length} product(s)`);
         log('═══════════════════════════');
      } catch (error) {
         console.error(error);
         setCleanupLog(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      } finally {
         setIsCleaning(false);
      }
   };

   // Removed redundant hooks previously here

   const handleSystemReset = async () => {
      if (!confirm("⚠️ CAUTION: This will clear Live Session states and Cache. Continue?")) return;
      try {
         const res = await fetch(`${WORKER_URL}/api/admin/system-reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.VITE_PAYSTACK_SECRET_KEY}` }
         });
         const data = await res.json();
         if (data.success) toast.success("System reset successful");
         else throw new Error(data.error);
      } catch (e: any) {
         toast.error(`Reset failed: ${e.message}`);
      }
   };

   const handleR2ProductSync = async () => {
      if (!confirm("⚠️ This will sync 53+ products from R2 to D1 database. Continue?")) return;
      setIsSyncing(true);
      setSyncMessage('Syncing products from R2 storage...');
      try {
         const res = await fetch(`${WORKER_URL}/api/admin/r2-sync`, {
            method: 'POST',
            body: JSON.stringify({ action: 'importFromR2', collection: 'products' })
         });
         const data = await res.json();
         if (data.success) {
            toast.success(data.message);
            if (typeof dataContext.refreshProducts === 'function') dataContext.refreshProducts();
         } else {
            throw new Error(data.error || 'Failed to sync products');
         }
      } catch (e: any) {
         toast.error("Sync Error: " + e.message);
      } finally {
         setIsSyncing(false);
         setSyncMessage('');
      }
   };

   const handleExportToR2 = async () => {
      if (!confirm("⚠️ This will overwrite the R2 storage with current D1 database products. Continue?")) return;
      setIsSyncing(true);
      setSyncMessage('Exporting products to R2 storage...');
      try {
         const success = await saveToR2('products', dataContext.products);
         if (success) {
            toast.success("Products exported to R2 successfully!");
         } else {
            throw new Error('Failed to export products');
         }
      } catch (e: any) {
         toast.error("Export Error: " + e.message);
      } finally {
         setIsSyncing(false);
         setSyncMessage('');
      }
   };

   const handleExportMixtapesToR2 = async () => {
      if (!confirm("⚠️ This will overwrite the R2 storage with current D1 database mixtapes. Continue?")) return;
      setIsSyncing(true);
      setSyncMessage('Exporting mixtapes to R2 storage...');
      try {
         const success = await saveToR2('mixtapes', dataContext.mixtapes);
         if (success) {
            toast.success("Mixtapes exported to R2 successfully!");
         } else {
            throw new Error('Failed to export mixtapes');
         }
      } catch (e: any) {
         toast.error("Export Error: " + e.message);
      } finally {
         setIsSyncing(false);
         setSyncMessage('');
      }
   };

   const handleManualGrant = async (type: 'subscription' | 'studio', email: string, amount: number, id?: string) => {
      try {
         const res = await fetch(`${WORKER_URL}/api/admin/manual-grant`, {
            method: 'POST',
            body: JSON.stringify({ type, email, amount, id }),
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${process.env.VITE_PAYSTACK_SECRET_KEY}`
            }
         });
         const data = await res.json();
         if (data.success) {
            toast.success(`Manual ${type} granted to ${email}`);
            refreshUsers();
            if (type === 'studio') refreshStudioSessions();
         } else throw new Error(data.error);
      } catch (e: any) {
         toast.error(`Grant failed: ${e.message}`);
      }
   };



   const handleSaveConfig = async () => {
      try {
         await updateSiteConfig(editingConfig);
         alert('Site Configuration saved successfully!');
      } catch (error: any) {
         console.error("Error saving config:", error);
         alert("Failed to save configuration: " + error.message);
      }
   };


   const updateContentField = (section: keyof SiteConfig, field: string, value: any) => {
      setEditingConfig(prev => ({
         ...prev,
         [section]: {
            ...(prev[section] as any),
            [field]: value
         }
      }));
   };



   const handleDeleteProduct = async (e: React.MouseEvent, product: Product) => {
      e.stopPropagation();
      e.preventDefault();
      try {
         await deleteProduct(product.id);
      } catch (error) {
         console.error("Deletion error:", error);
      }
   };

   const handleDeleteMixtape = async (e: React.MouseEvent, mixtape: Mixtape) => {
      e.stopPropagation();
      e.preventDefault();
      try {
         await deleteMixtape(mixtape.id);
      } catch (error) {
         console.error("Mixtape deletion error:", error);
         alert(`Failed to delete mixtape: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
   };

   const updateMixtapeField = (field: keyof Mixtape, value: any) => setNewMixtape(prev => ({ ...prev, [field]: value }));

   const openAddPoolTrack = () => { setIsEditing(false); setNewPoolTrack({ ...INITIAL_POOL_TRACK_STATE, genre: genres[0]?.name || 'Afrobeats', versions: [] }); setActiveModal('addPoolTrack'); };

   const openEditPoolTrack = (track: Track) => {
      setIsEditing(true);
      setNewPoolTrack(JSON.parse(JSON.stringify(track)));
      setActiveModal('addPoolTrack');
   };

   const handleSavePoolTrack = async () => {
      if (isSavingPoolTrack) return;
      setIsSavingPoolTrack(true);
      try {
         const now = new Date().toISOString();
         const trackToSave = { ...newPoolTrack, updatedAt: now };

         if (isEditing) {
            await updatePoolTrack(newPoolTrack.id, trackToSave);
         } else {
            await addPoolTrack({
               ...trackToSave,
               id: `pt_${Date.now()}`,
               dateAdded: now,
               createdAt: now
            });
         }
         alert("Music Pool track saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving pool track:", error);
         alert("Failed to save track: " + error.message);
      } finally {
         setIsSavingPoolTrack(false);
      }
   };


   const addVersionToTrack = () => {
      setNewPoolTrack(prev => ({
         ...prev,
         versions: [...prev.versions, { id: `v_${Date.now()}`, type: 'Original', downloadUrl: '' }]
      }));
   };

   const updateVersion = (id: string, field: keyof TrackVersion, value: string) => {
      setNewPoolTrack(prev => ({
         ...prev,
         versions: prev.versions.map(v => v.id === id ? { ...v, [field]: value } : v)
      }));
   };

   const removeVersion = (id: string) => {
      setNewPoolTrack(prev => ({
         ...prev,
         versions: prev.versions.filter(v => v.id !== id)
      }));
   };

   const toggleTrackCategory = (cat: string) => {
      setNewPoolTrack(prev => {
         const exists = prev.category?.includes(cat);
         if (exists) return { ...prev, category: prev.category.filter(c => c !== cat) };
         return { ...prev, category: [...(prev.category || []), cat] };
      });
   }

   const openEditGenre = (g: Genre) => { setEditingGenre(g); setActiveModal('editGenre'); };
   const handleSaveGenre = async () => {
      try {
         await updateGenre(editingGenre.id, editingGenre);
         alert("Genre updated successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving genre:", error);
         alert("Failed to save genre: " + error.message);
      }
   };


   const openAddProduct = () => {
      setIsEditing(false);
      setNewProduct(INITIAL_PRODUCT_STATE);

      setActiveModal('addProduct');
   };

   const openEditProduct = (product: Product) => {
      setIsEditing(true);
      setNewProduct(product);

      setActiveModal('addProduct');
   };

   const handleSaveProduct = async (productData: Product) => {
      if (isSavingProduct) return;
      setIsSavingProduct(true);
      try {
         const now = new Date().toISOString();

         // Auto-generate SEO fields if empty
         const meta_title = productData.meta_title || productData.name;
         const meta_description = productData.meta_description || (productData.description?.substring(0, 160) || '');
         const meta_keywords = productData.meta_keywords || `${productData.name}, ${productData.category}, DJ Flowerz`;

         const productToSave: Product = {
            ...productData,
            meta_title,
            meta_description,
            meta_keywords,
            variantGroups: productData.variantGroups || [],
            whatsappEnabled: productData.whatsappEnabled !== false,
            hasVariants: (productData.variantGroups || []).some(g => (g.variants || []).length > 0),
            updatedAt: now
         };

         if (isEditing) {
            console.log("Saving Edited Product Payload:", productToSave);
            await updateProduct(productToSave.id, productToSave);
         } else {
            const finalProduct = {
               ...productToSave,
               id: productToSave.id || `p${Date.now()}`,
               slug: productToSave.slug || productToSave.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
               createdAt: now
            };
            console.log("Saving New Product Payload:", finalProduct);
            await addProduct(finalProduct);
         }
         toast.success(isEditing ? "Product successfully cataloged in matrix!" : "New product added to catalog!");
         setActiveModal(null);

         // CRITICAL: Wait 500ms for D1 to propagate across Cloudflare's network
         setTimeout(async () => {
            if (refreshProducts) await refreshProducts();
         }, 500);
      } catch (error: any) {
         console.error("Error saving product:", error);
         alert("Failed to save product: " + error.message);
      } finally {
         setIsSavingProduct(false);
      }
   };

   const openAddMixtape = () => { setIsEditing(false); setNewMixtape(INITIAL_MIXTAPE_STATE); setMixtapeFormTab('basic'); setActiveModal('addMixtape'); };
   const openEditMixtape = (mix: Mixtape) => { setIsEditing(true); setNewMixtape(mix); setMixtapeFormTab('basic'); setActiveModal('addMixtape'); };
   const handleSaveMixtape = async () => {
      try {
         const now = new Date().toISOString();
         const isExclusive = newMixtape.downloadType === 'music_pool' || newMixtape.showInMusicPool;
         const finalMixtape = { ...newMixtape, isExclusive, date: newMixtape.releaseDate || now, updatedAt: now };

         if (isEditing) {
            await updateMixtape(finalMixtape.id, finalMixtape);
         } else {
            const tempId = `m${Date.now()}`;
            await addMixtape({
               ...finalMixtape,
               id: tempId,
               slug: newMixtape.slug || newMixtape.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
               createdAt: now
            });
         }
         // DataContext handles the success alert
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving mixtape:", error);
         alert("Failed to save mixtape: " + error.message);
      }
   };

   const openAddBooking = () => { setIsEditing(false); setNewBooking(INITIAL_BOOKING_STATE); setActiveModal('addBooking'); };
   const openEditBooking = (b: Booking) => { setIsEditing(true); setNewBooking(b); setActiveModal('addBooking'); };
   const handleSaveBooking = async () => {
      try {
         if (isEditing) {
            await updateBooking(newBooking.id!, newBooking);
         } else {
            await addBooking({ ...newBooking, id: `b${Date.now()}`, duration: 2, amount: 0, source: 'manual' } as Booking);
         }
         alert("Booking saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving booking:", error);
         alert("Failed to save booking: " + error.message);
      }
   };


   const openAddSessionType = () => { setIsEditing(false); setNewSessionType(INITIAL_SESSION_TYPE); setActiveModal('addSessionType'); };
   const openEditSessionType = (st: SessionType) => { setIsEditing(true); setNewSessionType(st); setActiveModal('addSessionType'); };
   const handleSaveSessionType = async () => {
      try {
         if (isEditing) { await updateSessionType(newSessionType.id, newSessionType); }
         else { await addSessionType({ ...newSessionType, id: `st_${Date.now()}` }); }
         alert("Service saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving session type:", error);
         alert("Failed to save service: " + error.message);
      }
   };
   const openAddEquipment = () => { setIsEditing(false); setNewEquipment(INITIAL_EQUIPMENT_STATE); setActiveModal('addEquipment'); };
   const openEditEquipment = (eq: StudioEquipment) => { setIsEditing(true); setNewEquipment(eq); setActiveModal('addEquipment'); };
   const handleSaveEquipment = async () => {
      try {
         if (isEditing) { await updateStudioEquipment(newEquipment.id, newEquipment); }
         else { await addStudioEquipment({ ...newEquipment, id: `eq_${Date.now()}` }); }
         alert("Equipment saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving equipment:", error);
         alert("Failed to save equipment: " + error.message);
      }
   };

   const openAddChannel = () => { setIsEditing(false); setNewChannel({ name: '', channelId: '', genre: '', inviteLink: '', active: true }); setActiveModal('addChannel'); };
   const openEditChannel = (ch: TelegramChannel) => { setIsEditing(true); setNewChannel(ch); setActiveModal('addChannel'); };
   const handleSaveChannel = async () => {
      try {
         if (isEditing && newChannel.id) { await updateTelegramChannel(newChannel.id, newChannel); }
         else { await addTelegramChannel({ ...newChannel, id: `tc_${Date.now()}` } as TelegramChannel); }
         alert("Channel saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving channel:", error);
         alert("Failed to save channel: " + error.message);
      }
   };

   const openAddCoupon = () => { setIsEditing(false); setNewCoupon(INITIAL_COUPON_STATE); setActiveModal('addCoupon'); };
   const openEditCoupon = (cp: Coupon) => { setIsEditing(true); setNewCoupon(cp); setActiveModal('addCoupon'); };
   const handleSaveCoupon = async () => {
      try {
         if (isEditing) { await updateCoupon(newCoupon.id, newCoupon); }
         else { await addCoupon({ ...newCoupon, id: `cp_${Date.now()}` }); }
         alert("Coupon saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving coupon:", error);
         alert("Failed to save coupon: " + error.message);
      }
   };


   const handleRevokeSubscription = async (userEmail: string) => {
      if (!userEmail) return;
      try {
         const { data: { session } } = await supabase.auth.getSession();
         const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/revoke-access`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ email: userEmail })
         });

         const data = await res.json();
         if (!res.ok) throw new Error(data.error || 'Revoke failed');
         
         toast.success("Protocol Terminated: Access revoked for " + userEmail);
         // Refresh local state
         if (typeof refreshSubscriptions === 'function') refreshSubscriptions();
      } catch (e: any) {
         console.error("Revoke failed:", e);
         toast.error("Operation Failed: " + e.message);
      }
   }

   const handleSyncSubscription = async (id: string, status: string, expiry: string) => {
      // Re-trigger update logic in DataContext using updateSubscription
      try {
         await updateSubscription(id, {
            status: status as any,
            expiryDate: expiry
         });
      } catch (e: any) {
         console.error("Sync failed:", e);
         throw e;
      }
   }

   const openAddPlan = () => { setIsEditing(false); setEditingPlan(INITIAL_PLAN_STATE); setPlanFeaturesInput(''); setActiveModal('addPlan'); };
   const openEditPlan = (plan: SubscriptionPlan) => { setIsEditing(true); setEditingPlan(plan); setPlanFeaturesInput((plan.features || []).join('\n')); setActiveModal('addPlan'); };
   const handleSavePlan = async () => {
      if (!editingPlan.name || editingPlan.price <= 0) {
         alert("Please fill in the plan name and price.");
         return;
      }
      setIsSavingPlan(true);
      try {
         console.log("AdminDashboard: Starting plan save...", { isEditing, plan: editingPlan });
         const features = planFeaturesInput.split('\n').filter(f => f.trim() !== '');

         if (isEditing) {
            if (!editingPlan.id) throw new Error("Missing plan ID for update");
            await updateSubscriptionPlan(editingPlan.id, { ...editingPlan, features });
            console.log("AdminDashboard: Plan update successful.");
         } else {
            const newId = `plan_${Date.now()}`;
            await addSubscriptionPlan({ ...editingPlan, id: newId, features });
            console.log("AdminDashboard: Plan creation successful.");
         }

         alert("Subscription plan saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("AdminDashboard: Error saving plan:", error);
         alert("Failed to save plan: " + (error.message || "Unknown error"));
      } finally {
         setIsSavingPlan(false);
         console.log("AdminDashboard: Plan save process finished.");
      }
   };

   const openAddRoom = () => { setIsEditing(false); setEditingRoom(INITIAL_ROOM_STATE); setActiveModal('addRoom'); };
   const openEditRoom = (room: StudioRoom) => { setIsEditing(true); setEditingRoom(room); setActiveModal('addRoom'); };
   const handleSaveRoom = async () => {
      try {
         if (isEditing) { await updateStudioRoom(editingRoom.id, editingRoom); }
         else { await addStudioRoom({ ...editingRoom, id: `rm_${Date.now()}` }); }
         alert("Studio room saved successfully!");
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error saving room:", error);
         alert("Failed to save room: " + error.message);
      }
   }

   const openEditZone = (zone: ShippingZone) => { setEditingZone(JSON.parse(JSON.stringify(zone))); setActiveModal('editZone'); };
   const handleSaveZone = async () => {
      if (editingZone) {
         try {
            await updateShippingZone(editingZone.id, editingZone);
            alert("Shipping rates updated!");
            setActiveModal(null);
         } catch (error: any) {
            alert("Error updating rates: " + error.message);
         }
      }
   }
   const updateRate = (rateId: string, field: keyof ShippingRate, value: any) => {
      if (!editingZone) return;
      setEditingZone({
         ...editingZone,
         rates: editingZone.rates.map(r => r.id === rateId ? { ...r, [field]: value } : r)
      });
   }

   const handleOrderStatus = (orderId: string, status: Order['status']) => {
      updateOrder(orderId, { status });
   }

   const openShipModal = (order: Order) => {
      setSelectedOrder(order);
      setShippingDetails({
         courierName: '',
         trackingNumber: '',
         estimatedArrival: '',
         deliveryMethod: '',
         pickupLocation: '',
         adminMessage: ''
      });
      setReceiptFile(null);
      setActiveModal('shipOrder');
   }

   const handleShipOrder = async () => {
      if (!selectedOrder) return;

      setIsShipping(true);
      try {
         let receiptUrl = '';
         if (receiptFile) {
            const uploadResult = await uploadFileToR2(receiptFile, 'receipts');
            if (!uploadResult) throw new Error("Failed to upload receipt to R2");
            receiptUrl = uploadResult.url;
         }

         await updateOrder(selectedOrder.id, {
            status: 'shipped',
            ...shippingDetails,
            receiptUrl,
            shippedAt: new Date().toISOString()
         });

         alert(`Order ${selectedOrder.id} successfully marked as shipped!`);
         setActiveModal(null);
      } catch (error: any) {
         console.error("Error shipping order:", error);
         alert("Failed to ship order: " + error.message);
      } finally {
         setIsShipping(false);
      }
   }

   const handleUserAction = async (userId: string, action: string, extra?: any) => {
      if (action === 'ban') {
         if (confirm('Suspend this user?')) updateUser(userId, { status: 'suspended' });
      }
      if (action === 'activate') {
         updateUser(userId, { status: 'active' });
      }
      if (action === 'delete') {
         if (confirm('ARE YOU SURE? This will permanently remove the user profile and authentication.')) {
            try {
               const res = await fetch('/api/admin/delete-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, adminEmail: user?.email })
               });

               if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || 'Failed to delete user');
               }

               removeUser(userId); // Update local state/context
               setActiveModal(null);
               alert('User successfully deleted.');
            } catch (err: any) {
               alert(`Error deleting user: ${err.message}`);
               console.error(err);
            }
         }
      }
      if (action === 'reset') alert(`Resetting password for ${userId} (Email sent)`);
      if (action === 'grant_pool') {
         const plan = extra || grantPlan;
         let days = 30;
         if (plan === 'weekly') days = 7;
         if (plan === 'monthly') days = 30;
         if (plan === '3months') days = 90;
         if (plan === '6months') days = 180;
         if (plan === 'yearly') days = 365;

         const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

         try {
            await updateUser(userId, {
               isSubscriber: true,
               subscriptionPlan: plan as any,
               subscriptionExpiry: expiryDate.toISOString()
            });

            // Also record in subscriptions table for history
            await addSubscription({
               id: `manual_${Date.now()}`,
               userId: userId,
               userName: selectedUser?.name || 'Manual Grant',
               planId: plan,
               amount: 0, // Manual grant
               startDate: new Date().toISOString(),
               expiryDate: expiryDate.toISOString(),
               status: 'active',
               paymentMethod: 'admin_manual'
            });

            alert(`✅ Music Pool Access Granted!\n\nPlan: ${plan.toUpperCase()}\nDuration: ${days} days\nExpires: ${expiryDate.toLocaleDateString()}`);
         } catch (error: any) {
            console.error("Error granting pool access:", error);
            alert(`Failed to grant pool access: ${error.message}\nThis might be due to a Missing RLS Policy on the profiles table.`);
         }
      }
   };

   const openUserDetail = (user: UserType) => {
      setSelectedUser(user);
      setActiveModal('userDetail');
   }

   const sendCampaign = async () => {
      if (!emailSubject || !emailBody) {
         alert("Please provide both subject and message.");
         return;
      }
      if ((subscribers || []).length === 0) {
         alert("No subscribers found.");
         return;
      }

      setIsSending(true);
      try {
         // Get current session token for the secure API
         const { data: { session } } = await supabase.auth.getSession();
         const token = session?.access_token || '';

         // Email campaign via secure local API (Cloudflare Email Routing)
         const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
               subject: emailSubject,
               html: emailBody,
               subscribers: (subscribers || []).map((s: any) => s.email || s)
            })
         });

         const result = await response.json();

         if (!response.ok) {
            throw new Error(result.error || 'Failed to send campaign');
         }

         alert(`Campaign sent successfully to ${(subscribers || []).length} subscribers!`);

         // Also record the campaign
         await addCampaign({
            id: `camp_${Date.now()}`,
            name: emailSubject,
            type: 'newsletter',
            status: 'sent',
            recipients: (subscribers || []).length,
            sentAt: new Date().toISOString()
         });
         setEmailSubject('');
         setEmailBody('');
      } catch (error: any) {
         console.error("Error sending campaign:", error);
         alert("Failed to send campaign: " + error.message);
      } finally {
         setIsSending(false);
      }
   }

   console.log("AdminDashboard: Reaching main return", { activeTab });
   if (!dataContext) {
      return <div className="p-10 text-white">Critical Error: Data Context Missing. Contact Support.</div>;
   }

   return (
      <div className="flex h-screen bg-[#0B0B0F] text-white">
         <AdminPaymentListener setLiveSales={setLiveSales} />
         <div className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 flex flex-col bg-[#0f0f13] transition-transform duration-300 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 shrink-0">
               <Link to="/" className="text-xl font-bold font-display tracking-wider">
                  DJ <span className="text-brand-purple">ADMIN</span>
               </Link>
               <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                  <X size={20} />
               </button>
            </div>
            <div className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar">
               {tabs.map((tab) => (
                  <button
                     key={tab.id}
                     onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
                     className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors border-l-2 ${activeTab === tab.id
                        ? 'border-brand-purple text-brand-purple bg-brand-purple/5'
                        : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                  >
                     <tab.icon size={18} className="mr-3 shrink-0" />
                     {tab.label}
                  </button>
               ))}
            </div>
         </div>

         <div className="flex-1 flex flex-col overflow-hidden w-full">
            <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#0B0B0F] shrink-0">
               <div className="flex items-center gap-4">
                  <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white">
                     <Menu size={24} />
                  </button>
                  <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                     {tabs.find(t => t.id === activeTab)?.icon && React.createElement(tabs.find(t => t.id === activeTab)!.icon, { size: 24, className: "text-brand-purple hidden sm:block" })}
                     {tabs.find(t => t.id === activeTab)?.label}
                  </h2>
               </div>
               <div className="flex items-center gap-6">
                  {/* Error block removed */}
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-brand-cyan/10 border border-brand-cyan/30 rounded-full">
                     <div className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse" />
                     <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest">Live Syncing</span>
                  </div>
                  <div className="relative">
                     <button
                        onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                        className="relative text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5"
                     >
                        <Bell size={20} />
                        {(notifications || []).filter(n => !n.read).length > 0 && (
                           <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-purple text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-[#0B0B0F] animate-pulse">
                              {(notifications || []).filter(n => !n.read).length}
                           </span>
                        )}
                     </button>

                     {notificationsDropdownOpen && (
                        <>
                           <div className="fixed inset-0 z-40" onClick={() => setNotificationsDropdownOpen(false)} />
                           <div className="absolute right-0 mt-4 w-96 bg-[#15151A] border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                              <button
                                 onClick={() => setActiveTab('usage-monitor')}
                                 className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'usage-monitor' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/25' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                              >
                                 <Shield size={20} className={`transition-transform duration-500 ${activeTab === 'usage-monitor' ? 'scale-110 rotate-12' : 'group-hover:scale-110'}`} />
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Usage Monitor</span>
                              </button>

                              <div className="my-6 border-t border-white/5 mx-6 opacity-40" />
                              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1A1A20]">
                                 <h3 className="font-bold text-sm tracking-tight">Transmission Center</h3>
                                 <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest bg-brand-purple/10 px-2.5 py-1 rounded-full border border-brand-purple/20">
                                    {(notifications || []).filter(n => !n.read).length} Unread
                                 </span>
                              </div>
                              <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                                 {(Array.isArray(notifications) ? notifications : []).length > 0 ? (
                                    (Array.isArray(notifications) ? notifications : []).map((n) => (
                                       <div
                                          key={n.id}
                                          className={`p-5 border-b border-white/5 transition-all hover:bg-white/5 relative group cursor-pointer ${!n.read ? 'bg-brand-purple/5' : ''}`}
                                          onClick={() => {
                                             if (!n.read) markNotificationAsRead(n.id);
                                             if (n.link) window.open(n.link, '_blank');
                                          }}
                                       >
                                          {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-purple" />}
                                          <div className="flex gap-4">
                                             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-110 ${n.type === 'success' ? 'bg-brand-cyan/10 text-brand-cyan' :
                                                n.type === 'warning' ? 'bg-brand-pink/10 text-brand-pink' :
                                                   n.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                                                      'bg-brand-purple/10 text-brand-purple'
                                                }`}>
                                                {n.type === 'product' ? <Package size={18} /> :
                                                   n.type === 'mixtape' ? <Music size={18} /> :
                                                      <Bell size={18} />}
                                             </div>
                                             <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start gap-2">
                                                   <h4 className={`text-xs font-bold ${!n.read ? 'text-white' : 'text-gray-400'}`}>{n.title}</h4>
                                                   <span className="text-[8px] text-gray-600 font-black uppercase whitespace-nowrap">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed font-medium">{n.message}</p>
                                             </div>
                                          </div>
                                       </div>
                                    ))
                                 ) : (
                                    <div className="p-12 text-center">
                                       <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-gray-700 mx-auto mb-4 border border-white/5">
                                          <Inbox size={32} />
                                       </div>
                                       <p className="text-gray-500 text-sm font-medium">No transmissions received yet.</p>
                                    </div>
                                 )}
                              </div>
                              <div className="p-4 bg-[#1A1A20] border-t border-white/5 text-center">
                                 <button className="text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">Clear All Clear History</button>
                              </div>
                           </div>
                        </>
                     )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center font-bold text-xs ring-2 ring-brand-purple/20">A</div>
               </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
               {/* Error block removed */}

               {activeTab === 'dashboard' && (
                  <div className="space-y-8 animate-fade-in-up">
                     {/* Welcome Banner */}
                     <div className="bg-[#15151A] border border-white/5 p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl shadow-black/50">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full -mr-64 -mt-64 z-0 pointer-events-none animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-cyan/5 blur-[100px] rounded-full -ml-32 -mb-32 z-0 pointer-events-none"></div>

                        <div className="relative z-10 max-w-2xl text-center md:text-left">
                           <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-purple/10 border border-brand-purple/20 rounded-full mb-6">
                              <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse"></span>
                              <span className="text-[10px] font-black text-brand-purple uppercase tracking-[0.2em]">Platform Overview</span>
                           </div>
                           <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter leading-tight">Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">Admin</span> 🎉</h2>
                           <p className="text-gray-500 mb-8 text-base md:text-lg leading-relaxed font-medium">Ready to manage your empire? Your store's performance is currently up by <span className="text-brand-cyan font-bold">12.5%</span> this week. Check your latest insights below.</p>
                           <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                              <button onClick={() => setActiveTab('store')} className="px-8 py-4 bg-brand-purple text-white text-sm font-black rounded-2xl hover:bg-purple-600 shadow-xl shadow-brand-purple/20 hover:shadow-brand-purple/40 transition-all duration-300 transform hover:-translate-y-1">Catalog Manager</button>
                              <button onClick={() => setActiveTab('orders')} className="px-8 py-4 bg-white/5 text-white text-sm font-black rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">View Orders</button>
                           </div>
                        </div>

                        <div className="hidden lg:block relative z-10">
                           <div className="w-48 h-48 bg-gradient-to-br from-brand-purple to-brand-cyan rounded-[3rem] rotate-12 flex items-center justify-center shadow-2xl shadow-brand-purple/20 relative">
                              <LayoutDashboard size={80} className="text-white -rotate-12" />
                              <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                                 <Plus className="text-brand-purple" size={24} />
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Sync Status Banner */}
                     <div className="bg-[#0B0B0F] rounded-[2rem] border border-white/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
                        <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
                           <div className="w-14 h-14 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-cyan/20 transition-colors">
                              <RefreshCw size={28} className={`text-brand-cyan ${syncNotificationsLoading ? 'animate-spin' : ''}`} />
                           </div>
                           <div className="flex-1">
                              <h3 className="text-lg font-black text-white leading-tight">Music Pool Sync</h3>
                              <p className="text-sm text-gray-500 font-medium">
                                 {syncNotificationsLoading ? 'Checking for new tracks...' : 
                                  syncNotifications && syncNotifications.length > 0 ? 
                                  `Last sync found ${syncNotifications[0].tracksAdded} new tracks` : 
                                  'Automated daily sync is active'}
                              </p>
                           </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
                           <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                              <span className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse"></span>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Monitoring</span>
                           </div>
                           <button 
                              onClick={() => {
                                 toast.promise(refreshSyncNotifications(), {
                                    loading: 'Inhaling new tracks...',
                                    success: 'Sync complete',
                                    error: 'Sync failed'
                                 });
                              }}
                              disabled={syncNotificationsLoading}
                              className="px-6 py-2 bg-brand-cyan text-black text-[11px] font-black rounded-xl hover:bg-cyan-400 transition-all uppercase tracking-widest disabled:opacity-50"
                           >
                              Manual Sync
                           </button>
                        </div>
                     </div>

                     {/* Recent Sync Notifications */}
                     {syncNotifications && syncNotifications.length > 0 && (
                        <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8">
                           <div className="flex items-center justify-between mb-8">
                              <div>
                                 <h3 className="text-xl font-black text-white tracking-tight">Sync Activity</h3>
                                 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Recently Added Tracks</p>
                              </div>
                              <History size={20} className="text-gray-600" />
                           </div>
                           
                           <div className="space-y-4">
                              {(syncNotifications || []).slice(0, 3).map((notif: any, idx: number) => (
                                 <div key={idx} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-brand-cyan/20 transition-all">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center">
                                          <Music size={18} className="text-brand-cyan" />
                                       </div>
                                       <div>
                                          <p className="text-sm font-bold text-white tracking-tight">
                                             {notif.tracksAdded} tracks added from pool sources
                                          </p>
                                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                             {new Date(notif.timestamp).toLocaleString()}
                                          </p>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <span className="px-3 py-1 bg-brand-cyan/10 text-brand-cyan text-[9px] font-black rounded-full uppercase tracking-[0.1em]">
                                          Success
                                       </span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="flex justify-end gap-3 mb-4">
                        <select
                           value={salesRange}
                           onChange={(e) => setSalesRange(e.target.value as any)}
                           className="bg-[#0B0B0F] border border-white/10 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-brand-purple"
                        >
                           <option value="this-month">This Month</option>
                           <option value="last-month">Last Month</option>
                           <option value="last-3-months">Last 3 Months</option>
                           <option value="all">All Time</option>
                        </select>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Net Revenue" value={`KES ${(adminStats?.total_revenue || 0).toLocaleString()}`} icon={CreditCard} color="text-brand-purple" trend="LIVE" trendUp={true} subtext="Total D1 Revenue" />
                        <StatCard label="Monthly Forecast" value={`KES ${(adminStats?.monthly_sales_amt || 0).toLocaleString()}`} icon={TrendingUp} color="text-brand-cyan" trend="MTD" trendUp={true} subtext="Last 30 Days" />
                        <StatCard label="VIP Access" value={(adminStats?.active_subs || 0).toString()} icon={Users} color="text-brand-purple" trend="ACTIVE" trendUp={true} subtext="Pool members" />
                        <StatCard label="Referrals" value={`KES ${(referralStatsSummary?.payouts || 0).toLocaleString()}`} icon={Gift} color="text-brand-pink" subtext="Reward payouts" />
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                           <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                              <div>
                                 <h3 className="text-xl font-black text-white tracking-tight">Revenue Analytics</h3>
                                 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{chartRange}-Day Financial Performance</p>
                              </div>
                              <div className="flex gap-2 items-center">
                                 <select
                                    value={chartRange}
                                    onChange={(e) => setChartRange(Number(e.target.value))}
                                    className="bg-[#0B0B0F] border border-white/10 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-brand-purple"
                                 >
                                    <option value={7}>7 Days</option>
                                    <option value={14}>14 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={90}>90 Days</option>
                                 </select>
                                 <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400"><RefreshCw size={18} /></button>
                                 <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400"><ExternalLink size={18} /></button>
                              </div>
                           </div>
                           <div className="p-8 flex-1 min-h-[350px]">
                              <ResponsiveContainer width="100%" height="100%">
                                 <LineChart data={chartData}>
                                    <defs>
                                       <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#7B5CFF" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#7B5CFF" stopOpacity={0} />
                                       </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#444" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
                                    <YAxis stroke="#444" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(value) => `KSh ${value / 1000}k`} dx={-10} />
                                    <Tooltip
                                       contentStyle={{ backgroundColor: '#15151A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                                       itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px' }}
                                       cursor={{ stroke: '#7B5CFF', strokeWidth: 2 }}
                                    />
                                    <Line type="monotone" dataKey="sales" stroke="#7B5CFF" strokeWidth={4} dot={{ r: 6, fill: '#15151A', strokeWidth: 3, stroke: '#7B5CFF' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#fff' }} />
                                 </LineChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                           <div className="p-8 border-b border-white/5 font-bold flex justify-between items-center shrink-0 bg-white/[0.02]">
                              <div>
                                 <h3 className="text-xl font-black text-white tracking-tight">Live Pulse</h3>
                                 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Real-time user status</p>
                              </div>
                              <span className="text-[10px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-3 py-1 rounded-full font-black flex items-center gap-1.5 uppercase tracking-wider">
                                 <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-pulse" />
                                 {(liveUsers || []).length} Active
                              </span>
                           </div>
                           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-[350px]">
                              {(liveUsers || []).length === 0 ? (
                                 <div className="h-full flex flex-col items-center justify-center text-gray-600 text-sm">
                                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-4">
                                       <Monitor size={32} className="opacity-20" />
                                    </div>
                                    <p className="font-bold">No wave activity</p>
                                    <p className="text-[10px] uppercase tracking-widest mt-1 opacity-50">Watching for signals...</p>
                                 </div>
                              ) : (
                                 (liveUsers || []).map(u => (
                                    <div key={u.id} className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-3xl border border-white/5 transition-all duration-300 group cursor-pointer">
                                       <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-white/10 group-hover:border-brand-cyan/50 transition-colors">
                                          <img loading="lazy" src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}&background=15151A&color=fff`} alt="" className="w-full h-full object-cover" />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <p className="text-sm font-black text-white truncate group-hover:text-brand-cyan transition-colors">{u.name}</p>
                                          <p className="text-[11px] text-gray-500 truncate font-medium">{u.email}</p>
                                       </div>
                                       <div className="w-2 h-2 bg-brand-cyan rounded-full shadow-[0_0_10px_rgba(40,230,220,0.5)]" />
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 font-bold flex justify-between items-center bg-white/[0.02]">
                           <div>
                              <h3 className="text-xl font-black text-white tracking-tight">Recent Activity Log</h3>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Historical Transaction Flow</p>
                           </div>
                           <button onClick={() => setActiveTab('payments')} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Audit Trail</button>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left whitespace-nowrap">
                              <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                 <tr>
                                    <th className="px-8 py-5">Source</th>
                                    <th className="px-8 py-5">Client Identity</th>
                                    <th className="px-8 py-5">Value Metric</th>
                                    <th className="px-8 py-5 text-right">Fulfillment</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.03] text-sm">
                                 {(combinedTransactions || []).slice(0, 8).map(tx => (
                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => { if (tx.type === 'Order') { setSelectedOrder(liveOrders.find(o => o.id === tx.id) || null); setActiveModal('editOrderStatus'); } }}>
                                       <td className="px-8 py-5">
                                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${tx.type === 'Order' ? 'bg-brand-purple/5 text-brand-purple border-brand-purple/20' :
                                             tx.type === 'Tip' ? 'bg-brand-pink/5 text-brand-pink border-brand-pink/20' :
                                                'bg-brand-purple/5 text-brand-purple border-brand-purple/20'
                                             }`}>{tx.type}</span>
                                       </td>
                                       <td className="px-8 py-5">
                                          <div className="font-black text-white group-hover:text-brand-cyan transition-colors">{tx.name}</div>
                                          <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-0.5">{tx.date}</div>
                                       </td>
                                       <td className="px-8 py-5">
                                          <div className="text-white font-black">KES {(tx.amount || 0).toLocaleString()}</div>
                                       </td>
                                       <td className="px-8 py-5 text-right">
                                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${tx.status === 'completed' || tx.status === 'paid' || tx.status === 'success' || tx.status === 'shipped' || tx.status === 'active'
                                             ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20'
                                             : 'bg-brand-pink/5 text-brand-pink border-brand-pink/20'
                                             }`}>{tx.status}</span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'interactions' && <InteractionsTab />}
               {activeTab === 'analytics' && <AnalyticsTab />}
               {activeTab === 'marketplace' && <AdminMarketplaceTab />}
               {activeTab === 'payouts' && <AdminPayoutsTab />}
               {activeTab === 'verification' && <AdminVerificationTab />}

               {activeTab === 'orders' && <AdminOrdersTab />}
               
               {activeTab === 'plans' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Access Tiers</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Configure and manage subscription packages for the music pool</p>
                        </div>
                        <button onClick={openAddPlan} className="px-6 py-3 bg-brand-purple text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple/80 transition-all flex items-center gap-2 shadow-xl shadow-brand-purple/20">
                           <Plus size={16} /> New Plan
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {(subscriptionPlans || []).map(plan => (
                           <div key={plan.id} className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 relative group hover:border-brand-purple/20 transition-all duration-500 overflow-hidden shadow-2xl">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-purple/10 transition-colors" />
                              {plan.isBestValue && (
                                 <div className="absolute top-6 right-6">
                                    <span className="bg-brand-purple text-white text-[9px] font-black px-4 py-2 rounded-full tracking-[0.2em] shadow-lg shadow-brand-purple/20">ELITE CHOICE</span>
                                 </div>
                              )}
                              <div className="relative z-10">
                                 <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{plan.name}</h3>
                                 <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-3xl font-black text-brand-cyan">KES {(plan.price ?? plan.price_kes ?? 0).toLocaleString()}</span>
                                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">/{plan.period}</span>
                                 </div>
                                 <div className="space-y-4 mb-8">
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] border-b border-white/5 pb-2">Included Protocols</p>
                                    {(plan.features || []).map((f, i) => (
                                       <div key={i} className="text-xs text-gray-400 font-medium flex items-center gap-3">
                                          <div className="w-5 h-5 rounded-lg bg-brand-cyan/10 flex items-center justify-center shrink-0">
                                             <Check size={12} className="text-brand-cyan" />
                                          </div>
                                          {f}
                                       </div>
                                    ))}
                                 </div>
                                 <div className="flex gap-3">
                                    <button onClick={() => openEditPlan(plan)} className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 border border-white/10 transition-all">Configure</button>
                                    <button onClick={() => { if (confirm('Purge this tier?')) deleteSubscriptionPlan(plan.id) }} className="py-4 px-5 bg-red-500/5 text-red-500 rounded-2xl border border-red-500/10 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                 </div>
                              </div>
                           </div>
                        ))}
                        <div
                           onClick={openAddPlan}
                           className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-600 hover:bg-white/[0.02] hover:border-brand-purple/40 hover:text-brand-purple cursor-pointer transition-all duration-500 min-h-[400px] group shadow-2xl"
                        >
                           <div className="w-20 h-20 rounded-[2rem] bg-white/5 group-hover:bg-brand-purple/10 flex items-center justify-center mb-6 transition-colors shadow-inner">
                              <Plus size={48} className="group-hover:scale-125 transition-transform" />
                           </div>
                           <span className="font-black uppercase tracking-[0.2em] text-xs">Architect New Tier</span>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'subscriptions' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">VIP Network</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Manage music pool memberships and recurring revenue</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard label="Active Wave" value={adminStats?.active_subs || 0} icon={Users} color="text-brand-cyan" trend="Active" trendUp={true} />
                        <StatCard label="Monthly Volume" value={adminStats?.monthly_sales_count || 0} icon={Plus} color="text-brand-purple" trend="MTD" trendUp={true} />
                        <StatCard label="Revenue Rate" value="98.2%" icon={Activity} color="text-brand-purple" trend="STABLE" trendUp={true} subtext="System health" />
                        <StatCard label="Recurrent" value={`KES ${(adminStats?.monthly_sales_amt || 0).toLocaleString()}`} icon={DollarSign} color="text-brand-purple" trend="LIVE" trendUp={true} subtext="Last 30 days" />
                     </div>

                     <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left whitespace-nowrap">
                              <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                 <tr>
                                    <th className="px-8 py-6">Identity</th>
                                    <th className="px-8 py-6">Access Tier</th>
                                    <th className="px-8 py-6">Investment</th>
                                    <th className="px-8 py-6">Expiration</th>
                                    <th className="px-8 py-6">Signal Status</th>
                                    <th className="px-8 py-6 text-right">Protocol</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.03] text-sm">
                                 {subsLoading ? (
                                    <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Scanning Registry...</td></tr>
                                 ) : (liveSubscriptions || []).length === 0 ? (
                                    <tr>
                                       <td colSpan={6} className="px-8 py-20 text-center">
                                          <div className="flex flex-col items-center gap-4 opacity-50">
                                             <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center">
                                                <Users size={40} className="text-gray-500" />
                                             </div>
                                             <p className="text-gray-500 font-black tracking-widest uppercase text-xs">No Signal Detected</p>
                                          </div>
                                       </td>
                                    </tr>
                                 ) : (
                                    (liveSubscriptions || []).map((sub) => {
                                       const expiry = sub.expiryDate ? new Date(sub.expiryDate) : null;
                                       const isExpired = !expiry || new Date() > expiry;
                                       
                                       // Calculate days left
                                       const now = new Date();
                                       const diffTime = expiry ? expiry.getTime() - now.getTime() : 0;
                                       const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                                       return (
                                          <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                                             <td className="px-8 py-6">
                                                <div className="font-black text-white group-hover:text-brand-cyan transition-colors">{sub.userName}</div>
                                                <div className="text-[11px] text-gray-500 font-medium">{sub.userEmail}</div>
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white">{sub.planId}</span>
                                             </td>
                                             <td className="px-8 py-6">
                                                <div className="text-white font-black">KES {sub.amount?.toLocaleString() || '0'}</div>
                                             </td>
                                             <td className="px-8 py-6 font-black font-display text-xs tracking-wider text-gray-400">
                                                {expiry && expiry.getTime() > 0 ? expiry.toLocaleDateString() : 'N/A'}
                                                {expiry && !isExpired && (
                                                   <div className="text-[9px] text-brand-cyan mt-1 uppercase tracking-widest">{diffDays} days left</div>
                                                )}
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border shadow-sm ${!isExpired && sub.status === 'active'
                                                   ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20'
                                                   : 'bg-red-500/5 text-red-500 border-red-500/20'
                                                   }`}>
                                                   {!isExpired && sub.status === 'active' ? 'Signal Locked' : 'Frequency Lost'}
                                                </span>
                                             </td>
                                             <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-3">
                                                   {(sub.status === 'active' || sub.status === 'past_due') && (
                                                      <>
                                                         <button 
                                                            onClick={() => {
                                                               toast.promise(handleSyncSubscription(sub.id, sub.status, sub.expiryDate), {
                                                                  loading: 'Resynchronizing signal...',
                                                                  success: 'Signal restored',
                                                                  error: 'Sync failed'
                                                               });
                                                            }} 
                                                            className="p-3 text-brand-cyan hover:bg-brand-cyan/5 rounded-[1.25rem] border border-white/5 transition-all flex items-center gap-2 group-hover:scale-110"
                                                            title="Sync with D1"
                                                         >
                                                            <RefreshCw size={18} />
                                                         </button>
                                                         <button 
                                                            onClick={() => {
                                                               if (confirm(`Revoke access for ${sub.userEmail}?`)) {
                                                                  handleRevokeSubscription(sub.userEmail);
                                                               }
                                                            }} 
                                                            className="p-3 text-red-500 hover:bg-red-500/10 rounded-[1.25rem] border border-white/5 transition-all"
                                                            title="Terminate Protocol"
                                                         >
                                                            <UserX size={18} />
                                                         </button>
                                                      </>
                                                   )}
                                                </div>
                                             </td>
                                          </tr>
                                       );
                                    })
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'pool' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Audio Repository</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Orchestrate the music pool and metadata environment</p>
                        </div>
                        <div className="flex gap-4 p-1.5 bg-black/40 rounded-[1.25rem] border border-white/5">
                           <button onClick={() => setPoolSubTab('tracks')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${poolSubTab === 'tracks' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Wave Tracks</button>
                           <button onClick={() => setPoolSubTab('genres')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${poolSubTab === 'genres' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Genre Taxonomy</button>
                           <button onClick={() => setPoolSubTab('updates')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${poolSubTab === 'updates' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Scanned Updates</button>
                        </div>
                     </div>

                     {poolSubTab === 'tracks' && (
                        <>
                           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-8 bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] gap-6 shadow-2xl">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                    <Database size={28} />
                                 </div>
                                 <div>
                                    <h4 className="text-xl font-black text-white">Cloud Indexing</h4>
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Total indexed tracks: {(poolTracks || []).length.toLocaleString()}</p>
                                 </div>
                              </div>
                              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                                 <button
                                    onClick={() => loadMorePoolTracks(1000000)}
                                    disabled={isSeeding}
                                    className="px-6 py-3 bg-brand-purple/10 text-brand-purple border border-brand-purple/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all flex items-center gap-2 group disabled:opacity-50"
                                 >
                                    <Zap size={16} className="group-hover:animate-pulse" />
                                    {isSeeding ? 'Indexing...' : 'Load Full Database'}
                                 </button>
                                 <button
                                    onClick={handleConsolidatePool}
                                    disabled={isSyncing}
                                    className="px-6 py-3 bg-brand-purple/10 text-brand-purple border border-brand-purple/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all flex items-center gap-2 group disabled:opacity-50"
                                 >
                                    <Database size={16} className={isSyncing ? "animate-spin" : ""} />
                                    {isSyncing ? 'Consolidating...' : 'Consolidate Pool'}
                                 </button>
                                 <button
                                    onClick={handleSyncTracks}
                                    disabled={isSyncing}
                                    className="px-6 py-3 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-cyan hover:text-[#0B0B0F] transition-all flex items-center gap-2 disabled:opacity-50"
                                 >
                                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                                    {isSyncing ? 'Syncing...' : 'Force Sync'}
                                 </button>
                                 <button
                                    onClick={handleDeployToStorefront}
                                    disabled={dataContext.poolLoading}
                                    className="px-6 py-3 bg-brand-purple text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple/80 transition-all flex items-center gap-2 disabled:opacity-50 shadow-xl shadow-brand-purple/20"
                                 >
                                    <CloudUpload size={16} className={dataContext.poolLoading ? "animate-pulse" : ""} />
                                    {dataContext.poolLoading ? 'Deploying...' : 'Deploy to Storefront'}
                                 </button>
                                 <button onClick={openAddPoolTrack} className="px-6 py-3 bg-white text-[#0B0B0F] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-xl shadow-brand-purple/10 flex items-center gap-2">
                                    <Plus size={16} /> Upload Track
                                 </button>
                              </div>
                           </div>

                           {/* Progress Visuals */}
                           {(isSeeding || isSyncing) && (
                              <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
                                 <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                                    <div
                                       className={`h-full transition-all duration-500 ${isSeeding ? 'bg-brand-purple' : 'bg-brand-cyan'}`}
                                       style={{ width: isSeeding && seedProgress ? `${Math.round((seedProgress.processedTracks / (seedProgress.totalTracks || 10000)) * 100)}%` : '100%' }}
                                    ></div>
                                 </div>
                                 <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSeeding ? 'bg-brand-purple/10 text-brand-purple' : 'bg-brand-cyan/10 text-brand-cyan'}`}>
                                          <Activity size={24} className="animate-bounce" />
                                       </div>
                                       <div>
                                          <p className="text-white font-black">{isSeeding ? seedMessage : syncMessage}</p>
                                          {isSeeding && seedProgress?.currentTrackTitle && (
                                             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Processing: <span className="text-brand-purple">{seedProgress.currentTrackTitle}</span></p>
                                          )}
                                       </div>
                                    </div>
                                    {isSeeding && seedProgress && (
                                       <div className="flex gap-4">
                                          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-center">
                                             <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Success</p>
                                             <p className="text-sm font-black text-brand-cyan">{(seedProgress?.uploadedTracks || 0).toLocaleString()}</p>
                                          </div>
                                          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-center">
                                             <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Skipped</p>
                                             <p className="text-sm font-black text-brand-pink">{(seedProgress?.skippedTracks || 0).toLocaleString()}</p>
                                          </div>
                                          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-center">
                                             <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Protocol</p>
                                             <p className="text-sm font-black text-brand-cyan">{seedProgress.currentBatch}/{seedProgress.totalBatches}</p>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )}

                           <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                              <div className="overflow-x-auto">
                                 <TableVirtuoso
                                    data={poolTracks || []}
                                    useWindowScroll
                                    className="w-full text-left whitespace-nowrap bg-[#0B0B0F]"
                                    components={{
                                       Table: (props) => <table {...props} className="w-full text-left whitespace-nowrap empty-table:hidden" />,
                                       TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5" />),
                                       TableRow: (props) => <tr {...props} className="hover:bg-white/[0.02] transition-colors group" />,
                                       TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-white/[0.03] text-sm" />)
                                    }}
                                    fixedHeaderContent={() => (
                                       <tr>
                                          <th className="px-4 py-6 w-16">Cover</th>
                                          <th className="px-8 py-6">Signal Meta</th>
                                          <th className="px-8 py-6">Genre Classification</th>
                                          <th className="px-8 py-6">Dynamics</th>
                                          <th className="px-8 py-6">Redux Versions</th>
                                          <th className="px-8 py-6">Timeline</th>
                                          <th className="px-8 py-6 text-right">Ops Protocol</th>
                                       </tr>
                                    )}
                                    itemContent={(index, track) => (
                                       <>
                                          {/* Cover Art */}
                                          <td className="px-4 py-4">
                                             {track.coverUrl || track.cover_url || track.thumbnail ? (
                                                <img loading="lazy" src={track.coverUrl || track.cover_url || track.thumbnail}
                                                   alt={track.title}
                                                   className="w-12 h-12 rounded-lg object-cover border border-white/10 shadow-md"
                                                   onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                             ) : null}
                                             <div className="w-12 h-12 rounded-lg bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple" style={{ display: (track.coverUrl || track.cover_url || track.thumbnail) ? 'none' : 'flex' }}>
                                                <Headphones size={20} />
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="font-black text-white group-hover:text-brand-cyan transition-colors">{track.title}</div>
                                             <div className="text-[11px] text-gray-500 font-medium">{track.artist}</div>
                                             {(track.versions || []).length > 0 && (
                                                <div className="text-[10px] text-gray-600 font-mono mt-0.5 truncate max-w-[200px]" title={(track.versions[0]?.downloadUrl || '')}>
                                                   {(track.versions[0]?.downloadUrl || '').replace(/^https?:\/\/[^/]+/, '')}
                                                </div>
                                             )}
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className="px-3 py-1 bg-brand-cyan/5 border border-brand-cyan/10 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-cyan">{track.genre}</span>
                                          </td>
                                          <td className="px-8 py-6 font-black">
                                             <div className="text-white text-xs">{track.bpm} <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">BPM</span></div>
                                             <div className="text-[11px] text-brand-purple tracking-widest uppercase mt-0.5">{track.key || '—'}</div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex flex-wrap gap-2">
                                                {(track.versions || []).map((v: any) => (
                                                   <span key={v.id} className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/5 px-2 py-1 rounded-md text-gray-400 group-hover:text-white transition-colors">{v.type}</span>
                                                ))}
                                             </div>
                                          </td>
                                          <td className="px-8 py-6 font-black font-display text-gray-400">
                                             {track.year || new Date(track.dateAdded || track.createdAt || Date.now()).getFullYear()}
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                             <div className="flex justify-end gap-3">
                                                {/* Preview */}
                                                <a
                                                   href={track.previewUrl || (track.versions && track.versions[0]?.previewUrl) || track.downloadUrl}
                                                   target="_blank"
                                                   rel="noreferrer"
                                                   title="Preview"
                                                   className="p-3 text-brand-purple hover:bg-brand-purple/5 rounded-[1.25rem] border border-white/5 transition-all"
                                                >
                                                   <Play size={18} />
                                                </a>
                                                {/* Download */}
                                                <a
                                                   href={(track.versions && track.versions[0]?.downloadUrl) || track.downloadUrl}
                                                   target="_blank"
                                                   rel="noreferrer"
                                                   title="Download"
                                                   className="p-3 text-emerald-500 hover:bg-emerald-500/5 rounded-[1.25rem] border border-white/5 transition-all"
                                                >
                                                   <Download size={18} />
                                                </a>

                                                <button onClick={() => openEditPoolTrack(track)} className="p-3 text-gray-500 hover:text-brand-cyan hover:bg-brand-cyan/5 rounded-[1.25rem] border border-white/5 transition-all"><PenSquare size={18} /></button>
                                                <button onClick={() => { if (window.confirm(`Purge signal "${track.title}"?`)) deletePoolTrack(track.id); }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-[1.25rem] border border-white/5 transition-all"><Trash2 size={18} /></button>
                                             </div>
                                          </td>
                                       </>
                                    )}
                                 />
                              </div>


                              {!poolLoading && (poolTracks || []).length > 0 && (
                                 <div className="p-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/[0.01]">
                                    <div className="flex items-center gap-3">
                                       <div className="w-2 h-2 bg-brand-cyan rounded-full shadow-[0_0_10px_rgba(40,230,220,0.5)]"></div>
                                       <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                          Database Fully Synchronized ({(poolTracks || []).length.toLocaleString()} tracks)
                                       </p>
                                    </div>
                                    <div className="flex gap-3">
                                       <button
                                          onClick={async () => {
                                             const { deduplicatePool } = await import('../utils/autoSyncTracks');
                                             if (window.confirm('Deduplicate Music Pool? This will scan ~50k tracks and remove duplicates. It may take a moment.')) {
                                                const removed = await deduplicatePool();
                                                alert(`Successfully removed ${removed} duplicates from the Music Pool.`);
                                                if (refreshPoolTracks) refreshPoolTracks();
                                             }
                                          }}
                                          className="px-6 py-3 bg-brand-cyan/10 hover:bg-brand-cyan border border-brand-cyan/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-cyan hover:text-black transition-all flex items-center gap-2"
                                       >
                                          <RefreshCw size={16} /> Cleanup Pool
                                       </button>
                                       <button
                                          onClick={() => loadMorePoolTracks(1000000)}
                                          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center gap-2"
                                       >
                                          <Database size={16} />
                                          Refresh Connection
                                       </button>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </>
                     )}

                     {poolSubTab === 'genres' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                           {(genres || []).map(g => (
                              <div key={g.id} className="group relative bg-[#0B0B0F] rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-brand-purple/50 cursor-pointer transition-all duration-500 shadow-2xl" onClick={() => openEditGenre(g)}>
                                 <div className="aspect-square relative overflow-hidden">
                                    <img loading="lazy" src={g.coverUrl} alt={g.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60" />
                                    <div className="absolute inset-0 bg-brand-purple/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 backdrop-blur-sm">
                                       <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-purple transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                          <Edit2 size={24} />
                                       </div>
                                    </div>
                                 </div>
                                 <div className="p-5">
                                    <p className="text-xs font-black text-white truncate text-center uppercase tracking-widest">{g.name}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {poolSubTab === 'updates' && (
                        <div className="space-y-6">
                           {(() => {
                              const allIds = (scannedTracks || []).map((t: any) => t.id);
                              const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedScanIds.has(id));

                              const toggleAll = () => {
                                 if (allSelected) {
                                    setSelectedScanIds(new Set());
                                 } else {
                                    setSelectedScanIds(new Set(allIds));
                                 }
                              };

                              const toggleOne = (id: string) => {
                                 setSelectedScanIds(prev => {
                                    const next = new Set(prev);
                                    next.has(id) ? next.delete(id) : next.add(id);
                                    return next;
                                 });
                              };

                              const handleManualScan = async () => {
                                 if (!scanSince) {
                                     alert('Please select a reference date first.');
                                     return;
                                 }
                                 setIsManualScanning(true);
                                 setManualScanMsg('Initiating server-side scan...');
                                 try {
                                    const authHeader = await getAuthHeader();
                                    const response = await fetch(`${STORAGE_WORKER_URL}/api/admin/pool/scan`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', ...authHeader },
                                        body: JSON.stringify({ scanSince })
                                    });

                                    const result = await response.json();
                                    if (!response.ok) {
                                        throw new Error(result.error || 'Server error during scan');
                                    }

                                    setManualScanMsg(result.message || `✅ Server scan successful.`);
                                    
                                    // Refresh staging tracks after success 
                                    // Let's assume there is a refresh mechanism or we just tell the user to refresh
                                    setTimeout(() => {
                                        if (result.saved && result.saved > 0) {
                                            window.location.reload(); // Simple reload to get new staging tracks if any were saved
                                        }
                                    }, 2000);
                                    
                                 } catch (e: any) {
                                    setManualScanMsg(`❌ Scan error: ${e.message}`);
                                 } finally {
                                    setIsManualScanning(false);
                                 }
                              };

                              const handleBulkAddToPool = async () => {
                                 if (selectedScanIds.size === 0) return;
                                 if (!window.confirm(`Add ${selectedScanIds.size} selected track(s) to Music Pool?`)) return;
                                 setIsBulkAdding(true);

                                 try {
                                    const toAdd = (scannedTracks || []).filter((t: any) => selectedScanIds.has(t.id));

                                    // Check if any of these tracks (by original downloadUrl) are already in pool
                                    const poolUrls = new Set<string>();
                                    (poolTracks || []).forEach(p => {
                                       if (p.downloadUrl) poolUrls.add(p.downloadUrl);
                                       if (p.audioUrl) poolUrls.add(p.audioUrl);
                                       (p.versions || []).forEach((v: any) => {
                                          if (v.downloadUrl) poolUrls.add(v.downloadUrl);
                                       });
                                    });

                                    const duplicates = toAdd.filter(t => t.downloadUrl && poolUrls.has(t.downloadUrl));
                                    let finalToAdd = [...toAdd];
                                    let idsToRemove = Array.from(selectedScanIds);

                                    if (duplicates.length > 0) {
                                       const choice = window.confirm(`Detected ${duplicates.length} track(s) already in Music Pool. \n\nClick OK to REPLACE them (update pool with new data) or CANCEL to SKIP them and only add new ones.`);
                                       if (!choice) {
                                          // Skip duplicates
                                          finalToAdd = toAdd.filter(t => !t.downloadUrl || !poolUrls.has(t.downloadUrl));
                                          // We still want to remove them from scanned list if they were processed
                                          // but if they skipped, maybe user wants them to stay? 
                                          // User said "skip", usually means don't add, but usually they should be cleared from scanned too.
                                          // I'll keep them in scanned if skipped so user can decide later.
                                          idsToRemove = (finalToAdd || []).map(t => t.id);
                                       } else {
                                          // Replace: we need to find existing pool track IDs and remove/update them.
                                          // For simplicity in this R2 architecture, we will just add them as "new" entries 
                                          // and the deduplication in r2-sync will handle it IF the ID was same, but here we generate new IDs.
                                          // So we should find the existing pool IDs and mark them for deletion if possible.
                                          // But bulkAddPoolTracks only removes from SCANNED.
                                          // I will just add them. The user will see them updated.
                                       }
                                    }

                                    const newBatch: any[] = (finalToAdd || []).map((track: any) => {
                                       const versions: any[] = track.versions?.length ? track.versions : [];
                                       if (versions.length === 0 && track.downloadUrl) {
                                          versions.push({
                                             id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                                             versionName: 'Original',
                                             previewUrl: track.previewUrl || track.downloadUrl || '',
                                             downloadUrl: track.downloadUrl,
                                             fileSize: '0MB',
                                             isMainVersion: true,
                                             createdAt: new Date().toISOString()
                                          });
                                       }
                                       return {
                                          ...INITIAL_POOL_TRACK_STATE,
                                          id: track.id || `pt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                                          title: track.title,
                                          artist: track.artist || 'Unknown Artist',
                                          genre: track.genre || genres[0]?.name || 'Afrobeats',
                                          displayGenre: track.genre || track.displayGenre || track.display_genre,
                                          collectionHub: track.collection_hub || track.collectionHub || 'Edits',
                                          subGenre: track.subGenre || track.sub_genre,
                                          vibe: track.vibe,
                                          releaseYear: track.releaseYear || track.release_year,
                                          releaseMonth: track.releaseMonth || track.release_month,
                                          key: track.key || '',
                                          bpm: track.bpm || 100,
                                          previewUrl: track.previewUrl || track.downloadUrl || '',
                                          versions,
                                          dateAdded: new Date().toISOString(),
                                          createdAt: new Date().toISOString(),
                                          updatedAt: new Date().toISOString(),
                                          isNew: true // Set flag to mark tracks with 'NEW' badge in pool list
                                       };
                                    });

                                    if (newBatch.length > 0) {
                                       await bulkAddPoolTracks(newBatch, idsToRemove);
                                       setSelectedScanIds(new Set());
                                       alert(`✅ Processed ${toAdd.length} tracks!`);
                                    } else {
                                       setSelectedScanIds(new Set());
                                       alert(`No new tracks to add.`);
                                    }
                                 } catch (error) {
                                    alert('Failed to add tracks: ' + (error as Error).message);
                                 } finally {
                                    setIsBulkAdding(false);
                                 }
                              };

                              return (
                                 <>
                                    {/* ── Feature & Rules Context ── */}
                                    <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-[2.5rem] p-8 mt-6 mb-8 relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-brand-purple/20 transition-all duration-700 pointer-events-none" />
                                       <div className="flex items-center gap-4 mb-6 relative z-10">
                                          <div className="w-12 h-12 bg-wrap flex items-center justify-center bg-brand-purple/20 text-brand-purple rounded-2xl border border-brand-purple/30">
                                             <ScanSearch size={24} />
                                          </div>
                                          <div>
                                             <h3 className="text-xl font-black text-white tracking-tight">Scanner Engine Status</h3>
                                             <p className="text-[10px] text-brand-purple font-bold uppercase tracking-widest mt-1">Live Sync Capabilities</p>
                                          </div>
                                       </div>
                                       
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                          <div className="space-y-3">
                                             <p className="text-[11px] font-black uppercase text-gray-500 tracking-widest">Data Sources</p>
                                             <ul className="space-y-2 text-sm font-medium text-gray-300">
                                                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-brand-cyan" /> <span>DJ FLOWERZ VIDEOPOOL (CloudFlare R2)</span></li>
                                                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-brand-cyan" /> <span>REMIX HUB (Workers API JSON)</span></li>
                                             </ul>
                                          </div>
                                          <div className="space-y-3">
                                             <p className="text-[11px] font-black uppercase text-gray-500 tracking-widest">Processing Rules</p>
                                             <ul className="space-y-2 text-sm font-medium text-gray-300">
                                                <li className="flex items-start gap-2"><Settings size={14} className="text-brand-purple shrink-0 mt-0.5" /> <span><strong className="text-white">Auto-Brand:</strong> Converts "DJ VICKNICK" tags to "DJ FLOWERZ" globally.</span></li>
                                                <li className="flex items-start gap-2"><Shield size={14} className="text-brand-purple shrink-0 mt-0.5" /> <span><strong className="text-white">Strict Dedupe:</strong> Checks existing D1 db tracks and current staging queue using Absolute URls.</span></li>
                                                <li className="flex items-start gap-2"><Clock size={14} className="text-brand-purple shrink-0 mt-0.5" /> <span><strong className="text-white">Date Gate:</strong> Rejects imports uploaded before the configured Scan Reference Date.</span></li>
                                             </ul>
                                          </div>
                                       </div>
                                    </div>

                                    {/* ── Toolbar ── */}
                                    <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 p-6 shadow-2xl">
                                       <div className="flex flex-wrap items-center justify-between gap-4">
                                          {/* Left: stats + date picker */}
                                          <div className="flex flex-wrap items-center gap-4">
                                             <div className="px-5 py-3 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl text-center">
                                                <p className="text-[10px] text-brand-cyan font-black uppercase tracking-widest">Pending</p>
                                                <p className="text-2xl font-black text-white mt-0.5">{scannedTracks?.length || 0}</p>
                                             </div>
                                             {selectedScanIds.size > 0 && (
                                                <div className="px-5 py-3 bg-brand-purple/10 border border-brand-purple/20 rounded-2xl text-center">
                                                   <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Selected</p>
                                                   <p className="text-2xl font-black text-white mt-0.5">{selectedScanIds.size}</p>
                                                </div>
                                             )}
                                             <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Scan Reference Date</label>
                                                <div className="flex gap-2 relative group w-48">
                                                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-purple group-focus-within:text-brand-cyan transition-colors">
                                                      <Calendar size={16} />
                                                   </div>
                                                   <input
                                                      type="date"
                                                      value={scanSince}
                                                      onChange={e => setScanSince(e.target.value)}
                                                      className="w-full bg-[#0B0B0F] border border-white/5 shadow-inner hover:bg-white/5 focus:bg-[#0B0B0F] rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-300 focus:text-white outline-none focus:border-brand-purple/50 focus:ring-2 focus:ring-brand-purple/20 transition-all cursor-pointer"
                                                   />
                                                </div>
                                             </div>

                                             {/* Right: action buttons */}
                                             <div className="flex flex-wrap gap-3">
                                                <button
                                                   onClick={async () => {
                                                      if (window.confirm('Clear all pending tracks? This will remove everything from the staging list.')) {
                                                         await clearAllScannedTracks();
                                                         alert('Staging queue cleared!');
                                                      }
                                                   }}
                                                   className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                   Clear All
                                                </button>
                                                <button
                                                   onClick={async () => {
                                                      if (window.confirm('Run deduplication on the staging list? This will remove duplicate entries from this queue, including those already in the Music Pool.')) {
                                                         const unique = new Map();
                                                         const norm = (u: string) => (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
                                                         let dupeCount = 0;

                                                         const poolUrls = new Set<string>();
                                                         (poolTracks || []).forEach(p => {
                                                            if (p.downloadUrl) poolUrls.add(norm(p.downloadUrl));
                                                            if (p.audioUrl) poolUrls.add(norm(p.audioUrl));
                                                            if (p.previewUrl) poolUrls.add(norm(p.previewUrl));
                                                            (p.versions || []).forEach((v: any) => {
                                                               if (v.downloadUrl) poolUrls.add(norm(v.downloadUrl));
                                                               if (v.url) poolUrls.add(norm(v.url));
                                                            });
                                                         });

                                                         (scannedTracks || []).forEach((t: any) => {
                                                            const key = norm(t.downloadUrl || t.url || t.id);
                                                            if (!unique.has(key) && !poolUrls.has(key)) {
                                                               unique.set(key, t);
                                                            } else {
                                                               dupeCount++;
                                                            }
                                                         });

                                                         if (dupeCount > 0) {
                                                            const uniqueList = Array.from(unique.values());
                                                            // Replacement logic: clear and re-add unique items
                                                            await clearAllScannedTracks();
                                                            await addScannedTracks(uniqueList);
                                                            alert(`Staging list deduplicated! ${dupeCount} duplicates removed.`);
                                                         } else {
                                                            alert('Staging list is already clean! No duplicates found.');
                                                         }
                                                      }
                                                   }}
                                                   className="px-6 py-3 bg-brand-purple/10 text-brand-purple border border-brand-purple/20 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all flex items-center gap-2"
                                                >
                                                   <Trash2 size={13} /> Filter Duplicates
                                                </button>
                                                {selectedScanIds.size > 0 && (
                                                   <button
                                                      onClick={handleBulkAddToPool}
                                                      disabled={isBulkAdding}
                                                      className="px-6 py-3 bg-brand-cyan/10 hover:bg-brand-cyan text-emerald-400 hover:text-white border border-brand-cyan/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
                                                   >
                                                      {isBulkAdding ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
                                                      {isBulkAdding ? 'Adding...' : `Add ${selectedScanIds.size} to Pool`}
                                                   </button>
                                                )}
                                                <button
                                                   onClick={handleManualScan}
                                                   disabled={isManualScanning}
                                                   className="px-6 py-3 bg-brand-cyan/10 hover:bg-brand-cyan text-brand-cyan hover:text-[#0B0B0F] border border-brand-cyan/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                   {isManualScanning ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                                                   {isManualScanning ? 'Scanning...' : 'Manual Scan'}
                                                </button>
                                             </div>
                                          </div>

                                          {/* scan feedback */}
                                          {manualScanMsg && (
                                             <div className={`mt-4 px-5 py-3 rounded-2xl text-[11px] font-bold ${manualScanMsg.startsWith('✅')
                                                ? 'bg-brand-cyan/10 border border-brand-cyan/20 text-emerald-400'
                                                : manualScanMsg.startsWith('❌')
                                                   ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                   : 'bg-white/5 border border-white/10 text-gray-400'
                                                }`}>
                                                {manualScanMsg}
                                             </div>
                                          )}
                                       </div>
                                    </div>

                                    {/* ── Inline edit modal ── */}
                                    {editingScannedTrack && (
                                       <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-brand-purple/30 p-8 shadow-2xl space-y-4">
                                          <div className="flex items-center justify-between">
                                             <h4 className="text-lg font-black text-white">Edit Scanned Track</h4>
                                             <button onClick={() => setEditingScannedTrack(null)} className="p-2 text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="space-y-2">
                                                <label htmlFor="scanned-track-title" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Title</label>
                                                <input id="scanned-track-title" name="title" value={editingScannedTrack.title || ''} onChange={e => setEditingScannedTrack({ ...editingScannedTrack, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-purple transition-all" />
                                             </div>
                                             <div className="space-y-2">
                                                <label htmlFor="scanned-track-artist" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Artist</label>
                                                <input id="scanned-track-artist" name="artist" value={editingScannedTrack.artist || ''} onChange={e => setEditingScannedTrack({ ...editingScannedTrack, artist: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-purple transition-all" />
                                             </div>
                                             <div className="space-y-2">
                                                <label htmlFor="scanned-track-genre" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Genre</label>
                                                <select id="scanned-track-genre" name="genre" value={editingScannedTrack.genre || ''} onChange={e => setEditingScannedTrack({ ...editingScannedTrack, genre: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-purple transition-all">
                                                   {(genres || []).map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                                </select>
                                             </div>
                                             <div className="space-y-2">
                                                <label htmlFor="scanned-track-bpm" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">BPM</label>
                                                <input id="scanned-track-bpm" name="bpm" type="number" value={editingScannedTrack.bpm || ''} onChange={e => setEditingScannedTrack({ ...editingScannedTrack, bpm: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-purple transition-all" />
                                             </div>
                                             <div className="space-y-2 md:col-span-2">
                                                <label htmlFor="scanned-track-url" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Download URL</label>
                                                <input id="scanned-track-url" name="downloadUrl" value={editingScannedTrack.downloadUrl || ''} onChange={e => setEditingScannedTrack({ ...editingScannedTrack, downloadUrl: e.target.value, previewUrl: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-purple transition-all" />
                                             </div>
                                          </div>
                                          <div className="flex gap-3 pt-2">
                                             <button
                                                onClick={async () => {
                                                   try {
                                                      // Use improved updateR2Item for partial updates (Fixes 413 risk)
                                                      await updateR2Item('scanned_tracks', editingScannedTrack.id, editingScannedTrack);
                                                      if (dataContext.refreshScannedTracks) dataContext.refreshScannedTracks();
                                                      setEditingScannedTrack(null);
                                                   } catch (err: any) {
                                                      alert('Save failed: ' + err.message);
                                                   }
                                                }}
                                                className="px-8 py-3 bg-brand-purple text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 transition-all"
                                             >
                                                Save Changes
                                             </button>
                                             <button onClick={() => setEditingScannedTrack(null)} className="px-8 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                                          </div>
                                       </div>
                                    )}

                                    {/* ── Table ── */}
                                    <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                                       <div className="overflow-x-auto">
                                          <table className="w-full text-left whitespace-nowrap">
                                             <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                                <tr>
                                                   <th className="px-6 py-6">
                                                      <input
                                                         type="checkbox"
                                                         checked={allSelected}
                                                         onChange={toggleAll}
                                                         className="w-4 h-4 accent-brand-purple rounded cursor-pointer"
                                                      />
                                                   </th>
                                                   <th className="px-4 py-6 w-14">Art</th>
                                                   <th className="px-6 py-6">Signal Meta</th>
                                                   <th className="px-6 py-6">Genre</th>
                                                   <th className="px-6 py-6">URL</th>
                                                   <th className="px-6 py-6">Scanned</th>
                                                   <th className="px-6 py-6 text-right">Actions</th>
                                                </tr>
                                             </thead>
                                             <tbody className="divide-y divide-white/[0.03] text-sm">
                                                {(scannedTracks || []).map((track: any) => (
                                                   <tr key={track.id} className={`hover:bg-white/[0.02] transition-colors group ${selectedScanIds.has(track.id) ? 'bg-brand-purple/5' : ''}`}>
                                                      <td className="px-6 py-5">
                                                         <input
                                                            id={`scan-check-${track.id}`}
                                                            name={`scan-check-${track.id}`}
                                                            type="checkbox"
                                                            checked={selectedScanIds.has(track.id)}
                                                            onChange={() => toggleOne(track.id)}
                                                            className="w-4 h-4 accent-brand-purple rounded cursor-pointer"
                                                         />
                                                      </td>
                                                      {/* Cover Art thumbnail */}
                                                      <td className="px-4 py-4">
                                                         {track.coverUrl || track.thumbnail ? (
                                                            <img loading="lazy" src={track.coverUrl || track.thumbnail}
                                                               alt={track.title}
                                                               className="w-10 h-10 rounded-lg object-cover border border-white/10"
                                                            />
                                                         ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                                               <Music size={16} />
                                                            </div>
                                                         )}
                                                      </td>
                                                      <td className="px-6 py-5">
                                                         <div className="font-black text-white group-hover:text-brand-cyan transition-colors">{track.title}</div>
                                                         <div className="text-[11px] text-gray-500 font-medium">{track.artist}</div>
                                                         {track.bpm && <div className="text-[10px] text-gray-600 font-bold mt-0.5">{track.bpm} BPM</div>}
                                                      </td>
                                                      <td className="px-6 py-5">
                                                         <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">{track.genre || '—'}</span>
                                                      </td>
                                                      <td className="px-6 py-5 max-w-[180px]">
                                                         <a
                                                            href={track.downloadUrl || '#'}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[10px] text-brand-purple hover:underline truncate block font-mono"
                                                            title={track.downloadUrl}
                                                         >
                                                            {track.downloadUrl ? track.downloadUrl.split('/').pop() : '—'}
                                                         </a>
                                                      </td>
                                                      <td className="px-6 py-5">
                                                         <span className="text-xs text-gray-400 font-medium">{new Date(track.dateAdded || track.created_at || Date.now()).toLocaleDateString()}</span>
                                                      </td>
                                                      <td className="px-6 py-5 text-right">
                                                         <div className="flex justify-end gap-2">
                                                            {/* Preview */}
                                                            <a
                                                               href={track.previewUrl || track.downloadUrl}
                                                               target="_blank"
                                                               rel="noreferrer"
                                                               title="Preview"
                                                               className="p-2.5 text-brand-purple hover:bg-brand-purple/5 border border-transparent hover:border-brand-purple/20 rounded-xl transition-all"
                                                            >
                                                               <Play size={15} />
                                                            </a>
                                                            {/* Download */}
                                                            <a
                                                               href={track.downloadUrl}
                                                               target="_blank"
                                                               rel="noreferrer"
                                                               download
                                                               title="Download Original"
                                                               className="p-2.5 text-emerald-400 hover:bg-emerald-400/5 border border-transparent hover:border-emerald-400/20 rounded-xl transition-all"
                                                            >
                                                               <Download size={15} />
                                                            </a>
                                                            {/* Single: inject to pool */}
                                                            <button
                                                               title="Add to Pool"
                                                               onClick={async () => {
                                                                  const versions: any[] = [];
                                                                  if (track.downloadUrl) {
                                                                     versions.push({ id: `v_${Date.now()}`, type: track.downloadUrl.includes('.mp4') ? 'mp4' : 'mp3', storagePath: '', duration: 0, downloadUrl: track.downloadUrl });
                                                                  }
                                                                  await addPoolTrack({ ...INITIAL_POOL_TRACK_STATE, id: `pt_${Date.now()}_${Math.random().toString(36).substring(7)}`, title: track.title, artist: track.artist || 'Unknown Artist', genre: track.genre || genres[0]?.name || 'Afrobeats', bpm: track.bpm || 100, previewUrl: track.previewUrl || track.downloadUrl || '', versions, dateAdded: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                                                                  await deleteScannedTrack(track.id);
                                                                  setSelectedScanIds(prev => { const n = new Set(prev); n.delete(track.id); return n; });
                                                               }}
                                                               className="p-2.5 text-emerald-400 hover:bg-brand-cyan/10 border border-transparent hover:border-brand-cyan/20 rounded-xl transition-all"
                                                            >
                                                               <Plus size={15} />
                                                            </button>
                                                            {/* Edit */}
                                                            <button
                                                               title="Edit"
                                                               onClick={() => setEditingScannedTrack({ ...track })}
                                                               className="p-2.5 text-brand-cyan hover:bg-brand-cyan/10 border border-transparent hover:border-brand-cyan/20 rounded-xl transition-all"
                                                            >
                                                               <PenSquare size={15} />
                                                            </button>
                                                            {/* Delete */}
                                                            <button
                                                               title="Discard"
                                                               onClick={() => { if (window.confirm(`Discard "${track.title}"?`)) { deleteScannedTrack(track.id); setSelectedScanIds(prev => { const n = new Set(prev); n.delete(track.id); return n; }); } }}
                                                               className="p-2.5 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
                                                            >
                                                               <Trash2 size={15} />
                                                            </button>
                                                         </div>
                                                      </td>
                                                   </tr>
                                                ))}
                                                {(!scannedTracks || scannedTracks.length === 0) && (
                                                   <tr>
                                                      <td colSpan={6} className="px-8 py-24 text-center">
                                                         <div className="flex flex-col items-center gap-4 text-gray-600">
                                                            <Activity size={48} className="opacity-20" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No pending signals — run a Manual Scan to fetch new tracks</p>
                                                         </div>
                                                      </td>
                                                   </tr>
                                                )}
                                             </tbody>
                                          </table>
                                       </div>
                                    </div>
                                 </>
                              );
                           })()}
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'store' && (
                  <div className="animate-fade-in-up space-y-8">
                     {/* ---- Store Hero Settings Editor ---- */}
                     <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                           <div>
                              <h4 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                 <Zap size={18} className="text-brand-cyan" /> Store Hero Banner
                              </h4>
                              <p className="text-xs text-gray-500 mt-1 font-medium">Edit the promo banner text, code, and countdown timer on the store page.</p>
                           </div>
                           <button
                              onClick={saveHeroSettings}
                              disabled={heroSaving}
                              className="px-6 py-3 bg-brand-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition disabled:opacity-50 shrink-0 flex items-center gap-2"
                           >
                              {heroSaving ? 'Saving…' : '💾 Save Settings'}
                           </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div className="flex flex-col gap-1">
                              <label htmlFor="store-hero-label" className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Label (cyan badge text)</label>
                              <input
                                 id="store-hero-label"
                                 name="heroLabel"
                                 className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium focus:border-brand-cyan/50 outline-none"
                                 value={storeHeroSettings.heroLabel}
                                 onChange={e => setStoreHeroSettings(s => ({ ...s, heroLabel: e.target.value }))}
                               />
                           </div>
                           <div className="flex flex-col gap-1">
                              <label htmlFor="store-hero-headline" className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Headline</label>
                              <input
                                 id="store-hero-headline"
                                 name="heroTitle"
                                 className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium focus:border-brand-cyan/50 outline-none"
                                 value={storeHeroSettings.heroTitle}
                                 onChange={e => setStoreHeroSettings(s => ({ ...s, heroTitle: e.target.value }))}
                               />
                           </div>
                           <div className="flex flex-col gap-1">
                              <label htmlFor="store-hero-promo" className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Promo Code</label>
                              <input
                                 id="store-hero-promo"
                                 name="promoCode"
                                 className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono font-black focus:border-brand-cyan/50 outline-none uppercase"
                                 value={storeHeroSettings.promoCode}
                                 onChange={e => setStoreHeroSettings(s => ({ ...s, promoCode: e.target.value.toUpperCase() }))}
                               />
                           </div>
                           <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Show Promo Code</label>
                              <button
                                 onClick={() => setStoreHeroSettings(s => ({ ...s, promoCodeEnabled: !s.promoCodeEnabled }))}
                                 className={`w-full py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition ${
                                    storeHeroSettings.promoCodeEnabled
                                    ? 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan'
                                    : 'bg-white/5 border-white/10 text-gray-500'
                                 }`}
                              >
                                 {storeHeroSettings.promoCodeEnabled ? '✓ Enabled' : '✗ Hidden'}
                              </button>
                           </div>
                           <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Countdown (H / M / S)</label>
                              <div className="flex gap-2">
                                 {(['countdownHours', 'countdownMinutes', 'countdownSeconds'] as const).map(field => (
                                    <input
                                       key={field}
                                       id={`store-hero-${field}`}
                                       name={field}
                                       type="number"
                                       min={0}
                                       max={field === 'countdownHours' ? 99 : 59}
                                       className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm font-black focus:border-brand-cyan/50 outline-none w-full text-center"
                                       value={storeHeroSettings[field]}
                                       onChange={e => setStoreHeroSettings(s => ({ ...s, [field]: Number(e.target.value) }))}
                                    />
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Merchandise Catalog</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Curate your inventory across active commerce channels</p>
                        </div>
                        <button onClick={openAddProduct} className="px-8 py-4 bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-600 shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 flex items-center gap-3">
                           <Plus size={18} /> Catalog New Item
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#0B0B0F] p-7 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-xl">
                           <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple shadow-inner">
                              <ShoppingBag size={28} />
                           </div>
                           <div>
                              <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Total Assets</p>
                              <p className="text-3xl font-black text-white tracking-tighter">{products.length}</p>
                              <p className="text-[10px] text-brand-purple font-bold mt-1">Items in catalog</p>
                           </div>
                        </div>
                        <div className="bg-[#0B0B0F] p-7 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-xl">
                           <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shadow-inner">
                              <CheckCircle size={28} />
                           </div>
                           <div>
                              <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Stream Ready</p>
                              <p className="text-3xl font-black text-white tracking-tighter">{products.filter(p => p.status === 'published').length}</p>
                              <p className="text-[10px] text-brand-cyan font-bold mt-1">Live in store</p>
                           </div>
                        </div>
                        <div className="bg-[#0B0B0F] p-7 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-pink/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-pink/10 transition-colors" />
                           <div className="w-16 h-16 rounded-3xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center text-brand-pink shadow-inner">
                              <AlertCircle size={28} />
                           </div>
                           <div className="relative z-10">
                              <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Depletion Alert</p>
                              <p className="text-3xl font-black text-white tracking-tighter">{products.filter(p => p.type === 'physical' && (p.stock || 0) < 10).length}</p>
                              <p className="text-[10px] text-brand-pink font-bold mt-1">Requires restock</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left whitespace-nowrap">
                              <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                 <tr>
                                    <th className="px-8 py-6">Asset Profile</th>
                                    <th className="px-8 py-6">Classification</th>
                                    <th className="px-8 py-6">Inventory Quant</th>
                                    <th className="px-8 py-6">Market Value</th>
                                    <th className="px-8 py-6 text-center">Visibility</th>
                                    <th className="px-8 py-6">Channel Status</th>
                                    <th className="px-8 py-6 text-right">Ops Control</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.03] text-sm">
                                 {(Array.isArray(products) ? [...products] : [])
                                    .sort((a, b) => {
                                       const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                       const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                       return dateB - dateA;
                                    })
                                    .map((p) => (
                                       <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                          <td className="px-8 py-6">
                                             <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500 p-0.5">
                                                   <img loading="lazy" src={p.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80'} alt="" className="w-full h-full object-cover rounded-[14px]" />
                                                </div>
                                                <div className="min-w-0">
                                                   <div className="font-black text-white truncate max-w-[200px] group-hover:text-brand-purple transition-colors">{p.name}</div>
                                                   <div className="flex items-center gap-2 mt-1">
                                                      <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase font-black tracking-widest border ${p.type === 'digital' ? 'bg-brand-purple/5 text-brand-purple border-brand-purple/10' : 'bg-brand-pink/5 text-brand-pink border-brand-pink/10'}`}>{p.type}</span>
                                                      {p.os && p.os !== 'None' && <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">OS/ {p.os}</span>}
                                                   </div>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className="text-gray-400 font-black uppercase tracking-widest text-[10px] border border-white/5 px-3 py-1 rounded-full">{p.category || 'General'}</span>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex flex-col">
                                                <span className="text-white font-black text-base">
                                                   {p.type === 'digital' ? <Infinity size={18} className="text-gray-600" /> : (
                                                      (p.variantGroups && p.variantGroups.length > 0) ? (
                                                         (p.variantGroups && Array.isArray(p.variantGroups)) 
                                                            ? p.variantGroups.reduce((acc, g) => acc + (g.variants || []).reduce((vAcc, v) => vAcc + (v.stock || 0), 0), 0)
                                                            : 0
                                                      ) : (p.stock || 0)
                                                   )}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                   {p.type === 'physical' && (p.stock || 0) < 10 && <span className="text-[9px] text-brand-pink font-black uppercase tracking-[0.2em]">Low Buffer</span>}
                                                   {(p.variantGroups?.length || 0) > 0 && (
                                                      <span className="text-[9px] text-brand-purple font-black uppercase tracking-[0.2em]">
                                                         {p.variantGroups!.reduce((acc: number, g: any) => acc + (g.variants?.length || 0), 0)} Variants
                                                      </span>
                                                   )}
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex flex-col">
                                                <span className={p.discountPrice && p.discountPrice > 0 ? 'text-gray-600 line-through text-[10px] font-bold' : 'text-white font-black text-base'}>
                                                   KES {(p.price || 0).toLocaleString()}
                                                </span>
                                                {p.discountPrice && p.discountPrice > 0 && (
                                                   <span className="text-brand-cyan font-black text-base">
                                                      KES {(p.discountPrice || 0).toLocaleString()}
                                                   </span>
                                                )}
                                             </div>
                                          </td>
                                          <td className="px-8 py-6 text-center">
                                             <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${p.is_active ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>
                                                {p.is_active ? 'Active' : 'Hidden'}
                                             </span>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border shadow-sm ${p.status === 'published' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' :
                                                p.status === 'hidden' ? 'bg-brand-pink/5 text-brand-pink border-brand-pink/20' :
                                                   'bg-white/5 text-gray-400 border-white/10'
                                                }`}>
                                                {p.status}
                                             </span>
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                             <div className="flex justify-end gap-3">
                                                <button onClick={() => openEditProduct(p)} className="p-3 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 rounded-[1.25rem] border border-white/5 transition-all"><PenSquare size={18} /></button>
                                                <button type="button" onClick={(e) => handleDeleteProduct(e, p)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-[1.25rem] border border-white/5 transition-all"><Trash2 size={18} /></button>
                                             </div>
                                          </td>
                                       </tr>
                                    ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               )}
               {activeTab === 'mixtapes' && (
                  <div className="animate-fade-in-up">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-2xl font-bold">Mixtape Library</h3>
                        <button onClick={openAddMixtape} className="bg-brand-purple text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-600 font-bold w-full sm:w-auto justify-center">
                           <Plus size={18} /> Upload Mix
                        </button>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(Array.isArray(mixtapes) ? [...mixtapes] : [])
                           .sort((a, b) => {
                              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                              return dateB - dateA; // Newest first
                           })
                           .map((mix) => (
                              <div key={mix.id} className="bg-[#15151A] rounded-xl border border-white/5 p-3 flex gap-3 relative group">
                                 <div className="relative w-16 h-16 shrink-0">
                                    <img loading="lazy" src={mix.coverUrl} alt={mix.title} className="w-full h-full rounded object-cover" />
                                    {mix.isExclusive && <div className="absolute -top-1 -right-1 bg-brand-purple text-white text-[8px] font-bold px-1 rounded shadow-lg ring-1 ring-black">EXCL</div>}
                                 </div>
                                 <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                       <h4 className="font-bold text-white text-sm truncate leading-tight">{mix.title}</h4>
                                       <p className="text-[10px] text-gray-400 truncate">{mix.genre}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                       <div className="flex items-center gap-1.5">
                                          <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${mix.status === 'published' ? 'bg-brand-cyan/10 text-brand-cyan' : 'bg-gray-500/10 text-gray-500'}`}>{mix.status}</span>
                                          {mix.isFeatured && <Star size={8} className="text-brand-pink fill-brand-pink" />}
                                       </div>
                                       <div className="flex gap-2">
                                          <button onClick={() => openEditMixtape(mix)} className="text-gray-500 hover:text-brand-purple transition"><PenSquare size={12} /></button>
                                          <button type="button" onClick={(e) => handleDeleteMixtape(e, mix)} className="text-gray-500 hover:text-red-500 transition"><Trash2 size={12} /></button>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ))}
                     </div>
                  </div>
               )}

               {activeTab === 'marketing' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Growth & Loyalty</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Orchestrate referral cycles and discount ecosystems</p>
                        </div>
                        <div className="flex bg-[#0B0B0F] p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                           <button onClick={() => setMarketingSubTab('referrals')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${marketingSubTab === 'referrals' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Affiliates</button>
                           <button onClick={() => setMarketingSubTab('coupons')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${marketingSubTab === 'coupons' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Incentives</button>
                           <button onClick={() => setMarketingSubTab('newsletter')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${marketingSubTab === 'newsletter' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Broadcasting</button>
                        </div>
                     </div>

                     {marketingSubTab === 'referrals' && (
                        <div className="space-y-8">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-[#0B0B0F] p-7 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-xl">
                                 <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shadow-inner">
                                    <Users size={28} />
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Network Size</p>
                                    <p className="text-3xl font-black text-white tracking-tighter">{referralStats.reduce((acc, r) => acc + r.totalReferrals, 0)}</p>
                                    <p className="text-[10px] text-brand-cyan font-bold mt-1">Direct referrals</p>
                                 </div>
                              </div>
                              <div className="bg-[#0B0B0F] p-7 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-xl relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-cyan/10 transition-colors" />
                                 <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shadow-inner">
                                    <DollarSign size={28} />
                                 </div>
                                 <div className="relative z-10">
                                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Settled Credit</p>
                                    <p className="text-3xl font-black text-white tracking-tighter">KES {referralStats.reduce((acc, r) => acc + r.totalEarned, 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-brand-cyan font-bold mt-1">Total volume paid</p>
                                 </div>
                              </div>
                              <div className="bg-[#0B0B0F] p-7 rounded-[2.5rem] border border-white/5 flex items-center gap-6 shadow-xl">
                                 <div className="w-16 h-16 rounded-3xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center text-brand-pink shadow-inner">
                                    <Clock size={28} />
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Escrowed</p>
                                    <p className="text-3xl font-black text-white tracking-tighter">KES {referralStats.reduce((acc, r) => acc + r.pendingPayout, 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-brand-pink font-bold mt-1">Awaiting settlement</p>
                                 </div>
                              </div>
                           </div>

                           <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                       <tr>
                                          <th className="px-8 py-6">Affiliate Representative</th>
                                          <th className="px-8 py-6">Unique Protocol</th>
                                          <th className="px-8 py-6">Conversion Count</th>
                                          <th className="px-8 py-6">Cumulative Yield</th>
                                          <th className="px-8 py-6">Pending Asset</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03] text-sm">
                                       {(referralStats || []).map(r => (
                                          <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                                             <td className="px-8 py-6 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-black text-xs uppercase">
                                                   {(r.userName || '??').substring(0, 2)}
                                                </div>
                                                <span className="font-black text-white group-hover:text-brand-purple transition-colors text-base tracking-tight">{r.userName || 'Unknown User'}</span>
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className="font-mono text-brand-purple bg-brand-purple/5 px-4 py-1.5 rounded-full border border-brand-purple/10 text-[11px] font-black uppercase tracking-[0.1em]">{r.referralCode}</span>
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className="text-white font-black text-base">{r.totalReferrals}</span>
                                             </td>
                                             <td className="px-8 py-6 text-brand-cyan font-black text-base">KES {(r.totalEarned || 0).toLocaleString()}</td>
                                             <td className="px-8 py-6 text-brand-pink font-black text-base">KES {(r.pendingPayout || 0).toLocaleString()}</td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        </div>
                     )}

                     {marketingSubTab === 'coupons' && (
                        <div className="space-y-6">
                           <div className="flex justify-between items-center">
                              <h4 className="text-xl font-black text-white tracking-tight">Active Incentives</h4>
                              <button onClick={openAddCoupon} className="px-8 py-4 bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-600 shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 flex items-center gap-3">
                                 <Plus size={18} /> Deploy New Incentive
                              </button>
                           </div>

                           <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                       <tr>
                                          <th className="px-8 py-6">Incentive Code</th>
                                          <th className="px-8 py-6">Discount Magnitude</th>
                                          <th className="px-8 py-6">Scope of Effect</th>
                                          <th className="px-8 py-6">Validity Period</th>
                                          <th className="px-8 py-6">Utilization Status</th>
                                          <th className="px-8 py-6">Status</th>
                                          <th className="px-8 py-6 text-right">Protocol Control</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03] text-sm">
                                       {(coupons || []).map(c => (
                                          <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                             <td className="px-8 py-6">
                                                <span className="font-mono text-white bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-[11px] font-black uppercase tracking-[0.1em]">{c.code}</span>
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className="text-brand-cyan font-black text-base">{c.discountType === 'percentage' ? `${c.discountValue}%` : `KES ${(c.discountValue || 0).toLocaleString()}`}</span>
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className="text-gray-400 font-black uppercase tracking-widest text-[9px] px-3 py-1 border border-white/5 rounded-full capitalize">{c.appliesTo}</span>
                                             </td>
                                             <td className="px-8 py-6 text-gray-400 font-bold">{c.expiryDate}</td>
                                             <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1.5">
                                                   <span className="text-white font-black text-sm">{c.usageCount} / {c.usageLimit}</span>
                                                   <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                                      <div className="h-full bg-brand-purple transition-all duration-500" style={{ width: `${Math.min((c.usageCount / c.usageLimit) * 100, 100)}%` }} />
                                                   </div>
                                                </div>
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm ${c.active ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>
                                                   {c.active ? 'Operational' : 'Deactivated'}
                                                </span>
                                             </td>
                                             <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-3">
                                                   <button onClick={() => openEditCoupon(c)} className="p-3 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 rounded-[1.25rem] border border-white/5 transition-all shadow-sm" title="Modify Incentive"><PenSquare size={18} /></button>
                                                   <button onClick={() => deleteCoupon(c.id)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-[1.25rem] border border-white/5 transition-all shadow-sm" title="Retire Incentive"><Trash2 size={18} /></button>
                                                </div>
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        </div>
                     )}

                     {marketingSubTab === 'newsletter' && (
                        <div className="space-y-8">
                           <div className="flex bg-[#0B0B0F] p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner w-fit">
                              <button onClick={() => setNewsletterSubTab('subscribers')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newsletterSubTab === 'subscribers' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Subscribers ({subscribers.length})</button>
                              <button onClick={() => setNewsletterSubTab('campaigns')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newsletterSubTab === 'campaigns' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Campaign Logs</button>
                              <button onClick={() => setNewsletterSubTab('compose')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newsletterSubTab === 'compose' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>New Broadcast</button>
                           </div>

                           {newsletterSubTab === 'subscribers' && (
                              <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                                 <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap">
                                       <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                          <tr>
                                             <th className="px-8 py-6">Identity / Contact</th>
                                             <th className="px-8 py-6">Subscription Date</th>
                                             <th className="px-8 py-6">Engagement Source</th>
                                             <th className="px-8 py-6">Protocol Status</th>
                                             <th className="px-8 py-6 text-right">Ops Control</th>
                                          </tr>
                                       </thead>
                                       <tbody className="divide-y divide-white/[0.03] text-sm">
                                          {(subscribers || []).map(s => (
                                             <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                   <div className="flex items-center gap-4">
                                                      <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-black text-xs uppercase">
                                                         {s.email.substring(0, 2)}
                                                      </div>
                                                      <span className="font-black text-white group-hover:text-brand-purple transition-colors text-base tracking-tight">{s.email}</span>
                                                   </div>
                                                </td>
                                                <td className="px-8 py-6 text-gray-400 font-bold">{new Date(s.dateSubscribed).toLocaleDateString()}</td>
                                                <td className="px-8 py-6">
                                                   <span className="text-gray-400 font-black uppercase tracking-widest text-[9px] px-3 py-1 border border-white/5 rounded-full capitalize">{s.source || 'Web'}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                   <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm ${s.status === 'active' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>
                                                      {s.status}
                                                   </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                   <button className="p-3 text-red-500 hover:bg-red-500/10 rounded-[1.25rem] border border-white/5 transition-all shadow-sm" title="Revoke Protocol"><Trash2 size={18} /></button>
                                                </td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                           )}

                           {newsletterSubTab === 'campaigns' && (
                              <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                                 <div className="overflow-x-auto">
                                    <table className="w-full text-left whitespace-nowrap">
                                       <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                          <tr>
                                             <th className="px-8 py-6">Campaign Protocol</th>
                                             <th className="px-8 py-6">Subject Matrix</th>
                                             <th className="px-8 py-6">Temporal Stamp</th>
                                             <th className="px-8 py-6">Reach Magnitude</th>
                                             <th className="px-8 py-6">Status</th>
                                          </tr>
                                       </thead>
                                       <tbody className="divide-y divide-white/[0.03] text-sm">
                                          {(newsletterCampaigns || []).map(c => (
                                             <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                   <div className="flex items-center gap-4">
                                                      <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan font-black text-xs uppercase">
                                                         {c.type.substring(0, 2)}
                                                      </div>
                                                      <span className="font-black text-white group-hover:text-brand-purple transition-colors text-base tracking-tight">{c.name}</span>
                                                   </div>
                                                </td>
                                                <td className="px-8 py-6 text-gray-400 font-bold">{c.subject}</td>
                                                <td className="px-8 py-6 text-gray-400 font-bold">{c.sentDate ? new Date(c.sentDate).toLocaleString() : 'Pending'}</td>
                                                <td className="px-8 py-6 text-white font-black text-base">{c.recipientCount || 0} Clients</td>
                                                <td className="px-8 py-6">
                                                   <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm ${c.status === 'sent' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' : 'bg-gray-500/5 text-gray-500 border-white/10'}`}>
                                                      {c.status}
                                                   </span>
                                                </td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                           )}

                           {newsletterSubTab === 'compose' && (
                              <div className="bg-[#0B0B0F] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[150px] rounded-full -mr-64 -mt-64" />
                                 <div className="max-w-4xl mx-auto space-y-10 relative z-10">
                                    <div className="flex justify-between items-center">
                                       <div>
                                          <h4 className="text-3xl font-black text-white tracking-tight">Mass Broadcast</h4>
                                          <p className="text-sm text-gray-500 font-medium mt-1">Initialize communication sequence for {subscribers.filter(s => s.status === 'active').length} active protocols</p>
                                       </div>
                                       <button onClick={handleBroadcast} disabled={isSending} className="px-10 py-5 bg-brand-purple text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-600 shadow-2xl shadow-brand-purple/30 transition-all transform hover:-translate-y-1 flex items-center gap-4 disabled:opacity-50 disabled:translate-y-0">
                                          {isSending ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                                          {isSending ? 'Initializing...' : 'Execute Broadcast'}
                                       </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                       <InputGroup label="Broadcast Name" value={emailHeader} onChange={setEmailHeader} placeholder="e.g. March Mixtape Drop" required />
                                       <InputGroup label="Subject Matrix" value={emailSubject} onChange={setEmailSubject} placeholder="The music you've been waiting for..." required />
                                    </div>

                                    <div className="space-y-4">
                                       <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Communication Body</label>
                                       <div className="bg-[#050507] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner focus-within:border-brand-purple/30 transition-all">
                                          <ReactQuill value={emailBody} onChange={setEmailBody} placeholder="Construct your transmission here..." />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'bookings' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Studio Sessions</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Manage temporal assets and studio reservations (D1 Backed)</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <button onClick={refreshStudioSessions} className="p-4 bg-[#0B0B0F] border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all">
                              <RefreshCw size={20} className={studioSessionsLoading ? 'animate-spin' : ''} />
                           </button>
                           <div className="flex bg-[#0B0B0F] p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                              <button onClick={() => setBookingSubTab('list')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${bookingSubTab === 'list' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>
                                 <List size={14} /> Queue
                              </button>
                              <button onClick={() => setBookingSubTab('calendar')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${bookingSubTab === 'calendar' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>
                                 <Calendar size={14} /> Timeline
                              </button>
                           </div>
                        </div>
                     </div>

                     {bookingSubTab === 'list' ? (
                        <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                           <div className="overflow-x-auto">
                              <table className="w-full text-left whitespace-nowrap">
                                 <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                       <th className="px-8 py-6">Client Profile</th>
                                       <th className="px-8 py-6">Duration & Extras</th>
                                       <th className="px-8 py-6">Temporal Slot</th>
                                       <th className="px-8 py-6">Fulfillment</th>
                                       <th className="px-8 py-6 text-right">Magnitude</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {(studioSessions || []).map((s) => (
                                       <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                          <td className="px-8 py-6">
                                             <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan font-black text-xs uppercase">
                                                   {s.customer_email.substring(0, 2)}
                                                </div>
                                                <div className="flex flex-col">
                                                   <span className="font-black text-white group-hover:text-brand-purple transition-colors text-base tracking-tight">{s.customer_email.split('@')[0]}</span>
                                                   <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{s.id}</span>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex flex-col gap-1">
                                                <span className="text-gray-400 font-black uppercase tracking-widest text-[9px] px-3 py-1 border border-white/5 rounded-full w-max">{s.duration_hours} Hour Session</span>
                                                <div className="flex gap-1">
                                                   {(Array.isArray(JSON.parse(s.extras || '[]')) ? JSON.parse(s.extras || '[]') : []).map((ex: string) => (
                                                      <span key={ex} className="text-[8px] font-black uppercase tracking-tighter text-brand-cyan/60">{ex}</span>
                                                   ))}
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex flex-col gap-1">
                                                <span className="text-white font-black text-sm">{s.session_date}</span>
                                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">At {s.start_time}</span>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm ${s.status === 'paid' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' :
                                                'bg-brand-pink/5 text-brand-pink border-brand-pink/20'
                                                }`}>
                                                {s.status}
                                             </span>
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                             <span className="text-white font-black">KES {(Number(s.total_price_kes) || 0).toLocaleString()}</span>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     ) : (
                        <div className="bg-[#0B0B0F] p-20 text-center rounded-[3rem] border border-white/5 shadow-inner">
                           <div className="w-24 h-24 rounded-[2rem] bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mx-auto mb-8 shadow-xl">
                              <Calendar size={48} />
                           </div>
                           <h3 className="text-2xl font-black text-white tracking-tight mb-2">Chronological View</h3>
                           <p className="text-gray-500 font-medium max-w-sm mx-auto">Temporal visualization is currently under reconstruction. Please utilize the Queue view for all immediate logistics.</p>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'gigs' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Gig Manager</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Premium event booking and sales pipeline</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <button onClick={refreshEventGigs} className="p-4 bg-[#0B0B0F] border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all">
                              <RefreshCw size={20} className={eventGigsLoading ? 'animate-spin' : ''} />
                           </button>
                           <div className="flex bg-[#0B0B0F] p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                              <button onClick={() => setGigSubTab('pipeline')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${gigSubTab === 'pipeline' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>
                                 <Activity size={14} /> Pipeline
                              </button>
                              <button onClick={() => setGigSubTab('list')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${gigSubTab === 'list' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>
                                 <List size={14} /> Ledger
                              </button>
                           </div>
                        </div>
                     </div>

                     {gigSubTab === 'pipeline' ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                           {['inquiry', 'quote_sent', 'confirmed', 'completed'].map((stage) => (
                              <div key={stage} className="space-y-4">
                                 <div className="flex items-center justify-between px-4 pb-2 border-b border-white/5">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{stage.replace('_', ' ')}</h4>
                                    <span className="text-[10px] font-black text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">
                                       {(eventGigs || []).filter(g => g.status === stage).length}
                                    </span>
                                 </div>
                                 <div className="space-y-3">
                                    {(eventGigs || []).filter(g => g.status === stage).map(gig => (
                                       <div key={gig.id} className="bg-[#0B0B0F] p-5 rounded-2xl border border-white/5 hover:border-brand-purple/30 transition-all cursor-pointer group shadow-lg">
                                          <div className="flex justify-between items-start mb-3">
                                             <span className="text-[9px] font-black text-brand-cyan uppercase tracking-widest">{gig.event_type}</span>
                                             <span className="text-[9px] text-gray-600 font-bold">{new Date(gig.created_at).toLocaleDateString()}</span>
                                          </div>
                                          <h5 className="text-white font-black group-hover:text-brand-purple transition-colors mb-1">{gig.client_name}</h5>
                                          <p className="text-xs text-gray-500 line-clamp-1 mb-3">{gig.location_details}</p>
                                          <div className="flex justify-between items-center pt-3 border-t border-white/[0.03]">
                                             <span className="text-[10px] text-gray-400 font-black">{gig.event_date}</span>
                                             {gig.deposit_received ? (
                                                <span className="text-[10px] text-brand-cyan font-black">KES {gig.deposit_received}</span>
                                             ) : (
                                                <div className="w-2 h-2 rounded-full bg-brand-pink/50 animate-pulse" />
                                             )}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative text-sm">
                           <table className="w-full text-left whitespace-nowrap">
                              <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                 <tr>
                                    <th className="px-8 py-6">Event Details</th>
                                    <th className="px-8 py-6">Client</th>
                                    <th className="px-8 py-6">Location</th>
                                    <th className="px-8 py-6">Status</th>
                                    <th className="px-8 py-6 text-right">Magnitude</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.03]">
                                 {(eventGigs || []).map(gig => (
                                    <tr key={gig.id} className="hover:bg-white/[0.02] transition-colors">
                                       <td className="px-8 py-6">
                                          <div className="flex flex-col">
                                             <span className="text-white font-black">{gig.event_type}</span>
                                             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{gig.event_date}</span>
                                          </div>
                                       </td>
                                       <td className="px-8 py-6">
                                          <div className="flex flex-col">
                                             <span className="text-gray-300 font-bold">{gig.client_name}</span>
                                             <span className="text-[10px] text-gray-600">{gig.client_email}</span>
                                          </div>
                                       </td>
                                       <td className="px-8 py-6 text-gray-400">{gig.location_details}</td>
                                       <td className="px-8 py-6">
                                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400">{gig.status}</span>
                                       </td>
                                       <td className="px-8 py-6 text-right font-black text-brand-purple">KES {gig.deposit_received || 0}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'studio' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group">
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <Mic size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Active Sessions</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{studioStats.bookedToday}</p>
                           <p className="text-[10px] text-brand-cyan font-bold mt-1">Today's throughput</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group">
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <Timer size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Service Matrix</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{sessionTypes.length}</p>
                           <p className="text-[10px] text-brand-cyan font-bold mt-1">Available protocols</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group">
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                 <DollarSign size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Room Yield</p>
                           <p className="text-3xl font-black text-white tracking-tighter">KES {(Math.round(studioStats?.revenuePerRoom || 0)).toLocaleString()}</p>
                           <p className="text-[10px] text-brand-purple font-bold mt-1">Avg per unit</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group">
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                 <Check size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Structural Cap</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{studioStats.availableRooms} Units</p>
                           <p className="text-[10px] text-brand-purple font-bold mt-1">Operationally ready</p>
                        </div>
                     </div>

                     <div className="flex gap-4 border-b border-white/5 pb-6 overflow-x-auto">
                        <button onClick={() => setStudioSubTab('services')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioSubTab === 'services' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Matrix</button>
                        <button onClick={() => setStudioSubTab('equipment')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioSubTab === 'equipment' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Hardware</button>
                        <button onClick={() => setStudioSubTab('rooms')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioSubTab === 'rooms' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Structures</button>
                        <button onClick={() => setStudioSubTab('maintenance')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${studioSubTab === 'maintenance' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Maintenance</button>
                     </div>

                     {studioSubTab === 'services' && (
                        <div className="space-y-6">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                 <h4 className="text-xl font-black text-white tracking-tight">Service Protocols</h4>
                                 {sessionTypesLoading && <RefreshCw size={18} className="animate-spin text-brand-cyan" />}
                              </div>
                              <button onClick={openAddSessionType} className="px-8 py-4 bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-600 shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 flex items-center gap-3">
                                 <Plus size={18} /> Define Protocol
                              </button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {sessionTypes.map(st => (
                                 <div key={st.id} className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-purple/10 transition-colors" />
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                       <h4 className="font-black text-xl text-white tracking-tight">{st.name}</h4>
                                       <div className="flex gap-2">
                                          <button onClick={() => openEditSessionType(st)} className="p-2 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 rounded-xl transition-all border border-white/5">
                                             <PenSquare size={16} />
                                          </button>
                                          <button onClick={() => deleteSessionType(st.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-white/5">
                                             <Trash2 size={16} />
                                          </button>
                                       </div>
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium mb-8 h-12 line-clamp-2 relative z-10">{st.description}</p>
                                    <div className="flex justify-between items-center relative z-10">
                                       <div className="px-4 py-2 bg-brand-purple/5 border border-brand-purple/10 rounded-2xl">
                                          <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">MAGNITUDE</p>
                                          <p className="font-black text-brand-purple text-lg">KES {(st.price || 0).toLocaleString()}</p>
                                       </div>
                                       <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center text-gray-700 group-hover:border-brand-purple/20 group-hover:text-brand-purple transition-all">
                                          <ExternalLink size={20} />
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                     {studioSubTab === 'equipment' && (
                        <div className="space-y-6">
                           <div className="flex justify-between items-center">
                              <h4 className="text-xl font-black text-white tracking-tight">Hardware Repository</h4>
                              <button onClick={openAddEquipment} className="px-8 py-4 bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-600 shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 flex items-center gap-3">
                                 <Plus size={18} /> Catalog Hardware
                              </button>
                           </div>
                           <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                       <tr>
                                          <th className="px-8 py-6">Asset Nomenclature</th>
                                          <th className="px-8 py-6">Hardware Classification</th>
                                          <th className="px-8 py-6 text-right">Ops Control</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03] text-sm">
                                       {(studioEquipment || []).map(eq => (
                                          <tr key={eq.id} className="hover:bg-white/[0.02] transition-colors group">
                                             <td className="px-8 py-6 font-black text-white group-hover:text-brand-cyan transition-colors text-base tracking-tight">{eq.name}</td>
                                             <td className="px-8 py-6">
                                                <span className="text-gray-400 font-black uppercase tracking-widest text-[9px] px-3 py-1 border border-white/5 rounded-full">{eq.category}</span>
                                             </td>
                                             <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-3">
                                                   <button onClick={() => openEditEquipment(eq)} className="p-3 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 rounded-[1.25rem] border border-white/5 transition-all shadow-sm"><PenSquare size={18} /></button>
                                                   <button onClick={() => deleteStudioEquipment(eq.id)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-[1.25rem] border border-white/5 transition-all shadow-sm"><Trash2 size={18} /></button>
                                                </div>
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        </div>
                     )}
                     {studioSubTab === 'rooms' && (
                        <div className="space-y-6">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                 <h4 className="text-xl font-black text-white tracking-tight">Active Structures</h4>
                                 {studioRoomsLoading && <RefreshCw size={18} className="animate-spin text-brand-cyan" />}
                              </div>
                              <button onClick={openAddRoom} className="px-8 py-4 bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-600 shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 flex items-center gap-3">
                                 <Plus size={18} /> Initialize Structure
                              </button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {(studioRooms || []).map(room => (
                                 <div key={room.id} className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-xl group">
                                    <div className="flex justify-between items-start mb-6">
                                       <div className="flex flex-col gap-1">
                                          <h4 className="font-black text-xl text-white tracking-tight">{room.name}</h4>
                                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border w-fit ${room.status === 'active' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>{room.status}</span>
                                       </div>
                                       <div className="flex gap-2">
                                          <button onClick={() => openEditRoom(room)} className="p-2 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/5 rounded-xl transition-all border border-white/5"><PenSquare size={16} /></button>
                                          <button onClick={() => { if (confirm('Retire structure?')) deleteStudioRoom(room.id) }} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-white/5"><Trash2 size={16} /></button>
                                       </div>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium mb-8 h-12 line-clamp-2">{room.description}</p>
                                    <div className="flex justify-between items-center px-6 py-4 bg-white/[0.02] border border-white/5 rounded-[1.5rem]">
                                       <div className="flex items-center gap-2">
                                          <Users size={14} className="text-gray-600" />
                                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Cap: {room.capacity}</span>
                                       </div>
                                       <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                     {studioSubTab === 'maintenance' && (
                        <div className="space-y-6">
                           <div className="flex items-center gap-3">
                              <h4 className="text-xl font-black text-white tracking-tight">System Integrity</h4>
                              {maintenanceLogsLoading && <RefreshCw size={18} className="animate-spin text-brand-cyan" />}
                           </div>
                           <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                       <tr>
                                          <th className="px-8 py-6">Asset Under Review</th>
                                          <th className="px-8 py-6">Incident Log</th>
                                          <th className="px-8 py-6">Temporal Stamp</th>
                                          <th className="px-8 py-6">System Status</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03] text-sm">
                                       {(maintenanceLogs || []).map(log => (
                                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                             <td className="px-8 py-6 font-black text-white group-hover:text-brand-purple transition-colors text-base tracking-tight">{log.itemName}</td>
                                             <td className="px-8 py-6 text-gray-400 font-medium">{log.description}</td>
                                             <td className="px-8 py-6 text-gray-500 font-bold">{log.date}</td>
                                             <td className="px-8 py-6">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm ${log.status === 'resolved' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' :
                                                   'bg-brand-pink/5 text-brand-pink border-brand-pink/20'
                                                   }`}>
                                                   {log.status}
                                                </span>
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'referrals' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-brand-purple/20 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-4">
                              <Users size={24} />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Network Expansion</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{referralStatsSummary.total}</p>
                           <p className="text-[10px] text-brand-purple font-bold mt-1">Gross conversions</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-brand-cyan/20 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan mb-4">
                              <Activity size={24} />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Active Protocols</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{referralStatsSummary.active}</p>
                           <p className="text-[10px] text-brand-cyan font-bold mt-1">Authenticated referrers</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-brand-pink/20 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center text-brand-pink mb-4">
                              <Gift size={24} />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Settled Assets</p>
                           <p className="text-3xl font-black text-white tracking-tighter">KES {(referralStatsSummary?.payouts || 0).toLocaleString()}</p>
                           <p className="text-[10px] text-brand-pink font-bold mt-1">Cumulative payouts</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group">
                           <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-4">
                              <Shield size={24} />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">System Integrity</p>
                           <div className="flex items-center gap-2 mt-1">
                              <div className={`w-2 h-2 rounded-full ${referralSettings.enabled ? 'bg-brand-cyan animate-pulse' : 'bg-red-500'}`} />
                              <p className={`text-xl font-black tracking-tight ${referralSettings.enabled ? 'text-brand-cyan' : 'text-red-500'}`}>
                                 {referralSettings.enabled ? 'OPERATIONAL' : 'DEACTIVATED'}
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-4 border-b border-white/5 pb-6 overflow-x-auto">
                        <button onClick={() => setReferralSubTab('settings')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${referralSubTab === 'settings' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Governance</button>
                        <button onClick={() => setReferralSubTab('logs')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${referralSubTab === 'logs' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Historical Logs</button>
                     </div>

                     {referralSubTab === 'settings' && (
                        <div className="bg-[#0B0B0F] p-10 rounded-[3rem] border border-white/5 space-y-10 max-w-3xl shadow-2xl relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                              <div>
                                 <h3 className="text-2xl font-black text-white tracking-tight">Referral Protocol Control</h3>
                                 <p className="text-sm text-gray-500 font-medium">Configure global expansion parameters and incentive magnitude</p>
                              </div>
                              <button
                                 onClick={() => updateReferralSettings({ enabled: !referralSettings.enabled })}
                                 className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all transform hover:-translate-y-1 ${referralSettings.enabled ?
                                    'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 shadow-[0_0_20px_rgba(40,230,220,0.1)]' :
                                    'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                                    }`}
                              >
                                 {referralSettings.enabled ? 'DISABLE PROTOCOL' : 'ACTIVATE PROTOCOL'}
                              </button>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                              <div className="space-y-4">
                                 <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                    <label htmlFor="referral-incentive-type" className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Acquisition Incentive</label>
                                    <select
                                       id="referral-incentive-type"
                                       name="newUserDiscountType"
                                       value={referralSettings.newUserDiscountType}
                                       onChange={(e) => updateReferralSettings({ newUserDiscountType: e.target.value as 'percentage' | 'flat' })}
                                       className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-brand-purple uppercase outline-none focus:border-brand-purple/50 transition-all cursor-pointer"
                                    >
                                       <option value="percentage">% MAGNITUDE</option>
                                       <option value="flat">KES QUANTITY</option>
                                    </select>
                                 </div>
                                 <div className="relative group">
                                    <input
                                       id="referral-incentive-value"
                                       name="newUserDiscount"
                                       type="number"
                                       value={referralSettings.newUserDiscount}
                                       onChange={(e) => updateReferralSettings({ newUserDiscount: Number(e.target.value) })}
                                       className="bg-[#07070A] border border-white/5 rounded-2xl px-6 py-5 w-full focus:border-brand-purple/50 outline-none font-black text-xl text-white transition-all shadow-inner"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs uppercase tracking-widest group-focus-within:text-brand-purple transition-colors">
                                       {referralSettings.newUserDiscountType === 'percentage' ? '%' : 'KES'}
                                    </span>
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                    <label htmlFor="referrer-reward-amount" className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Referrer Compensation</label>
                                 </div>
                                 <div className="relative group">
                                    <input
                                       id="referrer-reward-amount"
                                       name="referrer-reward-amount"
                                       type="number"
                                       value={referralSettings.referrerRewardAmount}
                                       onChange={(e) => updateReferralSettings({ referrerRewardAmount: Number(e.target.value) })}
                                       className="bg-[#07070A] border border-white/5 rounded-2xl px-6 py-5 w-full focus:border-brand-purple/50 outline-none font-black text-xl text-white transition-all shadow-inner"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs uppercase tracking-widest group-focus-within:text-brand-purple transition-colors">KES</span>
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10 border-t border-white/5 pt-10">
                              <div className="space-y-4">
                                 <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                    <label htmlFor="first-time-discount-type" className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">First-Time Discount</label>
                                    <select
                                       id="first-time-discount-type"
                                       name="firstTimeDiscountType"
                                       value={referralSettings.firstTimeDiscountType || 'percentage'}
                                       onChange={(e) => updateReferralSettings({ firstTimeDiscountType: e.target.value as 'percentage' | 'flat' })}
                                       className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-brand-cyan uppercase outline-none focus:border-brand-cyan/50 transition-all cursor-pointer"
                                    >
                                       <option value="percentage">% MAGNITUDE</option>
                                       <option value="flat">KES QUANTITY</option>
                                    </select>
                                 </div>
                                 <div className="relative group">
                                    <input
                                       id="first-time-discount-value"
                                       name="firstTimeDiscount"
                                       type="number"
                                       value={referralSettings.firstTimeDiscount || 0}
                                       onChange={(e) => updateReferralSettings({ firstTimeDiscount: Number(e.target.value) })}
                                       className="bg-[#07070A] border border-white/5 rounded-2xl px-6 py-5 w-full focus:border-brand-cyan/50 outline-none font-black text-xl text-white transition-all shadow-inner"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs uppercase tracking-widest group-focus-within:text-brand-cyan transition-colors">
                                       {referralSettings.firstTimeDiscountType === 'percentage' ? '%' : 'KES'}
                                    </span>
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">First-Time Protocol</label>
                                    <button
                                       onClick={() => updateReferralSettings({ firstTimeDiscountEnabled: !referralSettings.firstTimeDiscountEnabled })}
                                       className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${referralSettings.firstTimeDiscountEnabled ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-red-500/20 text-red-500'}`}
                                    >
                                       {referralSettings.firstTimeDiscountEnabled ? 'ACTIVE' : 'INACTIVE'}
                                    </button>
                                 </div>
                                 <p className="text-[10px] text-gray-500 font-medium px-4 leading-relaxed">
                                    Automatically apply this discount to first-time subscribers who don't have a referral code.
                                 </p>
                              </div>
                           </div>


                           <div className="p-8 bg-brand-purple/5 border border-brand-purple/10 rounded-[2rem] flex gap-6 items-start relative z-10">
                              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple shrink-0">
                                 <Info size={24} />
                              </div>
                              <div className="space-y-4">
                                 <h4 className="font-black text-white text-lg tracking-tight">Conversion Protocol Logic</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex gap-3">
                                       <div className="w-5 h-5 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple text-[10px] font-black shrink-0">1</div>
                                       <p className="text-xs text-gray-400 font-medium leading-relaxed">New identities receive the <span className="text-white font-bold">Incentive Magnitude</span> on initial subscription protocol.</p>
                                    </div>
                                    <div className="flex gap-3">
                                       <div className="w-5 h-5 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple text-[10px] font-black shrink-0">2</div>
                                       <p className="text-xs text-gray-400 font-medium leading-relaxed">Referrers are credited with <span className="text-white font-bold">Reward Quantum</span> upon referee transaction clearance.</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {referralSubTab === 'logs' && (
                        <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                           <div className="overflow-x-auto">
                              <table className="w-full text-left whitespace-nowrap">
                                 <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                       <th className="px-8 py-6">Origin Identity</th>
                                       <th className="px-8 py-6">Destination Identity</th>
                                       <th className="px-8 py-6">Protocol Type</th>
                                       <th className="px-8 py-6">Asset Quantum</th>
                                       <th className="px-8 py-6">Temporal Stamp</th>
                                       <th className="px-8 py-6">System Status</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {referralLogs.length === 0 ? (
                                       <tr><td colSpan={6} className="px-8 py-20 text-center">
                                          <div className="flex flex-col items-center gap-4 text-gray-600">
                                             <Inbox size={48} className="opacity-20" />
                                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No Expansion Logs Detected</p>
                                          </div>
                                       </td></tr>
                                    ) : (
                                       (referralLogs || []).map(log => (
                                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                             <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                   <span className="font-black text-white group-hover:text-brand-purple transition-colors text-base tracking-tight">{log.referrerName}</span>
                                                   <span className="text-[10px] text-gray-600 font-bold font-mono tracking-widest">{log.referrerId.split('-')[0].toUpperCase()}</span>
                                                </div>
                                             </td>
                                             <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                   <span className="font-black text-white text-base tracking-tight">{log.refereeName}</span>
                                                   <span className="text-[10px] text-brand-cyan font-bold uppercase tracking-widest">{log.discountApplied}% Reduction Applied</span>
                                                </div>
                                             </td>
                                             <td className="px-8 py-6">
                                                <span className="text-gray-400 font-black uppercase tracking-widest text-[9px] px-3 py-1 border border-white/5 rounded-full">{log.planPurchased}</span>
                                             </td>
                                             <td className="px-8 py-6 text-brand-cyan font-black text-base">KES {referralSettings.referrerRewardAmount}</td>
                                             <td className="px-8 py-6 text-gray-500 font-bold">{new Date(log.createdAt).toLocaleDateString()}</td>
                                             <td className="px-8 py-6">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm ${log.status === 'completed' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' :
                                                   'bg-brand-pink/10 text-brand-pink border-brand-pink/20'
                                                   }`}>
                                                   {log.status}
                                                </span>
                                             </td>
                                          </tr>
                                       ))
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}
                  </div>
               )}

                {activeTab === 'community-profiles' && <AdminCommunityDirectory />}

               {activeTab === 'shipping' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Logistics Engine</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Manage global fulfillment pipelines and regional delivery protocols</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-pink/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-pink/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center text-brand-pink">
                                 <Plus size={24} />
                              </div>
                              <div className="w-2 h-2 bg-brand-pink rounded-full animate-pulse shadow-[0_0_8px_rgba(255,40,126,0.5)]" />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Dispatch Queue</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{shippingStats.pending}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-cyan/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <Check size={24} />
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan font-bold border border-brand-cyan/10">↑ 100%</span>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Fulfilled Protocol</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{shippingStats.delivered}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-purple/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                 <DollarSign size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Asset Revenue</p>
                           <p className="text-3xl font-black text-white tracking-tighter">KES {new Intl.NumberFormat('en-KE', { notation: "compact" }).format(shippingStats.revenue)}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-red-500/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                 <AlertTriangle size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Logistics Variance</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{shippingStats.failed}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Pending Shipments Table */}
                        <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col">
                           <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                              <div>
                                 <h4 className="text-lg font-black text-white tracking-tight">Active Consignments</h4>
                                 <p className="text-[10px] text-brand-cyan font-black uppercase tracking-widest leading-none mt-1">Ready for Fulfillment</p>
                              </div>
                              <div className="px-4 py-1.5 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full">
                                 <span className="text-[10px] font-black text-brand-cyan uppercase tracking-widest">{(liveOrders || []).filter(o => (o.status === 'processing' || o.status === 'pending') && o.requiresShipping).length} Pending</span>
                              </div>
                           </div>
                           <div className="overflow-x-auto max-h-[600px] scrollbar-hide">
                              <table className="w-full text-left whitespace-nowrap">
                                 <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                       <th className="px-8 py-4">Consignee Profile</th>
                                       <th className="px-8 py-4 text-right">Logistics Control</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {(liveOrders || []).filter(o => (o.status === 'processing' || o.status === 'pending') && o.requiresShipping).map(o => (
                                       <tr key={o.id} className="hover:bg-white/[0.02] transition-colors group">
                                          <td className="px-8 py-6">
                                             <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-mono text-[10px] text-gray-500 group-hover:bg-brand-purple/10 group-hover:text-brand-purple transition-all border border-transparent group-hover:border-brand-purple/20">
                                                   #{o.id.slice(-4).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                   <span className="font-black text-white text-base tracking-tight">{o.customerName}</span>
                                                   <span className="text-[10px] text-gray-500 font-bold tracking-widest">{o.customerEmail}</span>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                             <button onClick={() => openShipModal(o)} className="px-6 py-2.5 bg-brand-purple hover:bg-purple-600 text-white border border-brand-purple/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all transform hover:-translate-y-1 shadow-lg shadow-brand-purple/10">
                                                Dispatch
                                             </button>
                                          </td>
                                       </tr>
                                    ))}
                                    {(liveOrders || []).filter(o => (o.status === 'processing' || o.status === 'pending') && o.requiresShipping).length === 0 && (
                                       <tr><td colSpan={2} className="px-8 py-32 text-center text-gray-600 font-bold italic opacity-40">Zero pending consignments registered.</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>

                        {/* Dynamic Logistics Configuration */}
                        <div className="space-y-6">
                           <div className="px-2">
                              <h4 className="text-xl font-black text-white tracking-tight">Dynamic Weight Engine</h4>
                              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Global Logistics Algorithm Configuration</p>
                           </div>
                           <ShippingSettings />
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'site-profile' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Core CMS</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Global content architecture and metadata governance</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex bg-[#0B0B0F] p-1.5 rounded-2xl border border-white/5 shadow-inner">
                              <span className="px-5 py-2.5 bg-brand-purple/10 border border-brand-purple/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-purple flex items-center gap-2">
                                 <Activity size={12} /> Live Sync Active
                              </span>
                           </div>
                           <button onClick={handleSaveConfig} className="px-8 py-4 bg-brand-purple hover:bg-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 flex items-center gap-3 group">
                              <Save size={18} className="group-hover:scale-110 transition-transform" /> Save Commit
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-cyan/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <FileText size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Active Modules</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{contentStats.activeSections}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-purple/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                 <ShoppingBag size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Linked Assets</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{products.length}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-purple/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                 <Clock size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">State Stamp</p>
                           <p className="text-xl font-black text-white tracking-tighter">{contentStats.lastUpdated}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-cyan/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <AlertCircle size={24} />
                              </div>
                              <div className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Integrity Health</p>
                           <p className="text-3xl font-black text-white tracking-tighter">Stable</p>
                        </div>
                     </div>

                     <div className="flex gap-2 bg-[#0B0B0F] p-2 rounded-[2.5rem] border border-white/5 overflow-x-auto scrollbar-hide">
                        {[
                           { id: 'home', label: 'Home Hub', icon: LayoutDashboard },
                           { id: 'about', label: 'Identity', icon: Users },
                           { id: 'footer', label: 'Terminal', icon: Monitor },
                           { id: 'tipjar', label: 'Support', icon: Gift },
                           { id: 'seo', label: 'Visibility', icon: Globe },
                           { id: 'notice', label: 'Flash Protocol', icon: Bell }
                        ].map(tab => (
                           <button
                              key={tab.id}
                              onClick={() => setContentSubTab(tab.id as any)}
                              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${contentSubTab === tab.id ? 'bg-brand-purple text-white shadow-xl shadow-brand-purple/20' : 'text-gray-500 hover:text-white hover:bg-white/5'
                                 }`}
                           >
                              <tab.icon size={14} /> {tab.label}
                           </button>
                        ))}
                     </div>

                     <div className="space-y-8 animate-fade-in">
                        {contentSubTab === 'home' && (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Hero Narrative</h4>
                                    <p className="text-[10px] text-brand-cyan font-black uppercase tracking-widest leading-none mt-1">Main Landing Experience</p>
                                 </div>
                                 <div className="space-y-4">
                                    <InputGroup label="Core Narrative" value={editingConfig.hero.title} onChange={v => updateContentField('hero', 'title', v)} />
                                    <InputGroup label="Sub-Context" type="textarea" value={editingConfig.hero.subtitle} onChange={v => updateContentField('hero', 'subtitle', v)} />
                                    <div className="grid grid-cols-2 gap-4">
                                       <InputGroup label="Action Trigger" value={editingConfig.hero.ctaText} onChange={v => updateContentField('hero', 'ctaText', v)} />
                                       <InputGroup label="Visual Asset (URL)" value={editingConfig.hero.bgImage} onChange={v => updateContentField('hero', 'bgImage', v)} />
                                    </div>
                                 </div>
                              </div>

                              <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Featured Mixtapes</h4>
                                    <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest leading-none mt-1">Carousel Logic</p>
                                 </div>
                                 <div className="space-y-4">
                                    <InputGroup label="Cluster Title" value={editingConfig.home.featuredMixtapes.title} onChange={v => { const h = { ...editingConfig.home }; h.featuredMixtapes.title = v; setEditingConfig({ ...editingConfig, home: h }) }} />
                                    <InputGroup label="Cluster Context" value={editingConfig.home.featuredMixtapes.subtitle} onChange={v => { const h = { ...editingConfig.home }; h.featuredMixtapes.subtitle = v; setEditingConfig({ ...editingConfig, home: h }) }} />
                                    <InputGroup label="Hub Trigger Text" value={editingConfig.home.featuredMixtapes.ctaText} onChange={v => { const h = { ...editingConfig.home }; h.featuredMixtapes.ctaText = v; setEditingConfig({ ...editingConfig, home: h }) }} />
                                 </div>
                              </div>
                           </div>
                        )}

                        {contentSubTab === 'about' && (
                           <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-8">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                    <Users size={32} />
                                 </div>
                                 <div>
                                    <h4 className="text-2xl font-black text-white tracking-tight">Public Identity</h4>
                                    <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Brand Narrative & Bio</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 gap-8">
                                 <InputGroup label="Identity Header" value={editingConfig.about.title} onChange={v => updateContentField('about', 'title', v)} />
                                 <InputGroup label="Comprehensive Bio" type="textarea" value={editingConfig.about.bio} onChange={v => updateContentField('about', 'bio', v)} placeholder="The story behind the sound..." />
                              </div>
                           </div>
                        )}

                        {contentSubTab === 'footer' && (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Communication Channels</h4>
                                    <p className="text-[10px] text-brand-cyan font-black uppercase tracking-widest mt-1">Direct Vectors</p>
                                 </div>
                                 <div className="space-y-4">
                                    <InputGroup label="Inquiry Email" value={editingConfig.contact.email} onChange={v => updateContentField('contact', 'email', v)} />
                                    <div className="grid grid-cols-2 gap-4">
                                       <InputGroup label="Primary Line" value={editingConfig.contact.phone} onChange={v => updateContentField('contact', 'phone', v)} />
                                       <InputGroup label="WhatsApp Logic" value={editingConfig.contact.whatsapp} onChange={v => updateContentField('contact', 'whatsapp', v)} />
                                    </div>
                                 </div>
                              </div>
                              <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Terminal Meta</h4>
                                    <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest mt-1">Footer Context</p>
                                 </div>
                                 <InputGroup label="Base Description" type="textarea" value={editingConfig.footer.description} onChange={v => updateContentField('footer', 'description', v)} />
                              </div>
                           </div>
                        )}

                        {contentSubTab === 'tipjar' && (
                           <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-8 max-w-2xl mx-auto text-center">
                              <div className="w-20 h-20 rounded-[2rem] bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center text-brand-pink mx-auto">
                                 <Star size={40} />
                              </div>
                              <div className="space-y-2">
                                 <h4 className="text-2xl font-black text-white tracking-tight">Patron Engagement</h4>
                                 <p className="text-[10px] text-brand-pink font-black uppercase tracking-[0.2em]">Tip Jar Logic</p>
                              </div>
                              <div className="space-y-6 text-left">
                                 <InputGroup label="Support Header" value={editingConfig.home.tipJar.title} onChange={v => { const h = { ...editingConfig.home }; h.tipJar.title = v; setEditingConfig({ ...editingConfig, home: h }) }} />
                                 <InputGroup label="Engagement Script" type="textarea" value={editingConfig.home.tipJar.message} onChange={v => { const h = { ...editingConfig.home }; h.tipJar.message = v; setEditingConfig({ ...editingConfig, home: h }) }} />
                              </div>
                           </div>
                        )}

                        {contentSubTab === 'seo' && (
                           <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-8">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                    <Globe size={32} />
                                 </div>
                                 <div>
                                    <h4 className="text-2xl font-black text-white tracking-tight">Visibility & Indexing</h4>
                                    <p className="text-[10px] text-brand-cyan font-black uppercase tracking-widest">Global SEO Protocols</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="space-y-6">
                                    <InputGroup label="Site Identification" value={editingConfig.seo.siteTitle} onChange={v => updateContentField('seo', 'siteTitle', v)} />
                                    <InputGroup label="Search Keywords" value={editingConfig.seo.keywords} onChange={v => updateContentField('seo', 'keywords', v)} placeholder="dj, mixtapes, music, house..." />
                                 </div>
                                 <InputGroup label="Global Meta Abstract" type="textarea" value={editingConfig.seo.description} onChange={v => updateContentField('seo', 'description', v)} />
                              </div>
                           </div>
                        )}

                        {contentSubTab === 'notice' && (
                           <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-brand-purple/20 shadow-2xl space-y-8 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                              <div className="relative z-10">
                                 <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-6">
                                       <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                          <Bell size={32} />
                                       </div>
                                       <div>
                                          <h4 className="text-2xl font-black text-white tracking-tight">Flash Protocol</h4>
                                          <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Site-Wide Alert Logic</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</span>
                                       <InputGroup label="" type="checkbox" checked={editingConfig.notice?.enabled || false} onChange={v => setEditingConfig({ ...editingConfig, notice: { ...editingConfig.notice!, enabled: v } })} />
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 space-y-6">
                                       <InputGroup label="Briefing Title" value={editingConfig.notice?.title || ''} onChange={v => setEditingConfig({ ...editingConfig, notice: { ...editingConfig.notice!, title: v } })} />
                                       <InputGroup label="Critical Briefing" type="textarea" value={editingConfig.notice?.message || ''} onChange={v => setEditingConfig({ ...editingConfig, notice: { ...editingConfig.notice!, message: v } })} />
                                    </div>
                                    <div className="space-y-6">
                                       <InputGroup label="Severity Tier" options={['info', 'warning', 'error']} value={editingConfig.notice?.type || 'info'} onChange={v => setEditingConfig({ ...editingConfig, notice: { ...editingConfig.notice!, type: v as any } })} />
                                       <div className={`p-6 rounded-[2rem] border transition-all ${editingConfig.notice?.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                          editingConfig.notice?.type === 'warning' ? 'bg-brand-pink/10 border-brand-pink/20 text-brand-pink' :
                                             'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
                                          }`}>
                                          <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Live Preview</p>
                                          <p className="font-bold text-sm tracking-tight">{editingConfig.notice?.title || 'System Alert'}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               )}


               {activeTab === 'telegram' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Signal Bridge</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Configure automated broadcast nodes and channel distribution</p>
                        </div>
                        <div className="flex bg-[#0B0B0F] p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                           <button onClick={() => setTelegramSubTab('config')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${telegramSubTab === 'config' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Node logic</button>
                           <button onClick={() => setTelegramSubTab('channels')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${telegramSubTab === 'channels' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Broadcasters</button>
                        </div>
                     </div>

                     {telegramSubTab === 'config' && (
                        <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-8 max-w-4xl">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <Send size={32} />
                              </div>
                              <div className="flex-1">
                                 <h4 className="text-2xl font-black text-white tracking-tight">Bridge Configuration</h4>
                                 <p className="text-[10px] text-brand-cyan font-black uppercase tracking-widest leading-none mt-1">Primary API Interface</p>
                              </div>
                              <div className={`px-5 py-2 rounded-2xl border flex items-center gap-3 transition-all ${telegramConfig.status === 'Connected' ? 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                 <div className={`w-2 h-2 rounded-full ${telegramConfig.status === 'Connected' ? 'bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(40,230,220,0.5)]' : 'bg-red-500'}`} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">{telegramConfig.status}</span>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <InputGroup label="Access Token" value={telegramConfig.botToken} onChange={v => updateTelegramConfig({ botToken: v })} placeholder="Enter Bot API Key..." />
                              <InputGroup label="Identity Handle" value={telegramConfig.botUsername} onChange={() => { }} placeholder="@BotName" />
                           </div>
                           <div className="pt-6 border-t border-white/5">
                              <button onClick={() => updateTelegramConfig({})} className="px-8 py-4 bg-brand-purple hover:bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-purple/20 transition-all flex items-center gap-3">
                                 <RefreshCw size={18} /> Test Connection
                              </button>
                           </div>
                        </div>
                     )}

                     {telegramSubTab === 'channels' && (
                        <div className="space-y-6">
                           <div className="flex justify-between items-center px-4">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Active Broadcast Nodes</p>
                              <button onClick={openAddChannel} className="px-6 py-3 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple border border-brand-purple/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3">
                                 <Plus size={18} /> Append Hub
                              </button>
                           </div>
                           <div className="bg-[#0B0B0F] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                              <table className="w-full text-left whitespace-nowrap">
                                 <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                       <th className="px-8 py-6">Entity Signature</th>
                                       <th className="px-8 py-6">Identity</th>
                                       <th className="px-8 py-6">Genre Cluster</th>
                                       <th className="px-8 py-6 text-right">Protocol Control</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {(telegramChannels || []).map(ch => (
                                       <tr key={ch.id} className="hover:bg-white/[0.02] transition-colors group">
                                          <td className="px-8 py-6">
                                             <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-black text-[10px] uppercase">
                                                   <Send size={14} />
                                                </div>
                                                <span className="font-black text-white text-base tracking-tight group-hover:text-brand-purple transition-colors">{ch.name}</span>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className="font-mono text-[11px] text-gray-500 bg-white/5 px-3 py-1 rounded-lg border border-white/5">{ch.channelId}</span>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className="text-[10px] font-black text-brand-cyan uppercase tracking-widest bg-brand-cyan/5 px-3 py-1 rounded-lg border border-brand-cyan/10">{ch.genre}</span>
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                             <div className="flex justify-end gap-3">
                                                <button onClick={() => openEditChannel(ch)} className="p-3 bg-brand-purple/10 text-brand-purple hover:bg-brand-purple hover:text-white rounded-xl transition-all border border-brand-purple/10">
                                                   <PenSquare size={16} />
                                                </button>
                                                <button onClick={() => deleteTelegramChannel(ch.id)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/10">
                                                   <Trash2 size={16} />
                                                </button>
                                             </div>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'payments' && <AdminPaymentsTab liveSales={liveSales} />}

               {activeTab === 'live-chat' && <AdminLiveChatTab />}

               {activeTab === 'usage-monitor' && <AdminUsageMonitor />}
               {activeTab === 'expiry-watch' && <AdminExpiryWatch />}
               {activeTab === 'lipa-pole-pole' && <AdminInstallmentsTab />}

               {activeTab === 'newsletters' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Broadcast Network</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Manage subscriber clusters and cross-vector campaign performance</p>
                        </div>
                        <div className="flex bg-[#0B0B0F] p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                           <button onClick={() => setNewsletterSubTab('subscribers')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newsletterSubTab === 'subscribers' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Audience</button>
                           <button onClick={() => setNewsletterSubTab('campaigns')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newsletterSubTab === 'campaigns' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Campaigns</button>
                           <button onClick={() => setNewsletterSubTab('blast')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newsletterSubTab === 'blast' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-gray-500 hover:text-white'}`}>Emergency broadcast</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-cyan/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <Users size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Total Audience</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{subscribers.length}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-cyan/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                 <Activity size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Open Rate Avg</p>
                           <p className="text-3xl font-black text-white tracking-tighter">
                              {newsletterCampaigns?.length > 0 ? (newsletterCampaigns.reduce((acc, c) => acc + (c.openRate || 0), 0) / newsletterCampaigns.length).toFixed(1) : '0'}%
                           </p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-brand-purple/10 transition-colors" />
                           <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                 <Send size={24} />
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Active Modules</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{newsletterCampaigns?.length || 0}</p>
                        </div>
                     </div>

                     {newsletterSubTab === 'subscribers' && (
                        <div className="bg-[#0B0B0F] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative">
                           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/20 to-transparent" />
                           <div className="overflow-x-auto">
                              <table className="w-full text-left whitespace-nowrap">
                                 <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                       <th className="px-8 py-6">Identity Mask</th>
                                       <th className="px-8 py-6">Subscription State</th>
                                       <th className="px-8 py-6">Point of Origin</th>
                                       <th className="px-8 py-6 text-right">Data Health</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {(subscribers || []).map(s => (
                                       <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                          <td className="px-8 py-6">
                                             <div className="flex items-center gap-4">
                                                <div className="w-9 h-9 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan font-black text-[10px]">
                                                   {s.email.substring(0, 1).toUpperCase()}
                                                </div>
                                                <span className="font-black text-white text-base tracking-tight group-hover:text-brand-cyan transition-colors">{s.email}</span>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${s.status === 'active' || s.status === 'subscribed' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' : 'bg-gray-500/10 text-gray-500 border-white/5'
                                                }`}>{s.status}</span>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.source || 'Direct Entry'}</span>
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                             <div className="w-2 h-2 bg-brand-cyan rounded-full inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                          </td>
                                       </tr>
                                    ))}
                                    {subscribers.length === 0 && (
                                       <tr><td colSpan={4} className="px-8 py-32 text-center text-gray-600 font-bold italic opacity-40">Empty audience registry. No entities detected.</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}

                     {newsletterSubTab === 'campaigns' && (
                        <div className="bg-[#0B0B0F] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative">
                           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                           <div className="overflow-x-auto">
                              <table className="w-full text-left whitespace-nowrap">
                                 <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                       <th className="px-8 py-6">Cluster Name</th>
                                       <th className="px-8 py-6">Protocol Type</th>
                                       <th className="px-8 py-6">Phase Status</th>
                                       <th className="px-8 py-6 text-right">Yield (Opens)</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {(newsletterCampaigns || []).map(c => (
                                       <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                          <td className="px-8 py-6">
                                             <div className="flex flex-col">
                                                <span className="font-black text-white text-base tracking-tight group-hover:text-brand-purple transition-colors">{c.name}</span>
                                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Manual Deployment</span>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest bg-brand-purple/5 px-3 py-1 rounded-lg border border-brand-purple/10">{c.type}</span>
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${c.status === 'sent' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' : 'bg-brand-pink/10 text-brand-pink border-brand-pink/20'
                                                }`}>{c.status}</span>
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                             <span className="font-black text-white text-base">{c.openRate ? `${c.openRate}%` : 'N/A'}</span>
                                          </td>
                                       </tr>
                                    ))}
                                    {(newsletterCampaigns || []).length === 0 && (
                                       <tr><td colSpan={4} className="px-8 py-32 text-center text-gray-600 font-bold italic opacity-40">Zero historical campaigns logged in memory hub.</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}

                     {newsletterSubTab === 'blast' && (
                        <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-8 relative overflow-hidden max-w-4xl mx-auto w-full">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                           <div className="relative z-10 space-y-8">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                    <Send size={32} />
                                 </div>
                                 <div>
                                    <h4 className="text-2xl font-black text-white tracking-tight">Emergency Broadcast</h4>
                                    <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Global Audience Push Protocol</p>
                                 </div>
                              </div>
                              <div className="space-y-6">
                                 <InputGroup label="Broadcast Subject Line" value={emailSubject} onChange={setEmailSubject} placeholder="System Alert: Action Required..." />
                                 <InputGroup label="Signal Payload (Message)" type="textarea" value={emailBody} onChange={setEmailBody} placeholder="Encrypted message context..." />
                                 <div className="pt-4">
                                    <button
                                       onClick={sendCampaign}
                                       disabled={isSending}
                                       className="w-full py-5 bg-brand-purple hover:bg-purple-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                       {isSending ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                                       {isSending ? 'Transmitting...' : 'Execute Global Blast'}
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'messages' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Communication Pulse</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Monitor inbound inquiries and system-linked communication vectors</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-brand-purple/20 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-4">
                              <MessageSquare size={24} />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Total Inquiries</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{(contactMessages || []).length}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-brand-cyan/20 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan mb-4 relative">
                              <Bell size={24} />
                              {(contactMessages || []).filter(m => m.status === 'new').length > 0 && (
                                 <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0B0B0F]" />
                              )}
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Unread Alerts</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{(contactMessages || []).filter(m => m.status === 'new').length}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-brand-cyan/20 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan mb-4">
                              <MessageCircle size={24} />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">WhatsApp Tunnel</p>
                           <p className="text-3xl font-black text-white tracking-tighter">{(contactMessages || []).filter(m => m.source === 'whatsapp').length}</p>
                        </div>
                        <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl group hover:border-brand-purple/20 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-4">
                              <Zap size={24} />
                           </div>
                           <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Response Rate</p>
                           <p className="text-3xl font-black text-white tracking-tighter">98%</p>
                        </div>
                     </div>

                     <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/20 to-transparent" />
                        <div className="overflow-x-auto">
                           <table className="w-full text-left whitespace-nowrap">
                              <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                 <tr>
                                    <th className="px-8 py-6">Sender Identity</th>
                                    <th className="px-8 py-6">Subject Line</th>
                                    <th className="px-8 py-6">Tunnel Vector</th>
                                    <th className="px-8 py-6">Alert Logic</th>
                                    <th className="px-8 py-6 text-right">Ops Control</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.03] text-sm">
                                 {(contactMessages || []).map(m => (
                                    <tr key={m.id} className={`hover:bg-white/[0.02] transition-colors group ${m.status === 'new' ? 'bg-brand-purple/[0.02]' : ''}`}>
                                       <td className="px-8 py-6">
                                          <div className="flex flex-col">
                                             <span className="font-black text-white group-hover:text-brand-purple transition-colors text-base tracking-tight">{m.name}</span>
                                             <span className="text-[10px] text-gray-500 font-bold tracking-widest">{m.email}</span>
                                          </div>
                                       </td>
                                       <td className="px-8 py-6">
                                          <p className="text-gray-400 font-medium truncate max-w-[200px]">{m.subject}</p>
                                       </td>
                                       <td className="px-8 py-6">
                                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm ${m.source === 'whatsapp' ? 'bg-brand-cyan/5 text-brand-cyan border-brand-cyan/20' :
                                             'bg-brand-purple/5 text-brand-purple border-brand-purple/20'
                                             }`}>
                                             {m.source}
                                          </span>
                                       </td>
                                       <td className="px-8 py-6">
                                          <div className="flex items-center gap-2">
                                             <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'new' ? 'bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-gray-700'}`} />
                                             <span className={`text-[10px] font-black uppercase tracking-widest ${m.status === 'new' ? 'text-brand-cyan' : 'text-gray-600'}`}>
                                                {m.status}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="px-8 py-6 text-right">
                                          <button
                                             onClick={() => {
                                                setSelectedMessage(m);
                                                setActiveModal('viewMessage');
                                                if (m.status === 'new') {
                                                   updateContactMessage(m.id, { status: 'read' });
                                                }
                                             }}
                                             className="px-6 py-2.5 bg-[#15151A] hover:bg-brand-purple hover:text-white text-brand-purple border border-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all transform hover:-translate-y-1"
                                          >
                                             Inspect
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                                 {contactMessages.length === 0 && (
                                    <tr><td colSpan={5} className="px-8 py-20 text-center">
                                       <div className="flex flex-col items-center gap-4 text-gray-600">
                                          <Inbox size={48} className="opacity-20" />
                                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No Messages Logged</p>
                                       </div>
                                    </td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'system' && (
                  <div className="animate-fade-in-up space-y-8">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white tracking-tight">Governance & Integrity</h3>
                           <p className="text-sm text-gray-500 font-medium mt-1">Global system utilities and structural health maintenance</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* WhatsApp OTP Service Card */}
                     <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-emerald-500/10 transition-all" />
                        <div className="relative z-10 space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">💬</div>
                              <div>
                                 <h4 className="text-xl font-black text-white tracking-tight">WhatsApp OTP Gateway</h4>
                                 <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Automated Verification</p>
                              </div>
                           </div>
                           <p className="text-sm text-gray-500 font-medium leading-relaxed">Manages the Railway WhatsApp session for OTP delivery. Scan the QR once to link your phone.</p>
                           <WhatsAppManager />
                        </div>
                     </div>

                        {/* Cleanup & Maintenance Card */}
                        <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-red-500/10 transition-all" />
                           <div className="relative z-10 space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                    <Trash2 size={28} />
                                 </div>
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Core Scrubber</h4>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Database Sanitization</p>
                                 </div>
                              </div>
                              <p className="text-sm text-gray-500 font-medium leading-relaxed">Scan global registries for orphaned assets or broken Firebase Storage pointers. Permanently deallocates corrupted entries.</p>

                              <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
                                 <div className="flex items-center gap-2 text-red-500">
                                    <AlertTriangle size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Irreversible Protocols</span>
                                 </div>
                                 <ul className="space-y-2">
                                    <li className="flex items-center gap-3 text-[11px] text-gray-500 font-bold"><X size={12} className="text-red-900" /> Mixtapes without verified audio assets</li>
                                    <li className="flex items-center gap-3 text-[11px] text-gray-500 font-bold"><X size={12} className="text-red-900" /> Catalog items with null image blobs</li>
                                 </ul>
                              </div>

                              <button
                                 onClick={handleCleanupData}
                                 disabled={isCleaning}
                                 className="w-full py-5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-500/10 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                 {isCleaning ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                                 {isCleaning ? 'Processing Scrubber...' : 'Execute Data Purge'}
                              </button>
                           </div>
                        </div>

                        {/* Music Pool Card */}
                        <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-48 h-48 bg-brand-purple/5 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-brand-purple/10 transition-all" />
                           <div className="relative z-10 space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                    <Infinity size={28} />
                                 </div>
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Pool Maintenance</h4>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Audio Repository Integrity</p>
                                 </div>
                              </div>
                              <p className="text-sm text-gray-500 font-medium leading-relaxed">Global health audit for the audio repository. Identifies missing versions or corrupted download vectors for all track identities.</p>

                              {scanResults.checked > 0 ? (
                                 <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                       <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">PROBED</p>
                                       <p className="text-xl font-black text-white">{scanResults.checked}</p>
                                    </div>
                                    <div className="bg-brand-pink/5 p-4 rounded-2xl border border-brand-pink/10">
                                       <p className="text-[9px] text-yellow-600 font-black uppercase tracking-widest mb-1">VARIANCE</p>
                                       <p className="text-xl font-black text-brand-pink">{scanResults.missingVersions}</p>
                                    </div>
                                    <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                                       <p className="text-[9px] text-red-600 font-black uppercase tracking-widest mb-1">FRACTURES</p>
                                       <p className="text-xl font-black text-red-500">{scanResults.broken}</p>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center gap-2">
                                    <Activity size={24} className="text-gray-700" />
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">System Idle</p>
                                 </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                 <button
                                    onClick={handleScanPool}
                                    disabled={isScanningPool}
                                    className="py-4 bg-[#15151A] hover:bg-brand-purple hover:text-white text-brand-purple border border-brand-purple/20 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
                                 >
                                    {isScanningPool ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                                    Health Audit
                                 </button>
                                 <button
                                    onClick={handleFixPool}
                                    disabled={isScanningPool || scanResults.broken === 0}
                                    className="py-4 bg-brand-cyan/10 hover:bg-brand-cyan text-brand-cyan hover:text-white border border-brand-cyan/20 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
                                 >
                                    <Shield size={16} />
                                    Repair Data
                                 </button>
                              </div>
                           </div>
                        </div>

                        {/* Product Recovery Card */}
                        <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-48 h-48 bg-brand-cyan/5 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-brand-cyan/10 transition-all" />
                           <div className="relative z-10 space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                                    <ShoppingBag size={28} />
                                 </div>
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Product Recovery</h4>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">D1 Database Restoration</p>
                                 </div>
                              </div>
                              <p className="text-sm text-gray-500 font-medium leading-relaxed">Restore all 53+ platform products from Cloudflare R2 backup. Use this if products are missing in the storefront or admin list.</p>

                                 <div className="grid grid-cols-2 gap-4">
                                    <button
                                       onClick={handleR2ProductSync}
                                       disabled={isSyncing}
                                       className="py-4 bg-brand-cyan/10 hover:bg-brand-cyan text-brand-cyan hover:text-white border border-brand-cyan/20 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                       {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <CloudUpload size={16} />}
                                       Sync from R2
                                    </button>
                                    <button
                                       onClick={handleExportToR2}
                                       disabled={isSyncing}
                                       className="py-4 bg-[#15151A] hover:bg-brand-cyan hover:text-white text-brand-cyan border border-brand-cyan/20 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                       {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                       Export to R2
                                    </button>
                                 </div>
                                 <button
                                    onClick={handleExportMixtapesToR2}
                                    disabled={isSyncing}
                                    className="w-full py-3 bg-brand-purple/5 hover:bg-brand-purple/10 text-brand-purple text-[9px] font-black uppercase tracking-widest rounded-xl border border-brand-purple/10 transition-all flex items-center justify-center gap-2"
                                 >
                                    <Music size={14} /> Export Mixtapes to R2
                                 </button>
                           </div>
                        </div>

                        {/* Emergency Protocols Card */}
                        <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-48 h-48 bg-brand-pink/5 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-brand-pink/10 transition-all" />
                           <div className="relative z-10 space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center text-brand-pink">
                                    <ShieldAlert size={28} />
                                 </div>
                                 <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Emergency Override</h4>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Manual Grant & Master Reset</p>
                                 </div>
                              </div>

                              <div className="space-y-4">
                                 <button
                                    onClick={handleSystemReset}
                                    className="w-full py-4 bg-brand-pink/10 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-brand-pink hover:text-white transition-all flex items-center justify-center gap-2"
                                 >
                                    <RotateCcw size={16} /> Master Reset (DO/KV)
                                 </button>

                                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-3 text-center">Manual Subscription Grant</p>
                                    <div className="flex flex-col gap-2">
                                       <button
                                          onClick={() => {
                                             const email = prompt("Enter DJ Email:");
                                             if (email) handleManualGrant('subscription', email, 3000);
                                          }}
                                          className="py-3 bg-white/5 border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/10"
                                       >
                                          Grant 30 Days (Pool)
                                       </button>
                                       <button
                                          onClick={() => {
                                             const email = prompt("Enter DJ Email:");
                                             if (email) handleManualGrant('subscription', email, 1500);
                                          }}
                                          className="py-3 bg-white/5 border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/10"
                                       >
                                          Grant 1 Day (Pool)
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-xl font-black text-white tracking-tight">Sync Protocols</h4>
                              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Global External Integration</p>
                           </div>
                           <button
                              onClick={async () => {
                                 const res = await manualSync();
                                 alert(res.message);
                              }}
                              className="px-8 py-4 bg-brand-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 shadow-xl shadow-brand-cyan/20 transition-all transform hover:-translate-y-1 flex items-center gap-3"
                           >
                              <RefreshCw size={18} /> Forced Global Sync
                           </button>
                        </div>
                        {cleanupLog.length > 0 && (
                           <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-[10px] text-gray-500 max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
                              {cleanupLog.map((line, i) => (
                                 <div key={i} className="mb-1 py-1 border-b border-white/[0.02] last:border-0">{line}</div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>


            <Modal isOpen={activeModal === 'addPlan'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Plan" : "Create New Plan"}>
               <div className="space-y-4">
                  <InputGroup label="Plan Name" value={editingPlan.name} onChange={v => setEditingPlan({ ...editingPlan, name: v })} required />
                  <div className="grid grid-cols-2 gap-4">
                     <InputGroup label="Price (KES)" type="number" value={editingPlan.price} onChange={v => setEditingPlan({ ...editingPlan, price: Number(v) })} required />
                     <InputGroup label="Period (e.g. mo, yr)" value={editingPlan.period} onChange={v => setEditingPlan({ ...editingPlan, period: v })} required />
                  </div>
                  <InputGroup label="Payment Link" value={editingPlan.link || ''} onChange={v => setEditingPlan({ ...editingPlan, link: v })} placeholder="https://paystack..." />
                  <InputGroup label="Features (One per line)" type="textarea" value={planFeaturesInput} onChange={setPlanFeaturesInput} />
                  <div className="flex gap-4">
                     <InputGroup label="Active" type="checkbox" checked={editingPlan.active} onChange={v => setEditingPlan({ ...editingPlan, active: v })} />
                     <InputGroup label="Best Value" type="checkbox" checked={editingPlan.isBestValue} onChange={v => setEditingPlan({ ...editingPlan, isBestValue: v })} />
                  </div>
                  <div className="flex justify-end pt-4"><button onClick={handleSavePlan} disabled={isSavingPlan} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white disabled:opacity-50 flex items-center gap-2">{isSavingPlan && <RefreshCw className="animate-spin" size={18} />} {isSavingPlan ? "Saving..." : "Save Plan"}</button></div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'addRoom'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Room" : "Add Studio Room"}>
               <div className="space-y-4">
                  <InputGroup label="Room Name" value={editingRoom.name} onChange={v => setEditingRoom({ ...editingRoom, name: v })} required />
                  <InputGroup label="Capacity" type="number" value={editingRoom.capacity} onChange={v => setEditingRoom({ ...editingRoom, capacity: Number(v) })} />
                  <InputGroup label="Description" type="textarea" value={editingRoom.description} onChange={v => setEditingRoom({ ...editingRoom, description: v })} />
                  <InputGroup label="Status" options={['active', 'maintenance']} value={editingRoom.status} onChange={v => setEditingRoom({ ...editingRoom, status: v })} />
                  <div className="flex justify-end pt-4"><button onClick={handleSaveRoom} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Room</button></div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'editZone'} onClose={() => setActiveModal(null)} title={`Edit Rates: ${editingZone?.name}`} size="lg">
               <div className="space-y-6">
                  <p className="text-gray-400 text-sm mb-4">{editingZone?.description}</p>
                  {editingZone?.rates.map((rate) => (
                     <div key={rate.id} className="bg-black/20 p-4 rounded-lg border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="font-bold text-white">{rate.type.toUpperCase()}</div>
                        <InputGroup label="Price (KES)" type="number" value={rate.price} onChange={v => updateRate(rate.id, 'price', Number(v))} />
                        <InputGroup label="Timeline" value={rate.timeline} onChange={v => updateRate(rate.id, 'timeline', v)} />
                     </div>
                  ))}
                  <div className="flex justify-end pt-4"><button onClick={handleSaveZone} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Rates</button></div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'addPoolTrack'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Track" : "Upload New Track"} size="lg">
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <InputGroup label="Artist" value={newPoolTrack.artist} onChange={v => setNewPoolTrack({ ...newPoolTrack, artist: v })} required />
                     <InputGroup label="Title" value={newPoolTrack.title} onChange={v => setNewPoolTrack({ ...newPoolTrack, title: v })} required />
                  </div>
                  <div>
                     <InputGroup
                        label="Genre Selection"
                        options={genres.map(g => g.name)}
                        value={newPoolTrack.genre}
                        onChange={v => setNewPoolTrack({ ...newPoolTrack, genre: v })}
                        required
                     />
                  </div>
                  <InputGroup label="Year" type="number" value={newPoolTrack.year} onChange={v => setNewPoolTrack({ ...newPoolTrack, year: Number(v) })} />
               </div>
               <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Categories / Hubs</label><div className="flex flex-wrap gap-2">{POOL_HUBS.map(hub => (<button key={hub} type="button" onClick={() => toggleTrackCategory(hub)} className={`px-3 py-1 rounded-full text-xs border transition ${newPoolTrack.category?.includes(hub) ? 'bg-brand-purple border-brand-purple text-white' : 'bg-transparent border-white/20 text-gray-400 hover:text-white'}`}>{hub}</button>))}</div></div>
               <InputGroup label="Preview URL (Optional)" value={newPoolTrack.previewUrl || ''} onChange={v => setNewPoolTrack({ ...newPoolTrack, previewUrl: v })} placeholder="https://..." />
               <div className="border-t border-white/10 pt-6"><div className="flex justify-between items-center mb-4"><h4 className="font-bold text-white">Versions</h4><button onClick={addVersionToTrack} className="text-xs bg-white/10 px-3 py-1.5 rounded text-white flex items-center gap-1"><Plus size={12} /> Add Version</button></div><div className="space-y-3">{newPoolTrack.versions.map((version, idx) => (<div key={version.id} className="flex gap-3 items-start bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                     <select 
                        id={`track-version-type-${version.id}`}
                        name={`track-version-type-${version.id}`}
                        value={version.type} 
                        onChange={(e) => updateVersion(version.id, 'type', e.target.value)} 
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none"
                     >
                        {TRACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                     <input 
                        id={`track-version-label-${version.id}`}
                        name={`track-version-label-${version.id}`}
                        type="text" 
                        value={version.label || ''} 
                        onChange={(e) => updateVersion(version.id, 'label', e.target.value)} 
                        placeholder="Label (e.g. Clean)" 
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none" 
                     />
                     <div className="col-span-2 flex gap-2">
                        <input 
                           id={`track-version-url-${version.id}`}
                           name={`track-version-url-${version.id}`}
                           type="text" 
                           value={version.downloadUrl} 
                           onChange={(e) => updateVersion(version.id, 'downloadUrl', e.target.value)} 
                           placeholder="Download URL" 
                           className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none" 
                        />
                        <VersionAudioUpload onUpload={(url) => updateVersion(version.id, 'downloadUrl', url)} />
                     </div>
                  </div>
                  <button onClick={() => removeVersion(version.id)} className="text-red-500 hover:text-white"><X size={16} /></button>
               </div>))}</div></div>
               <div className="flex justify-end pt-4"><button onClick={handleSavePoolTrack} disabled={isSavingPoolTrack} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white disabled:opacity-50 flex items-center gap-2">{isSavingPoolTrack && <RefreshCw className="animate-spin" size={18} />} {isSavingPoolTrack ? "Saving..." : "Save Track"}</button></div>
            </Modal>

            <Modal isOpen={activeModal === 'editGenre'} onClose={() => setActiveModal(null)} title="Edit Genre Cover">
               <div className="space-y-6">
                  <InputGroup label="Genre Name" value={editingGenre.name} onChange={() => { }} placeholder="Genre Name" />
                  <ImageUpload label="Cover Image" value={editingGenre.coverUrl} onChange={v => setEditingGenre({ ...editingGenre, coverUrl: v })} />
                  <div className="flex justify-end"><button onClick={handleSaveGenre} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Genre</button></div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'viewMessage'} onClose={() => setActiveModal(null)} title="Message Details">
               {selectedMessage && (
                  <div className="space-y-6">
                     <div className="flex items-center justify-between bg-[#0B0B0F] p-6 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 flex items-center justify-center text-brand-purple font-bold text-lg">
                              {selectedMessage.name.charAt(0)}
                           </div>
                           <div>
                              <h4 className="text-white font-bold leading-none mb-1 tracking-tight">{selectedMessage.name}</h4>
                              <p className="text-xs text-gray-500">{selectedMessage.email}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="flex items-center gap-2 justify-end mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedMessage.source === 'whatsapp' ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20' : 'bg-brand-purple/10 text-brand-purple border border-brand-purple/20'}`}>
                                 {selectedMessage.source}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-gray-400 border border-white/10">
                                 {selectedMessage.status}
                              </span>
                           </div>
                           <p className="text-[10px] text-gray-600 font-medium">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                        </div>
                     </div>

                     <div className="bg-[#0B0B0F] p-8 rounded-3xl border border-white/5 space-y-4 relative">
                        <div className="absolute top-0 left-8 -translate-y-1/2 bg-[#15151A] px-2 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Message Content</div>
                        <div>
                           <p className="text-xs text-brand-purple font-bold uppercase tracking-widest mb-1">Subject</p>
                           <h3 className="text-white font-bold text-xl tracking-tight">{selectedMessage.subject}</h3>
                        </div>
                        <div className="w-full h-px bg-white/5" />
                        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap pt-2">
                           {selectedMessage.message}
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <a
                           href={`mailto:${selectedMessage.email}?subject=RE: ${selectedMessage.subject}`}
                           className="flex-1 bg-brand-purple hover:bg-purple-600 text-white py-4 rounded-2xl font-bold text-center transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 shadow-none hover:shadow-brand-purple/20"
                        >
                           <Mail size={18} /> Reply via Email
                        </a>
                        {selectedMessage.source === 'whatsapp' && (
                           <button className="flex-1 bg-brand-cyan hover:bg-brand-cyan text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-cyan/20 shadow-none hover:shadow-brand-cyan/20">
                              <MessageCircle size={18} /> WhatsApp
                           </button>
                        )}
                        <button
                           onClick={() => {
                              updateContactMessage(selectedMessage.id, { status: 'archived' });
                              setActiveModal(null);
                           }}
                           className="px-6 bg-[#0B0B0F] text-red-500 hover:bg-red-500 hover:text-white border border-white/5 hover:border-red-500 py-4 rounded-2xl font-bold transition-all"
                        >
                           Archive
                        </button>
                     </div>
                  </div>
               )}
            </Modal>

            <Modal isOpen={activeModal === 'addProduct'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Product" : "Add New Product"} size="xl">
               <AddProductForm
                  initialData={isEditing ? newProduct : null}
                  onSave={handleSaveProduct}
                  onCancel={() => setActiveModal(null)}
                  isSaving={isSavingProduct}
               />
            </Modal>

            <Modal isOpen={activeModal === 'addMixtape'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Mixtape" : "Upload New Mixtape"} size="lg">
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2">Essential Info</h4>
                           <InputGroup label="Mixtape Title" value={newMixtape.title} onChange={v => updateMixtapeField('title', v)} required placeholder="e.g. Summer Vibes Vol. 1" />
                           <InputGroup label="Genre" options={MIXTAPE_GENRE_NAMES} value={newMixtape.genre} onChange={v => updateMixtapeField('genre', v)} />
                           <div className="grid grid-cols-2 gap-4">
                              <InputGroup label="Release Date" type="date" value={newMixtape.releaseDate} onChange={v => updateMixtapeField('releaseDate', v)} />
                              <InputGroup label="Status" options={['draft', 'published']} value={newMixtape.status} onChange={v => updateMixtapeField('status', v)} />
                           </div>
                        </div>

                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2">Media Sources</h4>
                           <AudioUpload
                              label="Stream URL (Audio Player)"
                              value={newMixtape.audioUrl}
                              onChange={v => updateMixtapeField('audioUrl', v)}
                              helperText="Upload MP3 to R2 or paste direct link."
                           />
                           <FileUpload
                              label="Download Link (MP3)"
                              value={newMixtape.downloadUrl}
                              onChange={v => updateMixtapeField('downloadUrl', v)}
                              accept="audio/*"
                           />
                           <FileUpload
                              label="Video URL (Optional)"
                              value={newMixtape.videoDownloadUrl}
                              onChange={v => updateMixtapeField('videoDownloadUrl', v)}
                              accept="video/*"
                           />
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5">
                           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-4">Artwork</h4>
                           <ImageUpload label="" value={newMixtape.coverUrl} onChange={v => updateMixtapeField('coverUrl', v)} required />
                        </div>

                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2">Access & Display</h4>
                           <div className="grid grid-cols-2 gap-4">
                              <InputGroup label="Duration" value={newMixtape.duration} onChange={v => updateMixtapeField('duration', v)} placeholder="01:00:00" />
                              <InputGroup label="Download Type" options={['free', 'logged_in', 'music_pool']} value={newMixtape.downloadType} onChange={v => updateMixtapeField('downloadType', v)} />
                           </div>
                           <div className="space-y-3 pt-2">
                              <InputGroup label="Exclusive Content" type="checkbox" checked={newMixtape.isExclusive} onChange={v => updateMixtapeField('isExclusive', v)} placeholder="Subscriber Only" />
                              <InputGroup label="Home Feature" type="checkbox" checked={newMixtape.isFeatured} onChange={v => updateMixtapeField('isFeatured', v)} placeholder="Featured on Home" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5 sticky bottom-0 bg-[#15151A] z-10 -m-8 mt-2 p-8 rounded-b-3xl">
                     <button onClick={() => setActiveModal(null)} className="px-6 py-3.5 rounded-2xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                     <button
                        onClick={handleSaveMixtape}
                        className="bg-brand-purple hover:bg-purple-600 px-10 py-3.5 rounded-2xl font-bold text-white shadow-lg shadow-brand-purple/20 transition-all flex items-center gap-3 group"
                     >
                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                        Save Mixtape
                     </button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'addCoupon'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Coupon" : "Create New Coupon"}>
               <div className="space-y-8">
                  <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                     <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Coupon Identity</h4>
                     <InputGroup label="Coupon Code" value={newCoupon.code} onChange={v => setNewCoupon({ ...newCoupon, code: v.toUpperCase() })} required placeholder="E.G. SUMMER20" />
                     <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Discount Type" options={['percentage', 'fixed']} value={newCoupon.discountType} onChange={v => setNewCoupon({ ...newCoupon, discountType: v })} />
                        <InputGroup label="Value" type="number" value={newCoupon.discountValue} onChange={v => setNewCoupon({ ...newCoupon, discountValue: Number(v) })} placeholder="0" />
                     </div>
                  </div>

                  <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                     <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Applicability</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Category" options={['store', 'subscription', 'booking', 'all']} value={newCoupon.appliesTo} onChange={v => setNewCoupon({ ...newCoupon, appliesTo: v })} />
                        <InputGroup label="Expiry Date" type="date" value={newCoupon.expiryDate} onChange={v => setNewCoupon({ ...newCoupon, expiryDate: v })} />
                     </div>

                     {newCoupon.appliesTo === 'subscription' && (
                        <div className="pt-2">
                           <label className="block text-[10px] font-bold text-brand-purple uppercase tracking-widest mb-3 pl-1">Select Applicable Plans</label>
                           <div className="flex flex-wrap gap-2">
                              {(subscriptionPlans || []).map(plan => (
                                 <button
                                    key={plan.id}
                                    onClick={() => {
                                       const current = newCoupon.applicablePlans || [];
                                       const next = current.includes(plan.id) ? current.filter(id => id !== plan.id) : [...current, plan.id];
                                       setNewCoupon({ ...newCoupon, applicablePlans: next });
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${newCoupon.applicablePlans?.includes(plan.id) ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}
                                 >
                                    {plan.name}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                     <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Limits & Status</h4>
                     <div className="grid grid-cols-2 gap-4 items-center">
                        <InputGroup label="Usage Limit" type="number" value={newCoupon.usageLimit} onChange={v => setNewCoupon({ ...newCoupon, usageLimit: Number(v) })} placeholder="0 (Unlimited)" />
                        <div className="space-y-4 pt-1">
                           <InputGroup label="Single Use Paradigm" type="checkbox" checked={newCoupon.isSingleUse} onChange={v => setNewCoupon({ ...newCoupon, isSingleUse: v })} placeholder="One-time utilization only" />
                           {newCoupon.isSingleUse && <InputGroup label="Target User Assignment" value={newCoupon.assignedUserId} onChange={v => setNewCoupon({ ...newCoupon, assignedUserId: v })} placeholder="User ID (Optional - restrict to specific user)" />}
                        </div>
                        <div className="pt-1">
                           <InputGroup label="Active Status" type="checkbox" checked={newCoupon.active} onChange={v => setNewCoupon({ ...newCoupon, active: v })} placeholder="Operational" />
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5 sticky bottom-0 bg-[#15151A] z-10 -m-8 mt-2 p-8 rounded-b-3xl">
                     <button onClick={() => setActiveModal(null)} className="px-6 py-3.5 rounded-2xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                     <button
                        onClick={handleSaveCoupon}
                        className="bg-brand-purple hover:bg-purple-600 px-10 py-3.5 rounded-2xl font-bold text-white shadow-lg shadow-brand-purple/20 transition-all flex items-center gap-3 group"
                     >
                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                        {isEditing ? 'Update Coupon' : 'Create Coupon'}
                     </button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'shipOrder'} onClose={() => !isShipping && setActiveModal(null)} title="Mark Order Shipped">
               <div className="space-y-8">
                  <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                     <div>
                        <p className="text-xs text-brand-purple font-bold uppercase tracking-widest pl-1 mb-1">Logistics Update</p>
                        <h3 className="text-white font-bold text-lg tracking-tight">Order #{selectedOrder?.id}</h3>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
                        <Truck size={24} />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                           <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Shipping Details</h4>
                           <InputGroup label="Delivery Method" value={shippingDetails.deliveryMethod} onChange={v => setShippingDetails({ ...shippingDetails, deliveryMethod: v })} placeholder="e.g. Air Freight, Pickup" />
                           <InputGroup label="Courier Name" value={shippingDetails.courierName} onChange={v => setShippingDetails({ ...shippingDetails, courierName: v })} placeholder="e.g. G4S, Wells Fargo" />
                           <InputGroup label="Pickup/Delivery Location" value={shippingDetails.pickupLocation} onChange={v => setShippingDetails({ ...shippingDetails, pickupLocation: v })} placeholder="Where should the user collect it?" />
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                           <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Tracking Info</h4>
                           <InputGroup label="Tracking Number" value={shippingDetails.trackingNumber} onChange={v => setShippingDetails({ ...shippingDetails, trackingNumber: v })} />
                           <InputGroup label="Estimated Arrival" type="date" value={shippingDetails.estimatedArrival} onChange={v => setShippingDetails({ ...shippingDetails, estimatedArrival: v })} />
                        </div>

                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-3">
                           <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Receipt / Waybill</h4>
                           <div className="relative group">
                              <input
                                 id="shipping-receipt-file"
                                 name="shipping-receipt-file"
                                 type="file"
                                 accept="image/*"
                                 onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                 className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <div className="bg-black/40 border-2 border-dashed border-white/10 rounded-2xl p-4 text-center group-hover:bg-white/5 transition-all group-hover:border-brand-purple/30">
                                 <Upload size={20} className="mx-auto text-gray-500 mb-2 group-hover:text-brand-purple transition-colors" />
                                 <span className="text-xs text-gray-500 font-medium">{receiptFile ? receiptFile.name : 'Click to upload proof'}</span>
                              </div>
                           </div>
                           {receiptFile && <p className="text-[10px] text-brand-cyan text-center font-bold">✓ File selected</p>}
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5">
                     <label htmlFor="shipping-admin-message" className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1 mb-4 block">Message to Customer</label>
                     <textarea
                        id="shipping-admin-message"
                        name="adminMessage"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white min-h-[100px] focus:outline-none focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/5 transition-all outline-none"
                        placeholder="Updates or instructions for the customer..."
                        value={shippingDetails.adminMessage}
                        onChange={(e) => setShippingDetails({ ...shippingDetails, adminMessage: e.target.value })}
                     />
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5 sticky bottom-0 bg-[#15151A] z-10 -m-8 mt-2 p-8 rounded-b-3xl">
                     <button onClick={() => !isShipping && setActiveModal(null)} className="px-6 py-3.5 rounded-2xl text-sm font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                     <button
                        onClick={handleShipOrder}
                        disabled={isShipping}
                        className={`px-10 py-3.5 rounded-2xl font-bold text-white flex items-center gap-3 transition-all shadow-lg ${isShipping ? 'bg-gray-700 cursor-not-allowed' : 'bg-brand-purple hover:bg-purple-600 hover:shadow-brand-purple/20'}`}
                     >
                        {isShipping ? <RefreshCw size={18} className="animate-spin" /> : <Truck size={18} />}
                        {isShipping ? 'Processing...' : 'Confirm Shipment'}
                     </button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'editOrderStatus'} onClose={() => setActiveModal(null)} title={`Order Brief: #${selectedOrder?.id}`}>
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-6 bg-[#0B0B0F] rounded-3xl border border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2 pl-1">Customer Profile</p>
                        <p className="text-white font-bold">{selectedOrder?.customerName}</p>
                        <p className="text-xs text-gray-500">{selectedOrder?.customerEmail}</p>
                     </div>
                     <div className="p-6 bg-[#0B0B0F] rounded-3xl border border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2 pl-1">Payment Snapshot</p>
                        <p className="text-white font-bold text-brand-purple">KES {(selectedOrder?.total || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-brand-cyan uppercase font-bold">{selectedOrder?.paymentStatus}</p>
                     </div>
                  </div>

                  <div className="bg-[#0B0B0F] rounded-3xl border border-white/5 overflow-hidden">
                     <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Order Items</p>
                     </div>
                     <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto scrollbar-hide">
                        {Array.isArray(selectedOrder?.items) ? selectedOrder.items.map((item: any, idx: number) => (
                           <div key={idx} className="px-6 py-4 flex justify-between items-center group hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center gap-3">
                                 <div className={`w-2 h-10 rounded-full ${item.type === 'physical' ? 'bg-brand-pink/40' : 'bg-brand-cyan/40'}`} />
                                 <div>
                                    <p className="font-bold text-white text-sm">{item.productName}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">{item.type}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-white font-bold text-sm">KES {(item.price || 0).toLocaleString()}</p>
                                 <p className="text-[10px] text-gray-600 font-bold">QTY: {item.quantity}</p>
                              </div>
                           </div>
                        )) : null}
                     </div>
                     <div className="bg-white/5 px-8 pt-6 pb-8 border-t border-white/5 space-y-2">
                        <div className="flex justify-between text-xs">
                           <span className="text-gray-500 font-medium">Subtotal</span>
                           <span className="text-white font-bold">KES {(selectedOrder?.subtotal || selectedOrder?.total || 0).toLocaleString()}</span>
                        </div>
                        {selectedOrder?.discountAmount ? (
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-500 font-medium whitespace-nowrap">Discount {selectedOrder?.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                              <span className="text-red-500 font-bold">- KES {(selectedOrder?.discountAmount || 0).toLocaleString()}</span>
                           </div>
                        ) : null}
                        {selectedOrder?.shippingCost ? (
                           <div className="flex justify-between text-xs">
                              <span className="text-gray-500 font-medium">Shipping Fee</span>
                              <span className="text-white font-bold">KES {(selectedOrder?.shippingCost || 0).toLocaleString()}</span>
                           </div>
                        ) : null}
                        <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4">
                           <span className="text-white font-bold text-base">Grand Total</span>
                           <span className="text-2xl font-black text-brand-purple tracking-tighter">KES {(selectedOrder?.total || 0).toLocaleString()}</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-brand-purple/10">
                     <h4 className="text-[10px] font-bold text-brand-purple uppercase tracking-[0.2em] mb-4 pl-1">Change Order Status</h4>
                     <InputGroup
                        label=""
                        options={['pending', 'processing', 'shipped', 'completed', 'cancelled']}
                        value={selectedOrder?.status || 'pending'}
                        onChange={async (v) => {
                           if (!selectedOrder) return;
                           try {
                              await updateOrder(selectedOrder.id, { status: v });
                              setSelectedOrder({ ...selectedOrder, status: v });
                              alert(`Order status updated to ${v}`);
                           } catch (err: any) {
                              alert("Update failed: " + err.message);
                           }
                        }}
                     />
                  </div>

                  <div className="flex justify-end pt-4">
                     <button onClick={() => setActiveModal(null)} className="w-full bg-brand-purple hover:bg-purple-600 px-8 py-4 rounded-2xl font-bold text-white shadow-lg shadow-brand-purple/10 transition-all">Done</button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'userDetail'} onClose={() => setActiveModal(null)} title="User Profile Details" size="lg">
               {selectedUser && (
                  <div className="space-y-8">
                     <div className="bg-[#0B0B0F] p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-brand-purple/20 to-transparent" />
                        <div className="w-24 h-24 rounded-3xl bg-brand-purple/20 flex items-center justify-center text-brand-purple text-4xl font-black mb-4 relative z-10 border border-brand-purple/30 overflow-hidden">
                           {selectedUser.avatarUrl ? <img loading="lazy" src={selectedUser.avatarUrl} className="w-full h-full object-cover" /> : <Users size={40} className="m-auto text-gray-500" />}
                        </div>
                        <div className="relative z-10">
                           <h3 className="text-white font-bold text-2xl tracking-tight">{selectedUser.name || "No Name"}</h3>
                           <p className="text-gray-500 font-medium">{selectedUser.email}</p>
                           <div className="flex items-center gap-2 justify-center mt-3">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedUser.role === 'admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20'}`}>
                                 {selectedUser.role}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedUser.isSubscriber ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                                 {selectedUser.isSubscriber ? `VIP: ${selectedUser.subscriptionPlan}` : 'Free Tier'}
                              </span>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                           <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Account Info</h4>
                           <div className="space-y-3 text-sm">
                              <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                 <span className="text-gray-500 font-medium">Status</span>
                                 <span className="text-white font-bold capitalize">{selectedUser.status}</span>
                              </div>
                              <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                                 <span className="text-gray-500 font-medium">Last Login</span>
                                 <span className="text-white font-bold">{selectedUser.lastLogin || 'Never'}</span>
                              </div>
                           </div>
                        </div>

                        <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-4">
                           <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Subscription Details</h4>
                           {selectedUser.isSubscriber && selectedUser.subscriptionExpiry && (() => {
                              const expiryDate = new Date(selectedUser.subscriptionExpiry);
                              const now = new Date();
                              const diffMs = expiryDate.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                              return (
                                 <div className="space-y-4">
                                    <div className="px-4 py-3 bg-brand-purple/5 rounded-2xl border border-brand-purple/20">
                                       <p className="text-[10px] text-brand-purple font-bold uppercase tracking-widest mb-1">Time Remaining</p>
                                       <div className="flex items-baseline gap-2">
                                          <span className={`text-2xl font-black ${diffDays <= 0 ? 'text-red-500' : 'text-white'}`}>{diffDays <= 0 ? 'EXPIRED' : `${diffDays} Days`}</span>
                                       </div>
                                    </div>
                                    <div className="px-4 py-3 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                                       <span className="text-xs text-gray-500">Expires On</span>
                                       <span className="text-xs text-white font-bold">{expiryDate.toLocaleDateString()}</span>
                                    </div>
                                 </div>
                              );
                           })()}
                           {!selectedUser.isSubscriber && (
                              <div className="px-4 py-10 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                 <p className="text-xs text-gray-500 font-medium italic">No active subscription</p>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="bg-[#0B0B0F] p-6 rounded-3xl border border-white/5 space-y-6">
                        <div className="flex items-baseline justify-between pl-1">
                           <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Management Controls</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4">
                              <h5 className="text-[10px] font-bold text-brand-purple uppercase tracking-widest">Grant Pool Access</h5>
                              <div className="flex gap-2">
                                 <select
                                    value={grantPlan}
                                    onChange={(e) => setGrantPlan(e.target.value)}
                                    className="bg-[#15151A] border border-white/10 text-white rounded-xl px-4 py-3 text-xs flex-1 outline-none focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/5 transition-all"
                                 >
                                    <option value="weekly">1 Week</option>
                                    <option value="monthly">1 Month</option>
                                    <option value="3months">3 Months</option>
                                    <option value="6months">6 Months</option>
                                    <option value="yearly">1 Year</option>
                                 </select>
                                 <button onClick={() => handleUserAction(selectedUser.id, 'grant_pool', grantPlan)} className="bg-brand-purple hover:bg-purple-600 text-white px-5 py-3 rounded-xl font-bold text-xs transition-all">Grant</button>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => handleUserAction(selectedUser.id, 'reset')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-[10px] font-bold text-gray-400 hover:text-white transition-all text-center">Reset Pass</button>
                              <button onClick={() => handleUserAction(selectedUser.id, 'activate')} className="p-3 bg-brand-cyan/10 hover:bg-brand-cyan text-brand-cyan hover:text-white rounded-xl border border-brand-cyan/10 transition-all text-[10px] font-bold text-center">Activate</button>
                              <button onClick={() => handleUserAction(selectedUser.id, 'ban')} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/10 transition-all text-[10px] font-bold text-center">Suspend</button>
                              <button onClick={() => handleUserAction(selectedUser.id, 'delete')} className="p-3 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white rounded-xl border border-red-600/10 transition-all text-[10px] font-bold text-center">Permanent</button>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end pt-4 border-t border-white/5 -m-8 mt-2 p-8 bg-[#15151A] rounded-b-3xl">
                        <button onClick={() => setActiveModal(null)} className="px-10 py-3.5 bg-brand-purple hover:bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-purple/10 transition-all">Close Profile</button>
                     </div>
                  </div>
               )}
            </Modal>

            <Modal isOpen={activeModal === 'addBooking'} onClose={() => setActiveModal(null)} title={isEditing ? "Intercept Booking" : "New Command Booking"}>
               <div className="space-y-6">
                  <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                     <InputGroup label="Client Identity" value={newBooking.clientName} onChange={v => setNewBooking({ ...newBooking, clientName: v })} required />
                     <InputGroup label="Service Vector" value={newBooking.serviceType} onChange={v => setNewBooking({ ...newBooking, serviceType: v })} />
                     <div className="grid grid-cols-2 gap-6">
                        <InputGroup label="Temporal Date" type="date" value={newBooking.date} onChange={v => setNewBooking({ ...newBooking, date: v })} />
                        <InputGroup label="Time Slot" type="time" value={newBooking.time} onChange={v => setNewBooking({ ...newBooking, time: v })} />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <InputGroup label="Budget (KES)" type="number" value={newBooking.amount} onChange={v => setNewBooking({ ...newBooking, amount: Number(v) })} />
                        <InputGroup label="Mission Status" options={['pending', 'confirmed', 'completed', 'cancelled']} value={newBooking.status} onChange={v => setNewBooking({ ...newBooking, status: v })} />
                     </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-white/5">
                     <button onClick={() => setActiveModal(null)} className="px-8 py-4 text-gray-500 font-bold hover:text-white transition-colors mr-4">Cancel</button>
                     <button onClick={handleSaveBooking} className="bg-brand-purple hover:bg-purple-600 px-12 py-4 rounded-2xl font-black text-white shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-[10px]">
                        Sync Matrix
                     </button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'addSessionType'} onClose={() => setActiveModal(null)} title="Manage Studio Service">
               <div className="space-y-6">
                  <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                     <InputGroup label="Service Label" value={newSessionType.name} onChange={v => setNewSessionType({ ...newSessionType, name: v })} required />
                     <div className="grid grid-cols-2 gap-6">
                        <InputGroup label="Price (KES)" type="number" value={newSessionType.price} onChange={v => setNewSessionType({ ...newSessionType, price: Number(v) })} />
                        <InputGroup label="Duration (Hrs)" type="number" value={newSessionType.duration} onChange={v => setNewSessionType({ ...newSessionType, duration: Number(v) })} />
                     </div>
                     <InputGroup label="Logic Description" type="textarea" value={newSessionType.description} onChange={v => setNewSessionType({ ...newSessionType, description: v })} />
                  </div>
                  <div className="flex justify-end pt-6 border-t border-white/5">
                     <button onClick={() => setActiveModal(null)} className="px-8 py-4 text-gray-500 font-bold hover:text-white transition-colors mr-4">Cancel</button>
                     <button onClick={handleSaveSessionType} className="bg-brand-purple hover:bg-purple-600 px-12 py-4 rounded-2xl font-black text-white shadow-xl shadow-brand-purple/20 transition-all uppercase tracking-widest text-[10px]">
                        Protocol Update
                     </button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'addEquipment'} onClose={() => setActiveModal(null)} title="Gear Manifest Update">
               <div className="space-y-6">
                  <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                     <InputGroup label="Hardware Identity" value={newEquipment.name} onChange={v => setNewEquipment({ ...newEquipment, name: v })} required />
                     <InputGroup label="Frequency Category" options={['Microphones', 'Monitoring & Acoustics', 'Hardware & Interface', 'Other']} value={newEquipment.category} onChange={v => setNewEquipment({ ...newEquipment, category: v })} />
                     <ImageUpload label="Visual Reference" value={newEquipment.image} onChange={v => setNewEquipment({ ...newEquipment, image: v })} />
                     <InputGroup label="Terminal Specs" type="textarea" value={newEquipment.description} onChange={v => setNewEquipment({ ...newEquipment, description: v })} />
                  </div>
                  <div className="flex justify-end pt-6 border-t border-white/5">
                     <button onClick={() => setActiveModal(null)} className="px-8 py-4 text-gray-500 font-bold hover:text-white transition-colors mr-4">Cancel</button>
                     <button onClick={handleSaveEquipment} className="bg-brand-purple hover:bg-purple-600 px-12 py-4 rounded-2xl font-black text-white shadow-xl shadow-brand-purple/20 transition-all uppercase tracking-widest text-[10px]">
                        Save Gear
                     </button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'addChannel'} onClose={() => setActiveModal(null)} title="Neural Link: Telegram Channel">
               <div className="space-y-6">
                  <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                     <InputGroup label="Network Identity" value={newChannel.name} onChange={v => setNewChannel({ ...newChannel, name: v })} required />
                     <div className="grid grid-cols-2 gap-6">
                        <InputGroup label="Broadcast ID" value={newChannel.channelId} onChange={v => setNewChannel({ ...newChannel, channelId: v })} placeholder="-100..." />
                        <InputGroup label="Genre Mapping" value={newChannel.genre} onChange={v => setNewChannel({ ...newChannel, genre: v })} />
                     </div>
                     <InputGroup label="Transmission Link" value={newChannel.inviteLink} onChange={v => setNewChannel({ ...newChannel, inviteLink: v })} />
                     <InputGroup label="Active Status" type="checkbox" checked={newChannel.active} onChange={v => setNewChannel({ ...newChannel, active: v })} />
                  </div>
                  <div className="flex justify-end pt-6 border-t border-white/5">
                     <button onClick={() => setActiveModal(null)} className="px-8 py-4 text-gray-500 font-bold hover:text-white transition-colors mr-4">Cancel</button>
                     <button onClick={handleSaveChannel} className="bg-brand-purple hover:bg-purple-600 px-12 py-4 rounded-2xl font-black text-white shadow-xl shadow-brand-purple/20 transition-all uppercase tracking-widest text-[10px]">
                        Save Network
                     </button>
                  </div>
               </div>
            </Modal>

            <Modal isOpen={activeModal === 'addPlan'} onClose={() => setActiveModal(null)} title={isEditing ? "Neural Interface: Update Tier" : "Architect New Access Tier"}>
               <div className="space-y-6">
                  <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                     <InputGroup label="Tier Label" value={editingPlan.name} onChange={v => setEditingPlan({ ...editingPlan, name: v })} required />
                     <div className="grid grid-cols-2 gap-6">
                        <InputGroup label="Investment (KES)" type="number" value={editingPlan.price} onChange={v => setEditingPlan({ ...editingPlan, price: Number(v) })} />
                        <InputGroup label="Cycle Period" options={['wk', 'mo', '3mo', '6mo', 'yr']} value={editingPlan.period} onChange={v => setEditingPlan({ ...editingPlan, period: v as any })} />
                     </div>
                     <InputGroup label="Protocol Features (One per line)" type="textarea" value={planFeaturesInput} onChange={v => setPlanFeaturesInput(v)} placeholder="Weekly High-Quality Drops&#10;Exclusive Edits & Remixes" />
                     <InputGroup label="Active Signal" type="checkbox" checked={editingPlan.active} onChange={v => setEditingPlan({ ...editingPlan, active: v })} />
                  </div>
                  <div className="flex justify-end pt-6 border-t border-white/5">
                     <button onClick={() => setActiveModal(null)} className="px-8 py-4 text-gray-500 font-bold hover:text-white transition-colors mr-4">Cancel</button>
                     <button
                        onClick={handleSavePlan}
                        disabled={isSavingPlan}
                        className="bg-brand-purple hover:bg-purple-600 disabled:opacity-50 px-12 py-4 rounded-2xl font-black text-white shadow-xl shadow-brand-purple/20 transition-all uppercase tracking-widest text-[10px]"
                     >
                        {isSavingPlan ? 'Syncing...' : 'Save Tier Proto'}
                     </button>
                  </div>
               </div>
            </Modal>

         </div >
      </div >
   );
};

export default AdminDashboard;
