

import React, { useState, useMemo } from 'react';
import { 
  BarChart, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis
} from 'recharts';
import { 
  LayoutDashboard, ShoppingBag, Music, Users, Calendar, CreditCard, Bell, Package, 
  Trash2, Check, X, Plus, Mic, Globe, Save, FileText, DollarSign, Upload, 
  Image as ImageIcon, Box, Lock, List, MessageSquare, Link as LinkIcon, PenSquare,
  Mail, MessageCircle, Truck, Send, Headphones, Menu, Search, Edit2, Timer, Eye, Download, Info, Settings, AlertTriangle, Monitor, Shield, UserX, Clock, Tag, Ticket, Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Booking, Product, Mixtape, SessionType, SiteConfig, User as UserType, TelegramChannel, StudioEquipment, Track, TrackVersion, Genre, Subscription, Order, NewsletterCampaign, SubscriptionPlan, StudioRoom, MaintenanceLog, Coupon, ReferralStats, ShippingZone, ShippingRate } from '../types';
import { POOL_HUBS, TRACK_TYPES } from '../constants';

// Mock Chart Data
const data = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
];

const StatCard: React.FC<{ label: string; value: string | number; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-[#15151A] p-5 rounded-xl border border-white/5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color.replace('text-', 'bg-')}/10`}>
      <Icon className={color} size={24} />
    </div>
    <div>
      <p className="text-gray-400 text-xs uppercase font-bold">{label}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  </div>
);

const ImageUpload: React.FC<{ 
  label: string; 
  value: string; 
  onChange: (base64: string) => void; 
  required?: boolean 
}> = ({ label, value, onChange, required }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
        {label} {required && '*'}
      </label>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition bg-black/20 overflow-hidden relative">
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
              <Upload size={24} className="mb-2" />
              <p className="text-xs">Click to upload image</p>
            </div>
          )}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
        {value && (
          <button 
            type="button"
            onClick={() => onChange('')} 
            className="text-xs text-red-500 self-end hover:underline"
          >
            Remove Image
          </button>
        )}
      </div>
    </div>
  );
};

const MultiImageUpload: React.FC<{
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}> = ({ label, values, onChange }) => {
  const removeImage = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(newValues);
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const promises = Array.from(e.target.files).map((file) => {
              return new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      if (reader.result) resolve(reader.result as string);
                  };
                  reader.readAsDataURL(file as Blob);
              });
          });

          Promise.all(promises).then(base64s => {
              onChange([...values, ...base64s]);
          });
      }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
      <div className="grid grid-cols-4 gap-4 mb-2">
        {values.map((img, idx) => (
          <div key={idx} className="relative aspect-square bg-black/20 rounded-lg overflow-hidden group border border-white/10">
            <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
            <button 
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        
        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition bg-black/20 min-h-[80px]">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <Plus size={24} className="mb-1" />
              <span className="text-[10px] text-center">Add</span>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={handleFiles} 
            />
        </label>
      </div>
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl' }> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizeClasses = { md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`bg-[#15151A] rounded-2xl border border-white/10 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl`}>
        <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#15151A] z-10">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const InputGroup: React.FC<{ 
  label: string; 
  type?: string; 
  value?: any; 
  onChange: (v: any) => void; 
  placeholder?: string; 
  required?: boolean; 
  options?: string[];
  helperText?: string;
  checked?: boolean;
}> = ({ label, type = "text", value, onChange, placeholder, required, options, helperText, checked }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between">
      <span>{label} {required && '*'}</span>
    </label>
    
    {options ? (
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none h-24 resize-none"
      />
    ) : type === 'checkbox' ? (
        <label className="flex items-center gap-3 cursor-pointer bg-black/20 border border-white/10 rounded-lg p-3 hover:bg-white/5 transition">
            <input 
              type="checkbox" 
              checked={checked} 
              onChange={(e) => onChange(e.target.checked)}
              className="w-5 h-5 accent-brand-purple rounded" 
            />
            <span className="text-sm text-white font-medium">{placeholder || label}</span>
        </label>
    ) : (
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none"
      />
    )}
    {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
  </div>
);

// Initial States
const INITIAL_PRODUCT_STATE: Product = {
  id: '', name: '', slug: '', type: 'physical', category: 'Apparel', shortDescription: '', description: '', price: 0, currency: 'KES', isActive: true, visibility: 'public', tags: [], image: '', images: [], hasVariants: false, variantOptions: [], variants: [], trackStock: true, stock: 0, requiresShipping: true, whatsappEnabled: true, status: 'draft', digitalFileUrl: '', downloadPassword: '', weight: '', size: '', sku: '', dimensions: ''
};

const INITIAL_MIXTAPE_STATE: Mixtape = {
  id: '', title: '', slug: '', genre: 'Afrobeats', description: '', releaseDate: new Date().toISOString().split('T')[0], status: 'draft', coverUrl: '', audioUrl: '', duration: '00:00', allowFullStream: true, allowDownload: true, downloadType: 'free', streamQuality: 'high', tracklist: [], isFeatured: false, showInGallery: true, showInMusicPool: false, tags: [], enableComments: true, requireLoginToComment: false, moderateComments: false, isExclusive: false
};

const INITIAL_BOOKING_STATE: Partial<Booking> = { clientName: '', serviceType: 'manual', date: '', time: '', status: 'confirmed', paymentStatus: 'pending', budget: '' };
const INITIAL_SESSION_TYPE: SessionType = { id: '', name: '', description: '', duration: 1, price: 0, depositRequired: true, equipmentIncluded: [], active: true };
const INITIAL_EQUIPMENT_STATE: StudioEquipment = { id: '', name: '', category: 'Microphones', image: '', description: '' };
const INITIAL_POOL_TRACK_STATE: Track = { id: '', artist: '', title: '', genre: '', category: [], bpm: 100, year: new Date().getFullYear(), versions: [], dateAdded: '' };
const INITIAL_COUPON_STATE: Coupon = { id: '', code: '', discountType: 'percentage', discountValue: 0, appliesTo: 'store', expiryDate: '', usageLimit: 100, usageCount: 0, active: true, applicablePlans: [] };
const INITIAL_PLAN_STATE: SubscriptionPlan = { id: '', name: '', price: 0, period: 'mo', features: [], active: true, link: '' };
const INITIAL_ROOM_STATE: StudioRoom = { id: '', name: '', capacity: 1, description: '', status: 'active' };

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [contentSubTab, setContentSubTab] = useState('home'); 
  const [telegramSubTab, setTelegramSubTab] = useState('config');
  const [studioSubTab, setStudioSubTab] = useState<'services' | 'equipment' | 'rooms' | 'maintenance'>('services');
  const [poolSubTab, setPoolSubTab] = useState<'tracks' | 'genres'>('tracks');
  const [newsletterSubTab, setNewsletterSubTab] = useState('subscribers');
  const [bookingSubTab, setBookingSubTab] = useState('list');
  const [subscriptionSubTab, setSubscriptionSubTab] = useState<'overview' | 'plans'>('overview');
  const [marketingSubTab, setMarketingSubTab] = useState<'referrals' | 'coupons'>('referrals');
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form States
  const [productFormTab, setProductFormTab] = useState('basic');
  const [newProduct, setNewProduct] = useState<Product>(INITIAL_PRODUCT_STATE);
  const [variantsInput, setVariantsInput] = useState(''); 

  const [mixtapeFormTab, setMixtapeFormTab] = useState('basic');
  const [newMixtape, setNewMixtape] = useState<Mixtape>(INITIAL_MIXTAPE_STATE);
  const [newBooking, setNewBooking] = useState<Partial<Booking>>(INITIAL_BOOKING_STATE);
  const [newSessionType, setNewSessionType] = useState<SessionType>(INITIAL_SESSION_TYPE);
  const [newEquipment, setNewEquipment] = useState<StudioEquipment>(INITIAL_EQUIPMENT_STATE);
  
  const [newPoolTrack, setNewPoolTrack] = useState<Track>(INITIAL_POOL_TRACK_STATE);
  const [editingGenre, setEditingGenre] = useState<Genre>({ id: '', name: '', coverUrl: '' });

  const [newChannel, setNewChannel] = useState<Partial<TelegramChannel>>({ name: '', channelId: '', genre: '', inviteLink: '', active: true });

  const [newCoupon, setNewCoupon] = useState<Coupon>(INITIAL_COUPON_STATE);

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingDetails, setShippingDetails] = useState({ courierName: '', trackingNumber: '', estimatedArrival: '' });

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan>(INITIAL_PLAN_STATE);
  const [planFeaturesInput, setPlanFeaturesInput] = useState('');

  const [editingRoom, setEditingRoom] = useState<StudioRoom>(INITIAL_ROOM_STATE);

  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);

  const { 
    siteConfig, products, mixtapes, bookings, sessionTypes, studioEquipment, shippingZones, subscribers, poolTracks, genres, subscriptions, orders, newsletterCampaigns,
    subscriptionPlans, studioRooms, maintenanceLogs, coupons, referralStats, users,
    telegramConfig, telegramChannels, telegramMappings, telegramUsers, telegramLogs,
    seedDatabase, 
    updateSiteConfig, deleteProduct, updateBooking, addBooking, deleteMixtape, deleteVideo,
    addProduct, updateProduct, addMixtape, updateMixtape, addSessionType, updateSessionType, deleteSessionType,
    updateTelegramConfig, addTelegramChannel, updateTelegramChannel, deleteTelegramChannel,
    addStudioEquipment, updateStudioEquipment, deleteStudioEquipment,
    addPoolTrack, updatePoolTrack, deletePoolTrack, updateGenre,
    addSubscriber, updateShippingZone, updateSubscription, updateOrder, updateSubscriptionPlan, addSubscriptionPlan, deleteSubscriptionPlan,
    addStudioRoom, updateStudioRoom, deleteStudioRoom, addMaintenanceLog, updateMaintenanceLog,
    addCoupon, updateCoupon, deleteCoupon, updateUser
  } = useData();

  const [editingConfig, setEditingConfig] = useState<SiteConfig>(siteConfig);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'subscriptions', label: 'Subscriptions', icon: Timer },
    { id: 'pool', label: 'Music Pool', icon: Headphones },
    { id: 'bookings', label: 'Bookings', icon: Calendar }, 
    { id: 'studio', label: 'Studio Manager', icon: Mic }, 
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'mixtapes', label: 'Mixtapes', icon: Music },
    { id: 'marketing', label: 'Marketing', icon: Tag },
    { id: 'telegram', label: 'Telegram Bot', icon: MessageCircle },
    { id: 'content', label: 'Site Content', icon: Globe },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'newsletters', label: 'Newsletters', icon: Mail },
    { id: 'system', label: 'System', icon: Database }, 
  ];

  const handleSaveConfig = () => { 
      updateSiteConfig(editingConfig); 
      alert('Site Configuration saved successfully!'); 
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

  const updateProductField = (field: keyof Product, value: any) => setNewProduct(prev => ({ ...prev, [field]: value }));
  const updateMixtapeField = (field: keyof Mixtape, value: any) => setNewMixtape(prev => ({ ...prev, [field]: value }));

  const openAddPoolTrack = () => { setIsEditing(false); setNewPoolTrack({...INITIAL_POOL_TRACK_STATE, genre: genres[0]?.name || 'Afrobeats', versions: []}); setActiveModal('addPoolTrack'); };
  
  const openEditPoolTrack = (track: Track) => { 
    setIsEditing(true); 
    setNewPoolTrack(JSON.parse(JSON.stringify(track))); 
    setActiveModal('addPoolTrack'); 
  };
  
  const handleSavePoolTrack = () => {
    if (isEditing) {
      updatePoolTrack(newPoolTrack.id, newPoolTrack);
    } else {
      addPoolTrack({ ...newPoolTrack, id: `pt_${Date.now()}`, dateAdded: new Date().toISOString() });
    }
    setActiveModal(null);
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
  const handleSaveGenre = () => {
    updateGenre(editingGenre.id, editingGenre);
    setActiveModal(null);
  };

  const openAddProduct = () => { 
    setIsEditing(false); 
    setNewProduct(INITIAL_PRODUCT_STATE); 
    setVariantsInput('');
    setProductFormTab('type'); 
    setActiveModal('addProduct'); 
  };
  
  const openEditProduct = (product: Product) => { 
    setIsEditing(true); 
    setNewProduct(product); 
    setVariantsInput(product.variants?.join(', ') || '');
    setProductFormTab('basic'); 
    setActiveModal('addProduct'); 
  };

  const handleSaveProduct = () => {
    const variantsArray = variantsInput.split(',').map(v => v.trim()).filter(v => v.length > 0);
    
    const productToSave: Product = { 
      ...newProduct, 
      whatsappEnabled: true,
      variants: variantsArray,
      hasVariants: variantsArray.length > 0
    };

    if (isEditing) { 
      updateProduct(newProduct.id, productToSave); 
    } else { 
      addProduct({ 
        ...productToSave, 
        id: `p${Date.now()}`, 
        slug: newProduct.slug || newProduct.name.toLowerCase().replace(/[^a-z0-9]/g, '-') 
      }); 
    }
    setActiveModal(null);
  };

  const openAddMixtape = () => { setIsEditing(false); setNewMixtape(INITIAL_MIXTAPE_STATE); setMixtapeFormTab('basic'); setActiveModal('addMixtape'); };
  const openEditMixtape = (mix: Mixtape) => { setIsEditing(true); setNewMixtape(mix); setMixtapeFormTab('basic'); setActiveModal('addMixtape'); };
  const handleSaveMixtape = () => {
    const isExclusive = newMixtape.downloadType === 'music_pool' || newMixtape.showInMusicPool;
    const finalMixtape = { ...newMixtape, isExclusive, date: newMixtape.releaseDate };
    if (isEditing) { updateMixtape(finalMixtape.id, finalMixtape); } 
    else { addMixtape({ ...finalMixtape, id: `m${Date.now()}`, slug: newMixtape.slug || newMixtape.title.toLowerCase().replace(/[^a-z0-9]/g, '-') }); }
    setActiveModal(null);
  };

  const openAddBooking = () => { setIsEditing(false); setNewBooking(INITIAL_BOOKING_STATE); setActiveModal('addBooking'); };
  const openEditBooking = (b: Booking) => { setIsEditing(true); setNewBooking(b); setActiveModal('addBooking'); };
  const handleSaveBooking = () => {
    if (isEditing) { updateBooking(newBooking.id!, newBooking); }
    else { addBooking({ ...newBooking, id: `b${Date.now()}`, duration: 2, amount: 0, source: 'manual' } as Booking); }
    setActiveModal(null);
  };

  const openAddSessionType = () => { setIsEditing(false); setNewSessionType(INITIAL_SESSION_TYPE); setActiveModal('addSessionType'); };
  const openEditSessionType = (st: SessionType) => { setIsEditing(true); setNewSessionType(st); setActiveModal('addSessionType'); };
  const handleSaveSessionType = () => {
     if (isEditing) { updateSessionType(newSessionType.id, newSessionType); }
     else { addSessionType({ ...newSessionType, id: `st_${Date.now()}` }); }
     setActiveModal(null);
  };
  const openAddEquipment = () => { setIsEditing(false); setNewEquipment(INITIAL_EQUIPMENT_STATE); setActiveModal('addEquipment'); };
  const openEditEquipment = (eq: StudioEquipment) => { setIsEditing(true); setNewEquipment(eq); setActiveModal('addEquipment'); };
  const handleSaveEquipment = () => {
     if (isEditing) { updateStudioEquipment(newEquipment.id, newEquipment); }
     else { addStudioEquipment({ ...newEquipment, id: `eq_${Date.now()}` }); }
     setActiveModal(null);
  };

  const openAddChannel = () => { setIsEditing(false); setNewChannel({ name: '', channelId: '', genre: '', inviteLink: '', active: true }); setActiveModal('addChannel'); };
  const openEditChannel = (ch: TelegramChannel) => { setIsEditing(true); setNewChannel(ch); setActiveModal('addChannel'); };
  const handleSaveChannel = () => {
     if (isEditing && newChannel.id) { updateTelegramChannel(newChannel.id, newChannel); } 
     else { addTelegramChannel({ ...newChannel, id: `tc_${Date.now()}` } as TelegramChannel); }
     setActiveModal(null);
  };

  const openAddCoupon = () => { setIsEditing(false); setNewCoupon(INITIAL_COUPON_STATE); setActiveModal('addCoupon'); };
  const openEditCoupon = (cp: Coupon) => { setIsEditing(true); setNewCoupon(cp); setActiveModal('addCoupon'); };
  const handleSaveCoupon = () => {
    if(isEditing) { updateCoupon(newCoupon.id, newCoupon); }
    else { addCoupon({...newCoupon, id: `cp_${Date.now()}`}); }
    setActiveModal(null);
  }

  const handleRevokeSubscription = (subId: string) => {
    if(confirm("Are you sure you want to revoke this subscription? User access will be removed immediately.")) {
      updateSubscription(subId, { status: 'expired', expiryDate: new Date().toISOString() });
    }
  }

  const openAddPlan = () => { setIsEditing(false); setEditingPlan(INITIAL_PLAN_STATE); setPlanFeaturesInput(''); setActiveModal('addPlan'); };
  const openEditPlan = (plan: SubscriptionPlan) => { setIsEditing(true); setEditingPlan(plan); setPlanFeaturesInput(plan.features.join('\n')); setActiveModal('addPlan'); };
  const handleSavePlan = () => {
    const features = planFeaturesInput.split('\n').filter(f => f.trim() !== '');
    if (isEditing) {
        updateSubscriptionPlan(editingPlan.id, { ...editingPlan, features });
    } else {
        addSubscriptionPlan({ ...editingPlan, id: `plan_${Date.now()}`, features });
    }
    setActiveModal(null);
  };

  const openAddRoom = () => { setIsEditing(false); setEditingRoom(INITIAL_ROOM_STATE); setActiveModal('addRoom'); };
  const openEditRoom = (room: StudioRoom) => { setIsEditing(true); setEditingRoom(room); setActiveModal('addRoom'); };
  const handleSaveRoom = () => {
    if(isEditing) { updateStudioRoom(editingRoom.id, editingRoom); }
    else { addStudioRoom({ ...editingRoom, id: `rm_${Date.now()}`}); }
    setActiveModal(null);
  }

  const openEditZone = (zone: ShippingZone) => { setEditingZone(JSON.parse(JSON.stringify(zone))); setActiveModal('editZone'); };
  const handleSaveZone = () => {
    if(editingZone) {
        updateShippingZone(editingZone.id, editingZone);
        setActiveModal(null);
    }
  }
  const updateRate = (rateId: string, field: keyof ShippingRate, value: any) => {
      if(!editingZone) return;
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
    setShippingDetails({ courierName: '', trackingNumber: '', estimatedArrival: '' });
    setActiveModal('shipOrder');
  }

  const handleShipOrder = () => {
    if (selectedOrder) {
      updateOrder(selectedOrder.id, {
        status: 'shipped',
        ...shippingDetails
      });
      alert(`Order ${selectedOrder.id} marked as shipped! Notification sent to user.`);
      setActiveModal(null);
    }
  }

  const handleUserAction = (userId: string, action: string) => {
    if(action === 'ban') {
        if(confirm('Suspend this user?')) updateUser(userId, { status: 'suspended' });
    }
    if(action === 'activate') {
        updateUser(userId, { status: 'active' });
    }
    if(action === 'reset') alert(`Resetting password for ${userId} (Email sent)`);
    if(action === 'grant_pool') {
        if(confirm('Grant full Music Pool access?')) {
            updateUser(userId, { 
                isSubscriber: true, 
                subscriptionPlan: 'monthly', 
                subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        }
    }
  };

  const openUserDetail = (user: UserType) => {
    setSelectedUser(user);
    setActiveModal('userDetail');
  }

  const sendCampaign = () => {
      alert(`Campaign "${emailSubject}" sent to subscribers!`);
      setEmailSubject('');
      setEmailBody('');
  }

  return (
    <div className="flex h-screen bg-[#0B0B0F] text-white">
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
              className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors border-l-2 ${
                activeTab === tab.id 
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
            <button className="relative text-gray-400 hover:text-white"><Bell size={20} /></button>
            <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center font-bold">A</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Revenue" value="KES 45K" icon={CreditCard} color="text-green-500" />
                <StatCard label="Pool Tracks" value={poolTracks.length} icon={Headphones} color="text-brand-purple" />
                <StatCard label="Products" value={products.length} icon={Package} color="text-yellow-500" />
                <StatCard label="Mixtapes" value={mixtapes.length} icon={Music} color="text-brand-cyan" />
              </div>
              <div className="bg-[#15151A] p-6 rounded-xl border border-white/5 h-80">
                  <h3 className="text-lg font-bold mb-6">Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#333" /><XAxis dataKey="name" stroke="#666" /><YAxis stroke="#666" /><Tooltip contentStyle={{ backgroundColor: '#15151A', borderColor: '#333' }} /><Line type="monotone" dataKey="sales" stroke="#7B5CFF" strokeWidth={2} /></LineChart>
                  </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="bg-[#15151A] p-8 rounded-xl border border-white/5 max-w-2xl">
                   <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                      <Database size={24} className="text-brand-purple" /> Database Management
                   </h3>
                   <p className="text-gray-400 mb-6">
                      Use this utility to populate your Firestore database with the initial template data (Products, Mixtapes, Plans, etc.). 
                      Run this <b>once</b> to initialize your app content.
                   </p>
                   <button 
                      onClick={() => { if(confirm("This will overwrite existing items with matching IDs. Continue?")) seedDatabase() }} 
                      className="bg-brand-purple text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-600 transition flex items-center gap-2"
                   >
                      <Upload size={18} /> Seed Database (Upload Initial Data)
                   </button>
                </div>
                
                <div className="bg-[#15151A] p-8 rounded-xl border border-white/5 max-w-2xl">
                   <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                      <Shield size={24} className="text-red-500" /> Maintenance Mode
                   </h3>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                         <div className="absolute left-1 top-1 w-4 h-4 bg-gray-400 rounded-full transition-all"></div>
                      </div>
                      <span className="text-gray-400">Site is currently Live</span>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'orders' && (
             <div className="animate-fade-in-up">
               <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-left min-w-[800px]">
                     <thead className="bg-black/20 text-gray-500 text-xs uppercase border-b border-white/5">
                        <tr>
                           <th className="px-6 py-4">Order ID</th>
                           <th className="px-6 py-4">Customer</th>
                           <th className="px-6 py-4">Items</th>
                           <th className="px-6 py-4">Total</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5 text-sm">
                        {orders.map(order => (
                           <tr key={order.id} className="hover:bg-white/5 transition">
                              <td className="px-6 py-4 font-mono">{order.id}</td>
                              <td className="px-6 py-4">
                                 <div className="font-bold text-white">{order.customerName}</div>
                                 <div className="text-xs text-gray-400">{order.customerEmail}</div>
                              </td>
                              <td className="px-6 py-4">{order.items.length} Items</td>
                              <td className="px-6 py-4">KES {order.total.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded text-xs capitalize ${order.status === 'completed' ? 'bg-green-500/20 text-green-500' : order.status === 'shipped' ? 'bg-blue-500/20 text-blue-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{order.status}</span>
                              </td>
                              <td className="px-6 py-4 flex gap-2">
                                 {order.status === 'processing' && (
                                    <button onClick={() => openShipModal(order)} className="text-xs bg-blue-500/10 text-blue-500 px-3 py-1 rounded hover:bg-blue-500/20 font-bold">Ship Order</button>
                                 )}
                                 <button className="text-gray-400 hover:text-white"><Eye size={16} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
             </div>
          )}

          {activeTab === 'subscriptions' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <StatCard label="Active Subs" value={subscriptions.filter(s => s.status === 'active').length} icon={Users} color="text-green-500" />
                   <StatCard label="New This Month" value="12" icon={Plus} color="text-blue-500" />
                   <StatCard label="Churn Rate" value="5%" icon={UserX} color="text-red-500" />
                   <StatCard label="MRR" value="KES 45K" icon={DollarSign} color="text-brand-purple" />
                </div>

                <div className="flex gap-4 border-b border-white/5 pb-4">
                   <button onClick={() => setSubscriptionSubTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${subscriptionSubTab === 'overview' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Subscribers List</button>
                   <button onClick={() => setSubscriptionSubTab('plans')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${subscriptionSubTab === 'plans' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Plans & Pricing</button>
                </div>

                {subscriptionSubTab === 'overview' && (
                   <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                         <thead className="bg-black/20 text-gray-500 text-xs uppercase border-b border-white/5">
                           <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Plan</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Expiry Date</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr>
                         </thead>
                         <tbody className="divide-y divide-white/5 text-sm">
                           {subscriptions.map((sub) => {
                              const isExpired = new Date() > new Date(sub.expiryDate);
                              return (
                                <tr key={sub.id} className="hover:bg-white/5 transition">
                                   <td className="px-6 py-4 font-bold text-white">{sub.userName}</td>
                                   <td className="px-6 py-4 capitalize">{sub.planId}</td>
                                   <td className="px-6 py-4">KES {sub.amount}</td>
                                   <td className="px-6 py-4 font-mono">{new Date(sub.expiryDate).toLocaleDateString()}</td>
                                   <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded ${!isExpired && sub.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{!isExpired && sub.status === 'active' ? 'Active' : 'Expired'}</span></td>
                                   <td className="px-6 py-4">{sub.status === 'active' && !isExpired && <button onClick={() => handleRevokeSubscription(sub.id)} className="text-red-500 hover:underline text-xs">Revoke</button>}</td>
                                </tr>
                              );
                           })}
                         </tbody>
                      </table>
                   </div>
                )}

                {subscriptionSubTab === 'plans' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subscriptionPlans.map(plan => (
                         <div key={plan.id} className="bg-[#15151A] p-6 rounded-xl border border-white/5 relative">
                            {plan.isBestValue && <span className="absolute top-4 right-4 bg-brand-purple text-white text-[10px] font-bold px-2 py-1 rounded">BEST VALUE</span>}
                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <p className="text-2xl font-bold text-brand-cyan mb-4">KES {plan.price} <span className="text-sm text-gray-500">/{plan.period}</span></p>
                            <ul className="space-y-2 mb-6">
                               {plan.features.map((f, i) => <li key={i} className="text-xs text-gray-400 flex items-center gap-2"><Check size={12} className="text-green-500"/> {f}</li>)}
                            </ul>
                            <div className="flex gap-2">
                               <button onClick={() => openEditPlan(plan)} className="flex-1 py-2 bg-white/10 text-white rounded font-bold text-sm hover:bg-white/20">Edit</button>
                               <button onClick={() => { if(confirm('Delete plan?')) deleteSubscriptionPlan(plan.id) }} className="py-2 px-3 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"><Trash2 size={16}/></button>
                            </div>
                         </div>
                      ))}
                      <div onClick={openAddPlan} className="bg-[#15151A] p-6 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:bg-white/5 hover:border-white/20 cursor-pointer transition min-h-[300px]">
                         <Plus size={48} className="mb-4" />
                         <span className="font-bold">Create New Plan</span>
                      </div>
                   </div>
                )}
             </div>
          )}

          {activeTab === 'pool' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto">
                   <button onClick={() => setPoolSubTab('tracks')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition ${poolSubTab === 'tracks' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'}`}>Tracks</button>
                   <button onClick={() => setPoolSubTab('genres')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition ${poolSubTab === 'genres' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'}`}>Genre Covers</button>
                </div>

                {poolSubTab === 'tracks' && (
                   <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                         <h3 className="text-2xl font-bold">Pool Library</h3>
                         <button onClick={openAddPoolTrack} className="bg-brand-purple text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-600 font-bold w-full sm:w-auto justify-center">
                            <Plus size={18} /> Upload Track
                         </button>
                      </div>
                      <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden overflow-x-auto">
                         <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-black/20 text-gray-500 text-xs uppercase border-b border-white/5">
                               <tr><th className="px-6 py-4">Title / Artist</th><th className="px-6 py-4">Genre</th><th className="px-6 py-4">BPM / Key</th><th className="px-6 py-4">Versions</th><th className="px-6 py-4">Year</th><th className="px-6 py-4">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                               {poolTracks.map(track => (
                                  <tr key={track.id} className="hover:bg-white/5 transition">
                                     <td className="px-6 py-4"><div className="font-bold text-white">{track.title}</div><div className="text-xs text-gray-400">{track.artist}</div></td>
                                     <td className="px-6 py-4"><div className="text-brand-cyan text-xs font-bold mb-1">{track.genre}</div></td>
                                     <td className="px-6 py-4"><div>{track.bpm} BPM</div><div className="text-xs text-gray-500">{track.key || '-'}</div></td>
                                     <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{track.versions.map(v => (<span key={v.id} className="text-[10px] border border-white/20 px-2 py-0.5 rounded text-gray-300">{v.type}</span>))}</div></td>
                                     <td className="px-6 py-4">{track.year}</td>
                                     <td className="px-6 py-4 flex gap-2">
                                        <button onClick={() => openEditPoolTrack(track)} className="p-2 text-blue-400 hover:bg-white/5 rounded"><PenSquare size={16} /></button>
                                        <button onClick={() => { if(window.confirm(`Are you sure you want to delete "${track.title}"?`)) deletePoolTrack(track.id); }} className="p-2 text-red-400 hover:bg-white/5 rounded"><Trash2 size={16} /></button>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </>
                )}

                {poolSubTab === 'genres' && (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {genres.map(g => (
                         <div key={g.id} className="group relative bg-[#15151A] rounded-xl overflow-hidden border border-white/5 hover:border-brand-purple/50 cursor-pointer" onClick={() => openEditGenre(g)}>
                            <div className="aspect-square relative">
                               <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                               <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Edit2 size={24} className="text-white" /></div>
                            </div>
                            <div className="p-3"><p className="text-xs font-bold text-white truncate text-center">{g.name}</p></div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          )}

          {activeTab === 'store' && (
             <div className="animate-fade-in-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                   <h3 className="text-2xl font-bold">Product Inventory</h3>
                   <button onClick={openAddProduct} className="bg-brand-purple text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-600 font-bold w-full sm:w-auto justify-center">
                      <Plus size={18} /> Add Product
                   </button>
                </div>
                <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden overflow-x-auto">
                   <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-black/20 text-gray-500 text-xs uppercase border-b border-white/5">
                        <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Price</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {products.map((p) => (
                           <tr key={p.id} className="hover:bg-white/5 transition">
                              <td className="px-6 py-4 font-bold text-white">{p.name} <span className="text-gray-500 text-xs font-normal">({p.category})</span></td>
                              <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded capitalize ${p.type === 'digital' ? 'bg-blue-500/20 text-blue-500' : 'bg-orange-500/20 text-orange-500'}`}>{p.type}</span></td>
                              <td className="px-6 py-4">KES {p.price.toLocaleString()}</td>
                              <td className="px-6 py-4">{p.type === 'digital' ? '∞' : p.stock}</td>
                              <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded ${p.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>{p.status}</span></td>
                              <td className="px-6 py-4 flex gap-3"><button onClick={() => openEditProduct(p)} className="text-blue-500 hover:text-blue-400"><PenSquare size={16} /></button><button onClick={() => deleteProduct(p.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button></td>
                           </tr>
                        ))}
                      </tbody>
                   </table>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {mixtapes.map((mix) => (
                      <div key={mix.id} className="bg-[#15151A] rounded-xl border border-white/5 p-4 flex gap-4 relative group">
                         <img src={mix.coverUrl} alt={mix.title} className="w-20 h-20 rounded object-cover" />
                         <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white mb-1 line-clamp-1">{mix.title}</h4>
                            <p className="text-xs text-gray-400 mb-2">{mix.genre}</p>
                            <div className="flex justify-between items-center">
                               <span className={`text-[10px] px-2 py-0.5 rounded ${mix.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>{mix.status}</span>
                               <div className="flex gap-2"><button onClick={() => openEditMixtape(mix)} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20"><PenSquare size={14} /></button><button onClick={() => deleteMixtape(mix.id)} className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"><Trash2 size={14} /></button></div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'marketing' && (
             <div className="animate-fade-in-up space-y-6">
               <div className="flex gap-4 border-b border-white/5 pb-4">
                   <button onClick={() => setMarketingSubTab('referrals')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${marketingSubTab === 'referrals' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Referral Program</button>
                   <button onClick={() => setMarketingSubTab('coupons')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${marketingSubTab === 'coupons' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Coupons</button>
               </div>

               {marketingSubTab === 'referrals' && (
                 <>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <StatCard label="Total Referrals" value={referralStats.reduce((acc, r) => acc + r.totalReferrals, 0)} icon={Users} color="text-brand-cyan" />
                      <StatCard label="Total Payouts" value={`KES ${referralStats.reduce((acc, r) => acc + r.totalEarned, 0)}`} icon={DollarSign} color="text-green-500" />
                      <StatCard label="Pending" value={`KES ${referralStats.reduce((acc, r) => acc + r.pendingPayout, 0)}`} icon={Clock} color="text-yellow-500" />
                   </div>
                   <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden">
                      <table className="w-full text-left"><thead className="bg-black/20 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Code</th><th className="px-6 py-4">Referrals</th><th className="px-6 py-4">Earned</th><th className="px-6 py-4">Pending</th></tr></thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {referralStats.map(r => (
                          <tr key={r.id}>
                            <td className="px-6 py-4 font-bold">{r.userName}</td>
                            <td className="px-6 py-4 font-mono text-brand-purple">{r.referralCode}</td>
                            <td className="px-6 py-4">{r.totalReferrals}</td>
                            <td className="px-6 py-4">KES {r.totalEarned}</td>
                            <td className="px-6 py-4 text-yellow-500">KES {r.pendingPayout}</td>
                          </tr>
                        ))}
                      </tbody></table>
                   </div>
                 </>
               )}

               {marketingSubTab === 'coupons' && (
                 <>
                   <div className="flex justify-end mb-4"><button onClick={openAddCoupon} className="bg-brand-purple text-white px-4 py-2 rounded-lg font-bold flex gap-2"><Plus size={18} /> Create Coupon</button></div>
                   <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden">
                      <table className="w-full text-left"><thead className="bg-black/20 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-4">Code</th><th className="px-6 py-4">Discount</th><th className="px-6 py-4">Applies To</th><th className="px-6 py-4">Expiry</th><th className="px-6 py-4">Usage</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr></thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {coupons.map(c => (
                          <tr key={c.id}>
                            <td className="px-6 py-4 font-mono font-bold text-white">{c.code}</td>
                            <td className="px-6 py-4">{c.discountType === 'percentage' ? `${c.discountValue}%` : `KES ${c.discountValue}`}</td>
                            <td className="px-6 py-4 capitalize">{c.appliesTo}</td>
                            <td className="px-6 py-4">{c.expiryDate}</td>
                            <td className="px-6 py-4">{c.usageCount} / {c.usageLimit}</td>
                            <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded ${c.active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                            <td className="px-6 py-4 flex gap-2">
                               <button onClick={() => openEditCoupon(c)} className="text-blue-500"><PenSquare size={16}/></button>
                               <button onClick={() => deleteCoupon(c.id)} className="text-red-500"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody></table>
                   </div>
                 </>
               )}
             </div>
          )}

          {activeTab === 'bookings' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-2xl font-bold">Manage Bookings</h3>
                   <div className="flex gap-4">
                      <div className="flex bg-[#15151A] rounded-lg p-1">
                         <button onClick={() => setBookingSubTab('list')} className={`px-4 py-1.5 rounded-md text-sm font-bold ${bookingSubTab === 'list' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>List</button>
                         <button onClick={() => setBookingSubTab('calendar')} className={`px-4 py-1.5 rounded-md text-sm font-bold ${bookingSubTab === 'calendar' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Calendar</button>
                      </div>
                      <button onClick={openAddBooking} className="bg-brand-purple text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-600 font-bold"><Plus size={18} /> Add Booking</button>
                   </div>
                </div>
                {bookingSubTab === 'list' ? (
                   <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                         <thead className="bg-black/20 text-gray-500 text-xs uppercase border-b border-white/5">
                           <tr><th className="px-6 py-4">Client</th><th className="px-6 py-4">Service</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr>
                         </thead>
                         <tbody className="divide-y divide-white/5 text-sm">
                           {bookings.map((b) => (
                              <tr key={b.id} className="hover:bg-white/5 transition">
                                 <td className="px-6 py-4 font-bold text-white">{b.clientName}</td>
                                 <td className="px-6 py-4 text-gray-300">{b.serviceName || b.serviceType}</td>
                                 <td className="px-6 py-4">{b.date} @ {b.time}</td>
                                 <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded capitalize ${b.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{b.status}</span></td>
                                 <td className="px-6 py-4 flex gap-2"><button onClick={() => openEditBooking(b)} className="text-blue-500"><PenSquare size={16} /></button></td>
                              </tr>
                           ))}
                         </tbody>
                      </table>
                   </div>
                ) : (
                   <div className="bg-[#15151A] p-8 text-center rounded-xl border border-white/5"><Calendar size={48} className="mx-auto text-gray-600 mb-4" /><h3 className="text-xl font-bold text-white">Calendar View</h3><p className="text-gray-500">Feature coming soon.</p></div>
                )}
             </div>
          )}

          {activeTab === 'studio' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <StatCard label="Booked Today" value="3" icon={Mic} color="text-brand-cyan" />
                   <StatCard label="Utilization" value="75%" icon={Timer} color="text-green-500" />
                   <StatCard label="Rev/Room" value="KES 12K" icon={DollarSign} color="text-brand-purple" />
                   <StatCard label="Available" value="2 Rooms" icon={Check} color="text-blue-500" />
                </div>

                <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto">
                   <button onClick={() => setStudioSubTab('services')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${studioSubTab === 'services' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Services</button>
                   <button onClick={() => setStudioSubTab('equipment')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${studioSubTab === 'equipment' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Equipment</button>
                   <button onClick={() => setStudioSubTab('rooms')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${studioSubTab === 'rooms' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Rooms</button>
                   <button onClick={() => setStudioSubTab('maintenance')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${studioSubTab === 'maintenance' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Maintenance</button>
                </div>

                {studioSubTab === 'services' && (
                   <>
                      <div className="flex justify-end"><button onClick={openAddSessionType} className="bg-brand-purple text-white px-4 py-2 rounded-lg font-bold flex gap-2"><Plus size={18} /> Add Service</button></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {sessionTypes.map(st => (
                            <div key={st.id} className="bg-[#15151A] p-6 rounded-xl border border-white/5">
                               <div className="flex justify-between mb-2"><h4 className="font-bold text-lg">{st.name}</h4><div className="flex gap-2"><PenSquare size={16} className="text-blue-500 cursor-pointer" onClick={() => openEditSessionType(st)} /><Trash2 size={16} className="text-red-500 cursor-pointer" onClick={() => deleteSessionType(st.id)} /></div></div>
                               <p className="text-gray-400 text-sm mb-4 h-10 line-clamp-2">{st.description}</p>
                               <p className="font-bold text-brand-purple">KES {st.price.toLocaleString()}</p>
                            </div>
                         ))}
                      </div>
                   </>
                )}
                {studioSubTab === 'equipment' && (
                   <>
                      <div className="flex justify-end"><button onClick={openAddEquipment} className="bg-brand-purple text-white px-4 py-2 rounded-lg font-bold flex gap-2"><Plus size={18} /> Add Gear</button></div>
                      <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden"><table className="w-full text-left"><thead className="bg-black/20 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-4">Item</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-white/5 text-sm">{studioEquipment.map(eq => (<tr key={eq.id}><td className="px-6 py-4 font-bold">{eq.name}</td><td className="px-6 py-4 text-gray-400">{eq.category}</td><td className="px-6 py-4 flex gap-2"><PenSquare size={16} className="text-blue-500 cursor-pointer" onClick={() => openEditEquipment(eq)} /><Trash2 size={16} className="text-red-500 cursor-pointer" onClick={() => deleteStudioEquipment(eq.id)} /></td></tr>))}</tbody></table></div>
                   </>
                )}
                {studioSubTab === 'rooms' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {studioRooms.map(room => (
                         <div key={room.id} className="bg-[#15151A] p-6 rounded-xl border border-white/5">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-lg">{room.name}</h4>
                                <div className="flex gap-2">
                                    <PenSquare size={16} className="text-blue-500 cursor-pointer" onClick={() => openEditRoom(room)} />
                                    <Trash2 size={16} className="text-red-500 cursor-pointer" onClick={() => {if(confirm('Delete room?')) deleteStudioRoom(room.id)}} />
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">{room.description}</p>
                            <div className="flex justify-between items-center text-xs">
                               <span className="bg-white/10 px-2 py-1 rounded">Cap: {room.capacity}</span>
                               <span className={`px-2 py-1 rounded ${room.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{room.status}</span>
                            </div>
                         </div>
                      ))}
                      <div onClick={openAddRoom} className="bg-[#15151A] p-6 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:bg-white/5 cursor-pointer">
                         <Plus size={32} className="mb-2" />
                         <span>Add Room</span>
                      </div>
                   </div>
                )}
                {studioSubTab === 'maintenance' && (
                   <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden">
                      <table className="w-full text-left"><thead className="bg-black/20 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-4">Item</th><th className="px-6 py-4">Issue</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Status</th></tr></thead><tbody className="divide-y divide-white/5 text-sm">
                         {maintenanceLogs.map(log => (
                            <tr key={log.id}>
                               <td className="px-6 py-4 font-bold">{log.itemName}</td>
                               <td className="px-6 py-4">{log.description}</td>
                               <td className="px-6 py-4 text-gray-400">{log.date}</td>
                               <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded ${log.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{log.status}</span></td>
                            </tr>
                         ))}
                      </tbody></table>
                   </div>
                )}
             </div>
          )}

          {activeTab === 'users' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <StatCard label="Total Users" value={users.length} icon={Users} color="text-brand-purple" />
                   <StatCard label="Subscribers" value={users.filter(u => u.isSubscriber).length} icon={Check} color="text-green-500" />
                   <StatCard label="Admins" value={users.filter(u => u.role === 'admin').length} icon={Shield} color="text-red-500" />
                   <StatCard label="Active Now" value="45" icon={Monitor} color="text-blue-500" />
                </div>

                <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden">
                   <table className="w-full text-left"><thead className="bg-black/20 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Subscription</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-white/5 text-sm">{users.map(u => (<tr key={u.id}>
                      <td className="px-6 py-4 font-bold">{u.name}</td>
                      <td className="px-6 py-4 text-gray-400">{u.email}</td>
                      <td className="px-6 py-4 capitalize">{u.role}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{u.isSubscriber ? <span className="text-green-500">Active ({u.subscriptionPlan})</span> : 'None'}</td>
                      <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded ${u.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{u.status}</span></td>
                      <td className="px-6 py-4 flex gap-2">
                         <button onClick={() => openUserDetail(u)} className="text-blue-500 text-xs hover:underline flex items-center gap-1"><Eye size={14}/> View</button>
                      </td>
                   </tr>))}</tbody></table>
                </div>
             </div>
          )}

          {activeTab === 'shipping' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <StatCard label="Pending" value="8" icon={Package} color="text-yellow-500" />
                   <StatCard label="Delivered" value="1,402" icon={Check} color="text-green-500" />
                   <StatCard label="Revenue" value="KES 120K" icon={DollarSign} color="text-brand-purple" />
                   <StatCard label="Failed" value="12" icon={AlertTriangle} color="text-red-500" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                   {shippingZones.map(zone => (
                      <div key={zone.id} className="bg-[#15151A] p-6 rounded-xl border border-white/5">
                         <div className="flex justify-between mb-4"><h4 className="font-bold text-lg">{zone.name}</h4><PenSquare size={16} className="text-blue-500 cursor-pointer" onClick={() => openEditZone(zone)} /></div>
                         <p className="text-gray-400 text-sm mb-4">{zone.description}</p>
                         <div className="space-y-2">{zone.rates.map(r => (<div key={r.id} className="flex justify-between text-sm border-b border-white/5 pb-2"><span>{r.label}</span><span className="font-bold text-brand-purple">KES {r.price}</span></div>))}</div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'content' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <StatCard label="Active Pages" value="12" icon={FileText} color="text-green-500" />
                   <StatCard label="Published" value="24 Sections" icon={Check} color="text-blue-500" />
                   <StatCard label="Last Update" value="2h Ago" icon={Clock} color="text-brand-purple" />
                   <StatCard label="Issues" value="0" icon={AlertTriangle} color="text-gray-500" />
                </div>

                <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto">
                   <button onClick={() => setContentSubTab('home')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${contentSubTab === 'home' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Home</button>
                   <button onClick={() => setContentSubTab('about')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${contentSubTab === 'about' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>About</button>
                   <button onClick={() => setContentSubTab('footer')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${contentSubTab === 'footer' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Footer & Contact</button>
                   <button onClick={() => setContentSubTab('tipjar')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${contentSubTab === 'tipjar' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Tip Jar</button>
                   <button onClick={() => setContentSubTab('seo')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${contentSubTab === 'seo' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>SEO</button>
                </div>
                
                <div className="flex justify-end"><button onClick={handleSaveConfig} className="bg-brand-purple px-6 py-2 rounded-lg font-bold flex gap-2"><Save size={18} /> Save Changes</button></div>
                
                {contentSubTab === 'home' && (<div className="bg-[#15151A] p-8 rounded-xl border border-white/5 space-y-4">
                    <InputGroup label="Hero Title" value={editingConfig.hero.title} onChange={v => updateContentField('hero', 'title', v)} />
                    <InputGroup label="Hero Subtitle" type="textarea" value={editingConfig.hero.subtitle} onChange={v => updateContentField('hero', 'subtitle', v)} />
                    <InputGroup label="CTA Text" value={editingConfig.hero.ctaText} onChange={v => updateContentField('hero', 'ctaText', v)} />
                    <InputGroup label="Hero BG Image" value={editingConfig.hero.bgImage} onChange={v => updateContentField('hero', 'bgImage', v)} />
                </div>)}
                {contentSubTab === 'about' && (<div className="bg-[#15151A] p-8 rounded-xl border border-white/5 space-y-4"><InputGroup label="About Title" value={editingConfig.about.title} onChange={v => updateContentField('about', 'title', v)} /><InputGroup label="Bio" type="textarea" value={editingConfig.about.bio} onChange={v => updateContentField('about', 'bio', v)} /></div>)}
                {contentSubTab === 'footer' && (<div className="bg-[#15151A] p-8 rounded-xl border border-white/5 space-y-4">
                    <InputGroup label="Email" value={editingConfig.contact.email} onChange={v => updateContentField('contact', 'email', v)} />
                    <InputGroup label="Phone" value={editingConfig.contact.phone} onChange={v => updateContentField('contact', 'phone', v)} />
                    <InputGroup label="Whatsapp" value={editingConfig.contact.whatsapp} onChange={v => updateContentField('contact', 'whatsapp', v)} />
                    <InputGroup label="Footer Desc" type="textarea" value={editingConfig.footer.description} onChange={v => updateContentField('footer', 'description', v)} />
                </div>)}
                {contentSubTab === 'tipjar' && (<div className="bg-[#15151A] p-8 rounded-xl border border-white/5 space-y-4">
                    <InputGroup label="Title" value={editingConfig.home.tipJar.title} onChange={v => { const h = {...editingConfig.home}; h.tipJar.title = v; setEditingConfig({...editingConfig, home: h}) }} />
                    <InputGroup label="Message" type="textarea" value={editingConfig.home.tipJar.message} onChange={v => { const h = {...editingConfig.home}; h.tipJar.message = v; setEditingConfig({...editingConfig, home: h}) }} />
                </div>)}
                {contentSubTab === 'seo' && (<div className="bg-[#15151A] p-8 rounded-xl border border-white/5 space-y-4"><InputGroup label="Site Title" value={editingConfig.seo.siteTitle} onChange={v => updateContentField('seo', 'siteTitle', v)} /><InputGroup label="Meta Description" type="textarea" value={editingConfig.seo.description} onChange={v => updateContentField('seo', 'description', v)} /><InputGroup label="Keywords" value={editingConfig.seo.keywords} onChange={v => updateContentField('seo', 'keywords', v)} /></div>)}
             </div>
          )}

          {activeTab === 'telegram' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="flex gap-4 border-b border-white/5 pb-4"><button onClick={() => setTelegramSubTab('config')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${telegramSubTab === 'config' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Config</button><button onClick={() => setTelegramSubTab('channels')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${telegramSubTab === 'channels' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Channels</button></div>
                {telegramSubTab === 'config' && (
                   <div className="bg-[#15151A] p-8 rounded-xl border border-white/5 max-w-3xl space-y-4">
                      <InputGroup label="Bot Token" value={telegramConfig.botToken} onChange={v => updateTelegramConfig({botToken: v})} />
                      <InputGroup label="Bot Username" value={telegramConfig.botUsername} onChange={() => {}} />
                      <div className={`p-4 rounded-lg border ${telegramConfig.status === 'Connected' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>Status: {telegramConfig.status}</div>
                   </div>
                )}
                {telegramSubTab === 'channels' && (
                   <>
                      <div className="flex justify-end mb-4"><button onClick={openAddChannel} className="bg-brand-purple text-white px-4 py-2 rounded-lg font-bold flex gap-2"><Plus size={18} /> Add Channel</button></div>
                      <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden"><table className="w-full text-left"><thead className="bg-black/20 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">ID</th><th className="px-6 py-4">Genre</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-white/5 text-sm">{telegramChannels.map(ch => (<tr key={ch.id}><td className="px-6 py-4 font-bold">{ch.name}</td><td className="px-6 py-4 text-gray-500">{ch.channelId}</td><td className="px-6 py-4">{ch.genre}</td><td className="px-6 py-4 flex gap-2"><PenSquare size={16} className="text-blue-500 cursor-pointer" onClick={() => openEditChannel(ch)} /><Trash2 size={16} className="text-red-500 cursor-pointer" onClick={() => deleteTelegramChannel(ch.id)} /></td></tr>))}</tbody></table></div>
                   </>
                )}
             </div>
          )}

          {activeTab === 'payments' && (
             <div className="animate-fade-in-up bg-[#15151A] rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left"><thead className="bg-black/20 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-4">Ref Code</th><th className="px-6 py-4">Date/Time</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Items</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th></tr></thead><tbody className="divide-y divide-white/5 text-sm">{orders.map(order => (<tr key={order.id}>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{order.referenceCode || 'N/A'}</td>
                    <td className="px-6 py-4">
                        <div className="text-white">{order.date}</div>
                        <div className="text-xs text-gray-500">{order.time}</div>
                    </td>
                    <td className="px-6 py-4 font-bold">{order.customerName}</td>
                    <td className="px-6 py-4 text-xs">{order.items.map(i => i.productName).join(', ')}</td>
                    <td className="px-6 py-4 font-bold text-brand-purple">KES {order.total}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded capitalize ${order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{order.status}</span></td></tr>))}
                </tbody></table>
             </div>
          )}

          {activeTab === 'newsletters' && (
             <div className="animate-fade-in-up space-y-6">
                <div className="flex gap-4 border-b border-white/5 pb-4">
                   <button onClick={() => setNewsletterSubTab('subscribers')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${newsletterSubTab === 'subscribers' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Subscribers</button>
                   <button onClick={() => setNewsletterSubTab('campaigns')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${newsletterSubTab === 'campaigns' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Campaigns</button>
                   <button onClick={() => setNewsletterSubTab('blast')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${newsletterSubTab === 'blast' ? 'bg-brand-purple text-white' : 'text-gray-400'}`}>Quick Blast</button>
                </div>

                {newsletterSubTab === 'subscribers' && (
                   <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden"><div className="p-4 border-b border-white/5 font-bold flex justify-between"><span>Subscribers ({subscribers.length})</span><button className="text-brand-purple text-xs font-bold" onClick={() => alert('Feature coming soon')}>+ Add Manual</button></div><div className="max-h-96 overflow-y-auto"><table className="w-full text-left"><tbody className="divide-y divide-white/5 text-sm">{subscribers.map(s => (<tr key={s.id}><td className="px-6 py-3">{s.email}</td><td className="px-6 py-3 text-gray-500">{s.status}</td><td className="px-6 py-3 text-xs text-gray-600">{s.source}</td></tr>))}</tbody></table></div></div>
                )}

                {newsletterSubTab === 'campaigns' && (
                   <div className="bg-[#15151A] rounded-xl border border-white/5 overflow-hidden">
                      <div className="p-4 border-b border-white/5 font-bold flex justify-between"><span>Recent Campaigns</span><button onClick={() => alert('Feature coming soon')} className="bg-brand-purple text-white text-xs font-bold px-3 py-1 rounded">+ Create</button></div>
                      <table className="w-full text-left">
                         <tbody className="divide-y divide-white/5 text-sm">
                            <tr className="bg-black/20 text-gray-500 text-xs uppercase"><th className="px-6 py-3">Name</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Opens</th></tr>
                            {newsletterCampaigns?.map(c => (
                               <tr key={c.id}>
                                  <td className="px-6 py-3 font-bold">{c.name}</td>
                                  <td className="px-6 py-3 capitalize">{c.type}</td>
                                  <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs ${c.status === 'sent' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{c.status}</span></td>
                                  <td className="px-6 py-3">{c.openRate ? `${c.openRate}%` : '-'}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                )}

                {newsletterSubTab === 'blast' && (
                   <div className="bg-[#15151A] p-8 rounded-xl border border-white/5">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Send size={20} /> Quick Email Blast</h3>
                      <div className="space-y-4"><InputGroup label="Subject" value={emailSubject} onChange={setEmailSubject} /><InputGroup label="Message" type="textarea" value={emailBody} onChange={setEmailBody} /><button onClick={sendCampaign} className="bg-brand-purple text-white px-6 py-3 rounded-lg font-bold">Send Now</button></div>
                   </div>
                )}
             </div>
          )}

        </div>
      </div>

      <Modal isOpen={activeModal === 'addPlan'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Plan" : "Create New Plan"}>
          <div className="space-y-4">
              <InputGroup label="Plan Name" value={editingPlan.name} onChange={v => setEditingPlan({...editingPlan, name: v})} required />
              <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Price (KES)" type="number" value={editingPlan.price} onChange={v => setEditingPlan({...editingPlan, price: Number(v)})} required />
                  <InputGroup label="Period (e.g. mo, yr)" value={editingPlan.period} onChange={v => setEditingPlan({...editingPlan, period: v})} required />
              </div>
              <InputGroup label="Payment Link" value={editingPlan.link || ''} onChange={v => setEditingPlan({...editingPlan, link: v})} placeholder="https://paystack..." />
              <InputGroup label="Features (One per line)" type="textarea" value={planFeaturesInput} onChange={setPlanFeaturesInput} />
              <div className="flex gap-4">
                  <InputGroup label="Active" type="checkbox" checked={editingPlan.active} onChange={v => setEditingPlan({...editingPlan, active: v})} />
                  <InputGroup label="Best Value" type="checkbox" checked={editingPlan.isBestValue} onChange={v => setEditingPlan({...editingPlan, isBestValue: v})} />
              </div>
              <div className="flex justify-end pt-4"><button onClick={handleSavePlan} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Plan</button></div>
          </div>
      </Modal>

      <Modal isOpen={activeModal === 'addRoom'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Room" : "Add Studio Room"}>
          <div className="space-y-4">
              <InputGroup label="Room Name" value={editingRoom.name} onChange={v => setEditingRoom({...editingRoom, name: v})} required />
              <InputGroup label="Capacity" type="number" value={editingRoom.capacity} onChange={v => setEditingRoom({...editingRoom, capacity: Number(v)})} />
              <InputGroup label="Description" type="textarea" value={editingRoom.description} onChange={v => setEditingRoom({...editingRoom, description: v})} />
              <InputGroup label="Status" options={['active', 'maintenance']} value={editingRoom.status} onChange={v => setEditingRoom({...editingRoom, status: v})} />
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
               <InputGroup label="Artist" value={newPoolTrack.artist} onChange={v => setNewPoolTrack({...newPoolTrack, artist: v})} required />
               <InputGroup label="Title" value={newPoolTrack.title} onChange={v => setNewPoolTrack({...newPoolTrack, title: v})} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Genre</label><select value={newPoolTrack.genre} onChange={(e) => setNewPoolTrack({...newPoolTrack, genre: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none">{genres.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
               <InputGroup label="BPM" type="number" value={newPoolTrack.bpm} onChange={v => setNewPoolTrack({...newPoolTrack, bpm: Number(v)})} />
               <InputGroup label="Year" type="number" value={newPoolTrack.year} onChange={v => setNewPoolTrack({...newPoolTrack, year: Number(v)})} />
            </div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Categories / Hubs</label><div className="flex flex-wrap gap-2">{POOL_HUBS.map(hub => (<button key={hub} type="button" onClick={() => toggleTrackCategory(hub)} className={`px-3 py-1 rounded-full text-xs border transition ${newPoolTrack.category?.includes(hub) ? 'bg-brand-purple border-brand-purple text-white' : 'bg-transparent border-white/20 text-gray-400 hover:text-white'}`}>{hub}</button>))}</div></div>
            <div className="border-t border-white/10 pt-6"><div className="flex justify-between items-center mb-4"><h4 className="font-bold text-white">Versions</h4><button onClick={addVersionToTrack} className="text-xs bg-white/10 px-3 py-1.5 rounded text-white flex items-center gap-1"><Plus size={12} /> Add Version</button></div><div className="space-y-3">{newPoolTrack.versions.map((version, idx) => (<div key={version.id} className="flex gap-3 items-start bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex-1 grid grid-cols-2 gap-2">
                   <select value={version.type} onChange={(e) => updateVersion(version.id, 'type', e.target.value)} className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none">{TRACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                   <input type="text" value={version.label || ''} onChange={(e) => updateVersion(version.id, 'label', e.target.value)} placeholder="Label (e.g. Clean)" className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none" />
                   <input type="text" value={version.downloadUrl} onChange={(e) => updateVersion(version.id, 'downloadUrl', e.target.value)} placeholder="Download URL" className="col-span-2 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none" />
                </div>
                <button onClick={() => removeVersion(version.id)} className="text-red-500 hover:text-white"><X size={16} /></button>
            </div>))}</div></div>
            <div className="flex justify-end pt-4"><button onClick={handleSavePoolTrack} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Track</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'editGenre'} onClose={() => setActiveModal(null)} title="Edit Genre Cover">
         <div className="space-y-6">
            <InputGroup label="Genre Name" value={editingGenre.name} onChange={() => {}} placeholder="Genre Name" />
            <ImageUpload label="Cover Image" value={editingGenre.coverUrl} onChange={v => setEditingGenre({...editingGenre, coverUrl: v})} />
            <div className="flex justify-end"><button onClick={handleSaveGenre} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Genre</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'addProduct'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Product" : "Add New Product"} size="lg">
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-white/10 pb-2">
             <button onClick={() => setProductFormTab('type')} className={`px-4 py-2 text-sm font-bold uppercase ${productFormTab === 'type' ? 'text-brand-purple border-b-2 border-brand-purple' : 'text-gray-400'}`}>Type</button>
             <button onClick={() => setProductFormTab('basic')} className={`px-4 py-2 text-sm font-bold uppercase ${productFormTab === 'basic' ? 'text-brand-purple border-b-2 border-brand-purple' : 'text-gray-400'}`}>Basic Info</button>
             {newProduct.type === 'physical' && <button onClick={() => setProductFormTab('shipping')} className={`px-4 py-2 text-sm font-bold uppercase ${productFormTab === 'shipping' ? 'text-brand-purple border-b-2 border-brand-purple' : 'text-gray-400'}`}>Shipping</button>}
             {newProduct.type === 'digital' && <button onClick={() => setProductFormTab('digital')} className={`px-4 py-2 text-sm font-bold uppercase ${productFormTab === 'digital' ? 'text-brand-purple border-b-2 border-brand-purple' : 'text-gray-400'}`}>Files</button>}
             <button onClick={() => setProductFormTab('images')} className={`px-4 py-2 text-sm font-bold uppercase ${productFormTab === 'images' ? 'text-brand-purple border-b-2 border-brand-purple' : 'text-gray-400'}`}>Images</button>
          </div>

          {productFormTab === 'type' && (
             <div className="grid grid-cols-2 gap-4">
                <div onClick={() => updateProductField('type', 'physical')} className={`p-6 rounded-xl border cursor-pointer flex flex-col items-center gap-2 ${newProduct.type === 'physical' ? 'bg-brand-purple/20 border-brand-purple' : 'bg-black/20 border-white/10'}`}>
                   <Package size={32} />
                   <h3 className="font-bold">Physical Product</h3>
                   <p className="text-xs text-gray-400 text-center">Apparel, Equipment, Merch</p>
                </div>
                <div onClick={() => updateProductField('type', 'digital')} className={`p-6 rounded-xl border cursor-pointer flex flex-col items-center gap-2 ${newProduct.type === 'digital' ? 'bg-brand-purple/20 border-brand-purple' : 'bg-black/20 border-white/10'}`}>
                   <Download size={32} />
                   <h3 className="font-bold">Digital Product</h3>
                   <p className="text-xs text-gray-400 text-center">Music, Samples, Software</p>
                </div>
             </div>
          )}

          {productFormTab === 'basic' && (
             <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <InputGroup label="Product Name" value={newProduct.name} onChange={v => updateProductField('name', v)} required />
                   <InputGroup label="Price (KES)" type="number" value={newProduct.price} onChange={v => updateProductField('price', Number(v))} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <InputGroup label="Category" options={['Apparel', 'Accessories', 'Software', 'Samples', 'Laptops']} value={newProduct.category} onChange={v => updateProductField('category', v)} />
                   <InputGroup label="Status" options={['draft', 'published']} value={newProduct.status} onChange={v => updateProductField('status', v)} />
                </div>
                {newProduct.type === 'physical' && <InputGroup label="Stock Quantity" type="number" value={newProduct.stock} onChange={v => updateProductField('stock', Number(v))} />}
                <InputGroup label="Full Description" type="textarea" value={newProduct.description} onChange={v => updateProductField('description', v)} />
                <InputGroup label="Variants (comma separated)" value={variantsInput} onChange={setVariantsInput} placeholder="e.g. S, M, L, XL or Red, Blue" />
             </div>
          )}

          {productFormTab === 'digital' && (
             <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                <h4 className="font-bold text-blue-400 mb-2">Digital Delivery</h4>
                <InputGroup label="File Download URL" value={newProduct.digitalFileUrl} onChange={v => updateProductField('digitalFileUrl', v)} />
                <InputGroup label="Access Password (Optional)" value={newProduct.downloadPassword} onChange={v => updateProductField('downloadPassword', v)} />
                <InputGroup label="Access Control" options={['public', 'members_only']} value={newProduct.visibility} onChange={v => updateProductField('visibility', v)} />
             </div>
          )}

          {productFormTab === 'shipping' && (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <InputGroup label="Weight (kg)" value={newProduct.weight} onChange={v => updateProductField('weight', v)} />
                   <InputGroup label="Dimensions" value={newProduct.dimensions} onChange={v => updateProductField('dimensions', v)} />
                   <InputGroup label="SKU" value={newProduct.sku} onChange={v => updateProductField('sku', v)} />
                </div>
                <InputGroup label="Requires Shipping" type="checkbox" checked={newProduct.requiresShipping} onChange={v => updateProductField('requiresShipping', v)} />
             </div>
          )}

          {productFormTab === 'images' && (
             <div className="space-y-4">
                <ImageUpload label="Main Product Image" value={newProduct.image} onChange={v => updateProductField('image', v)} required />
                <MultiImageUpload label="Gallery Images" values={newProduct.images || []} onChange={v => updateProductField('images', v)} />
             </div>
          )}
          
          <div className="flex justify-end pt-4"><button onClick={handleSaveProduct} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Product</button></div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'addMixtape'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Mixtape" : "Upload New Mixtape"} size="lg">
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <InputGroup label="Mixtape Title" value={newMixtape.title} onChange={v => updateMixtapeField('title', v)} required />
               <InputGroup label="Genre" options={['Afrobeats', 'Amapiano', 'Hip Hop / Trap', 'Reggae', 'Dancehall']} value={newMixtape.genre} onChange={v => updateMixtapeField('genre', v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <InputGroup label="Release Date" type="date" value={newMixtape.releaseDate} onChange={v => updateMixtapeField('releaseDate', v)} />
               <InputGroup label="Duration" value={newMixtape.duration} onChange={v => updateMixtapeField('duration', v)} placeholder="e.g. 1:05:00" />
               <InputGroup label="Status" options={['draft', 'published']} value={newMixtape.status} onChange={v => updateMixtapeField('status', v)} />
            </div>
            <ImageUpload label="Cover Artwork" value={newMixtape.coverUrl} onChange={v => updateMixtapeField('coverUrl', v)} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <InputGroup label="Stream URL (Audio Player)" value={newMixtape.audioUrl} onChange={v => updateMixtapeField('audioUrl', v)} />
               <InputGroup label="Download Link (MP3)" value={newMixtape.downloadUrl} onChange={v => updateMixtapeField('downloadUrl', v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <InputGroup label="Video URL (MP4/YouTube)" value={newMixtape.videoDownloadUrl} onChange={v => updateMixtapeField('videoDownloadUrl', v)} />
               <InputGroup label="Download Type" options={['free', 'logged_in', 'music_pool']} value={newMixtape.downloadType} onChange={v => updateMixtapeField('downloadType', v)} />
            </div>
            <InputGroup label="Exclusive to Subscribers" type="checkbox" checked={newMixtape.isExclusive} onChange={v => updateMixtapeField('isExclusive', v)} />
            <div className="flex justify-end pt-4"><button onClick={handleSaveMixtape} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Mixtape</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'addCoupon'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Coupon" : "Create New Coupon"}>
         <div className="space-y-4">
            <InputGroup label="Coupon Code" value={newCoupon.code} onChange={v => setNewCoupon({...newCoupon, code: v.toUpperCase()})} required />
            <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Type" options={['percentage', 'fixed']} value={newCoupon.discountType} onChange={v => setNewCoupon({...newCoupon, discountType: v})} />
               <InputGroup label="Value" type="number" value={newCoupon.discountValue} onChange={v => setNewCoupon({...newCoupon, discountValue: Number(v)})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Applies To" options={['store', 'subscription', 'booking', 'all']} value={newCoupon.appliesTo} onChange={v => setNewCoupon({...newCoupon, appliesTo: v})} />
               <InputGroup label="Expiry Date" type="date" value={newCoupon.expiryDate} onChange={v => setNewCoupon({...newCoupon, expiryDate: v})} />
            </div>
            
            {newCoupon.appliesTo === 'subscription' && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Applicable Plans</label>
                    <div className="flex flex-wrap gap-2">
                        {subscriptionPlans.map(plan => (
                            <button
                                key={plan.id}
                                onClick={() => {
                                    const current = newCoupon.applicablePlans || [];
                                    const next = current.includes(plan.id) ? current.filter(id => id !== plan.id) : [...current, plan.id];
                                    setNewCoupon({...newCoupon, applicablePlans: next});
                                }}
                                className={`px-3 py-1 rounded text-xs border ${newCoupon.applicablePlans?.includes(plan.id) ? 'bg-brand-purple border-brand-purple text-white' : 'border-white/20 text-gray-400'}`}
                            >
                                {plan.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <InputGroup label="Usage Limit" type="number" value={newCoupon.usageLimit} onChange={v => setNewCoupon({...newCoupon, usageLimit: Number(v)})} />
            <InputGroup label="Active" type="checkbox" checked={newCoupon.active} onChange={v => setNewCoupon({...newCoupon, active: v})} />
            <div className="flex justify-end pt-4"><button onClick={handleSaveCoupon} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Coupon</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'shipOrder'} onClose={() => setActiveModal(null)} title="Mark Order Shipped">
         <div className="space-y-4">
            <p className="text-gray-400 text-sm mb-4">Send tracking information to <b>{selectedOrder?.customerName}</b>.</p>
            <InputGroup label="Courier Name" value={shippingDetails.courierName} onChange={v => setShippingDetails({...shippingDetails, courierName: v})} placeholder="e.g. G4S, Wells Fargo" />
            <InputGroup label="Tracking Number" value={shippingDetails.trackingNumber} onChange={v => setShippingDetails({...shippingDetails, trackingNumber: v})} />
            <InputGroup label="Estimated Arrival" type="date" value={shippingDetails.estimatedArrival} onChange={v => setShippingDetails({...shippingDetails, estimatedArrival: v})} />
            <div className="flex justify-end pt-4"><button onClick={handleShipOrder} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white flex items-center gap-2"><Truck size={18} /> Confirm Shipment</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'userDetail'} onClose={() => setActiveModal(null)} title="User Profile" size="lg">
         {selectedUser && (
            <div className="space-y-8">
               <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                  <div className="w-20 h-20 bg-gray-800 rounded-full overflow-hidden">
                     {selectedUser.avatarUrl ? <img src={selectedUser.avatarUrl} className="w-full h-full object-cover" /> : <Users size={40} className="m-auto mt-5 text-gray-500" />}
                  </div>
                  <div>
                     <h2 className="text-2xl font-bold text-white">{selectedUser.name}</h2>
                     <p className="text-gray-400">{selectedUser.email}</p>
                     <div className="flex gap-2 mt-2">
                        <span className="bg-white/10 px-2 py-1 rounded text-xs capitalize">{selectedUser.role}</span>
                        {selectedUser.isSubscriber && <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs">Subscriber ({selectedUser.subscriptionPlan})</span>}
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                     <h3 className="font-bold text-white mb-4">Account Status</h3>
                     <div className="space-y-2 text-sm">
                        <p className="text-gray-400 flex justify-between"><span>Status:</span> <span className="text-white capitalize">{selectedUser.status}</span></p>
                        <p className="text-gray-400 flex justify-between"><span>Last Login:</span> <span className="text-white">{selectedUser.lastLogin}</span></p>
                        <p className="text-gray-400 flex justify-between"><span>Expiry:</span> <span className="text-white">{selectedUser.subscriptionExpiry || 'N/A'}</span></p>
                     </div>
                  </div>
                  <div>
                     <h3 className="font-bold text-white mb-4">Admin Actions</h3>
                     <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleUserAction(selectedUser.id, 'reset')} className="px-3 py-2 bg-white/10 rounded hover:bg-white/20 text-xs">Reset Password</button>
                        <button onClick={() => handleUserAction(selectedUser.id, 'ban')} className="px-3 py-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 text-xs">Suspend User</button>
                        <button onClick={() => handleUserAction(selectedUser.id, 'activate')} className="px-3 py-2 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30 text-xs">Activate User</button>
                        <button onClick={() => handleUserAction(selectedUser.id, 'grant_pool')} className="px-3 py-2 bg-brand-purple/20 text-brand-purple rounded hover:bg-brand-purple/30 text-xs">Grant Pool Access</button>
                     </div>
                  </div>
               </div>

               <div>
                  <h3 className="font-bold text-white mb-4">Recent History</h3>
                  <div className="bg-black/20 rounded-lg p-4 text-center text-gray-500 text-sm">
                     User history logs (orders, downloads) would appear here.
                  </div>
               </div>
            </div>
         )}
      </Modal>

      <Modal isOpen={activeModal === 'addBooking'} onClose={() => setActiveModal(null)} title={isEditing ? "Edit Booking" : "New Manual Booking"}>
         <div className="space-y-4">
            <InputGroup label="Client Name" value={newBooking.clientName} onChange={v => setNewBooking({...newBooking, clientName: v})} required />
            <InputGroup label="Service Type" value={newBooking.serviceType} onChange={v => setNewBooking({...newBooking, serviceType: v})} />
            <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Date" type="date" value={newBooking.date} onChange={v => setNewBooking({...newBooking, date: v})} />
               <InputGroup label="Time" type="time" value={newBooking.time} onChange={v => setNewBooking({...newBooking, time: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Amount" type="number" value={newBooking.amount} onChange={v => setNewBooking({...newBooking, amount: Number(v)})} />
               <InputGroup label="Status" options={['pending', 'confirmed', 'completed', 'cancelled']} value={newBooking.status} onChange={v => setNewBooking({...newBooking, status: v})} />
            </div>
            <div className="flex justify-end pt-4"><button onClick={handleSaveBooking} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Booking</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'addSessionType'} onClose={() => setActiveModal(null)} title="Manage Session Type">
         <div className="space-y-4">
            <InputGroup label="Service Name" value={newSessionType.name} onChange={v => setNewSessionType({...newSessionType, name: v})} required />
            <InputGroup label="Price (KES)" type="number" value={newSessionType.price} onChange={v => setNewSessionType({...newSessionType, price: Number(v)})} />
            <InputGroup label="Duration (Hours)" type="number" value={newSessionType.duration} onChange={v => setNewSessionType({...newSessionType, duration: Number(v)})} />
            <InputGroup label="Description" type="textarea" value={newSessionType.description} onChange={v => setNewSessionType({...newSessionType, description: v})} />
            <div className="flex justify-end pt-4"><button onClick={handleSaveSessionType} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Service</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'addEquipment'} onClose={() => setActiveModal(null)} title="Manage Equipment">
         <div className="space-y-4">
            <InputGroup label="Equipment Name" value={newEquipment.name} onChange={v => setNewEquipment({...newEquipment, name: v})} required />
            <InputGroup label="Category" options={['Microphones', 'Monitoring & Acoustics', 'Hardware & Interface', 'Other']} value={newEquipment.category} onChange={v => setNewEquipment({...newEquipment, category: v})} />
            <ImageUpload label="Equipment Image" value={newEquipment.image} onChange={v => setNewEquipment({...newEquipment, image: v})} />
            <InputGroup label="Description" type="textarea" value={newEquipment.description} onChange={v => setNewEquipment({...newEquipment, description: v})} />
            <div className="flex justify-end pt-4"><button onClick={handleSaveEquipment} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Equipment</button></div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'addChannel'} onClose={() => setActiveModal(null)} title="Manage Telegram Channel">
         <div className="space-y-4">
            <InputGroup label="Channel Name" value={newChannel.name} onChange={v => setNewChannel({...newChannel, name: v})} required />
            <InputGroup label="Channel ID" value={newChannel.channelId} onChange={v => setNewChannel({...newChannel, channelId: v})} placeholder="-100..." />
            <InputGroup label="Genre / Category" value={newChannel.genre} onChange={v => setNewChannel({...newChannel, genre: v})} />
            <InputGroup label="Invite Link" value={newChannel.inviteLink} onChange={v => setNewChannel({...newChannel, inviteLink: v})} />
            <InputGroup label="Active" type="checkbox" checked={newChannel.active} onChange={v => setNewChannel({...newChannel, active: v})} />
            <div className="flex justify-end pt-4"><button onClick={handleSaveChannel} className="bg-brand-purple px-8 py-3 rounded-lg font-bold text-white">Save Channel</button></div>
         </div>
      </Modal>

    </div>
  );
};

export default AdminDashboard;
