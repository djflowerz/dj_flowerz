
import { Mixtape, Product, Track, StudioEquipment, ShippingZone, NewsletterSubscriber, Genre } from './types';

// --- MUSIC POOL DATA ---

export const POOL_HUBS = [
  'New Uploads',
  'Redrums',
  'Mashups Hub',
  'Video Redrums', 
  'Audio Redrums',
  'Afrohouse',
  'Reggae Fussion',
  'Amapiano',
  'Dancehall Edits',
  'Club Edits',
  'Hype Edits',
  'Amapiano Redrum Edits',
  'RnB Remixes'
];

export const POOL_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export const GENRE_NAMES = [
  "3-step Amapiano", "South Africa Amapiano", "Reggae Covers", "Afrobeats (TBT)", 
  "Mugithi Covers", "Taarabu", "Afro Amapiano", "Mugithi Kikuyu", "Souls", 
  "East Africa TBT (Low Hype)", "East Africa TBT (Hype)", "Urban Pop (Low Hype)", 
  "Urban Pop (Hype)", "EDMs", "Urban Pop", "Gospel Urban", "Drill Rhumba", 
  "Kenyan Love Songs (Low Hype)", "Kenyan Love Songs Hype", "RnB (Low Hype)", 
  "Dancehall (Low Hype)", "Bongo TZ Hype", "UG Music", "Dancehall (Hype)", 
  "RnB (Hype)", "Ragga (Low Hype)", "Afrobeats (Naija) Hype", "Ragga Hype", 
  "HipHop", "Basshall Dancehall", "Kikuyu Gospel (Kigocco)", "Arbantone & Gengetone", 
  "Rhumba", "Bongo Hype", "Reggae Hype", "Reggae Videos", "254 Pop Sound", 
  "Crunk", "Roots Hype", "Reggae Gospel", "90's Hits", "Luo Hits", 
  "Tanzania Amapiano", "Kenyan Amapiano", "Urban Amapiano", "Dombolo", 
  "Bongo Flava (TBT) Hype", "Bongo TBT Low Hype"
];

// Initial genres with placeholder images (Admin can update these)
export const INITIAL_GENRES: Genre[] = GENRE_NAMES.map((name, i) => ({
  id: `g_${i}`,
  name,
  coverUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=512&font-size=0.33` 
}));

export const TRACK_TYPES = [
  'Original', 'Remix', 'Acapella', 'Instrumental', 'Clean Edit', 'Dirty Edit', 'Extendz', 'Redrum', 'Intro - Clean', 'Intro - Dirty', 'Outro', 'Mashup'
];

export const POOL_TRACKS: Track[] = [
  { 
    id: 't1', 
    artist: 'Bob Marley & The Wailers', 
    title: 'Could You Be Loved', 
    genre: 'Reggae Fussion', 
    category: ['Redrums', 'New Uploads'],
    bpm: 103, 
    year: 2024,
    dateAdded: '2024-01-15',
    versions: [
      { id: 'v1', type: 'Remix', label: 'LP Giobbi Remix', downloadUrl: '#' },
      { id: 'v2', type: 'Clean Edit', label: 'Clean Extended', downloadUrl: '#' },
      { id: 'v3', type: 'Instrumental', label: 'Instrumental', downloadUrl: '#' }
    ]
  },
  { 
    id: 't2', 
    artist: 'Burna Boy', 
    title: 'City Boys', 
    genre: 'Afrobeats (Naija) Hype', 
    category: ['New Uploads'],
    bpm: 100, 
    year: 2023,
    dateAdded: '2023-11-20',
    versions: [
      { id: 'v4', type: 'Intro - Dirty', label: 'Intro', downloadUrl: '#' },
      { id: 'v5', type: 'Dirty Edit', label: 'Dirty', downloadUrl: '#' }
    ]
  },
  { 
    id: 't3', 
    artist: 'Tyler ICU', 
    title: 'Mnike', 
    genre: 'South Africa Amapiano', 
    category: ['Amapiano', 'Hype Edits'],
    bpm: 112, 
    year: 2023,
    dateAdded: '2023-11-10',
    versions: [
      { id: 'v6', type: 'Original', label: 'Original Mix', downloadUrl: '#' },
      { id: 'v7', type: 'Redrum', label: 'Hype Redrum', downloadUrl: '#' }
    ]
  },
  { 
    id: 't4', 
    artist: 'Sean Paul', 
    title: 'Get Busy', 
    genre: 'Dancehall (Hype)', 
    category: ['Dancehall Edits', 'Redrums'],
    bpm: 100, 
    year: 2020,
    dateAdded: '2020-05-15',
    versions: [
        { id: 'v8', type: 'Extendz', label: 'Extended Mix', downloadUrl: '#' }
    ]
  },
];

export const FEATURED_MIXTAPES: Mixtape[] = [
  {
    id: '1',
    title: 'Nairobi Nights Vol. 4',
    slug: 'nairobi-nights-vol-4',
    genre: 'Afrobeats',
    coverUrl: 'https://picsum.photos/seed/mix1/400/400',
    duration: '54:30',
    isExclusive: false,
    date: '2023-11-01',
    releaseDate: '2023-11-01',
    description: 'The ultimate weekend starter pack featuring the hottest Afrobeats hits from Nairobi.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    downloadUrl: '#',
    videoDownloadUrl: '#',
    status: 'published',
    allowFullStream: true,
    allowDownload: true,
    downloadType: 'free',
    streamQuality: 'high',
    tracklist: [],
    isFeatured: true,
    showInGallery: true,
    showInMusicPool: true,
    tags: ['Nairobi', 'Afrobeats'],
    enableComments: true,
    requireLoginToComment: false,
    moderateComments: false
  },
  {
    id: '2',
    title: 'Trap Soul Sessions',
    slug: 'trap-soul-sessions',
    genre: 'Hip Hop / Trap',
    coverUrl: 'https://picsum.photos/seed/mix2/400/400',
    duration: '48:15',
    isExclusive: false,
    date: '2023-10-25',
    releaseDate: '2023-10-25',
    description: 'Late night vibes with deep bass and soulful melodies.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    downloadUrl: '#',
    videoDownloadUrl: '#',
    status: 'published',
    allowFullStream: true,
    allowDownload: true,
    downloadType: 'logged_in',
    streamQuality: 'standard',
    tracklist: [],
    isFeatured: true,
    showInGallery: true,
    showInMusicPool: false,
    tags: ['Trap', 'Soul'],
    enableComments: true,
    requireLoginToComment: true,
    moderateComments: false
  },
  {
    id: '3',
    title: 'Amapiano Grooves 2025',
    slug: 'amapiano-grooves-2025',
    genre: 'Amapiano',
    coverUrl: 'https://picsum.photos/seed/mix3/400/400',
    duration: '62:00',
    isExclusive: true, // Music Pool only
    date: '2023-10-15',
    releaseDate: '2023-10-15',
    description: 'Exclusive Amapiano cuts straight from the source.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    downloadUrl: '#',
    videoDownloadUrl: '#',
    status: 'published',
    allowFullStream: true,
    allowDownload: true,
    downloadType: 'music_pool',
    streamQuality: 'high',
    tracklist: [],
    isFeatured: true,
    showInGallery: true,
    showInMusicPool: true,
    tags: ['Amapiano', 'Deep House'],
    enableComments: true,
    requireLoginToComment: true,
    moderateComments: true
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'DJ FLOWERZ Official Tee',
    slug: 'dj-flowerz-official-tee',
    price: 2500,
    currency: 'KES',
    category: 'Apparel',
    type: 'physical',
    image: 'https://picsum.photos/seed/tee/400/400',
    images: ['https://picsum.photos/seed/tee/400/400', 'https://picsum.photos/seed/tee2/400/400'],
    shortDescription: 'Premium cotton t-shirt with official branding.',
    description: 'Premium cotton t-shirt with official DJ Flowerz branding. Durable print and comfortable fit.',
    isHot: true,
    hasVariants: true,
    variants: ['S', 'M', 'L', 'XL', 'XXL'], // Legacy simple variants
    variantOptions: [{ name: 'Size', options: ['S', 'M', 'L', 'XL', 'XXL'] }],
    trackStock: true,
    stock: 50,
    requiresShipping: true,
    isActive: true,
    visibility: 'public',
    tags: ['Merch', 'Apparel'],
    whatsappEnabled: true,
    status: 'published'
  },
  {
    id: 'p2',
    name: 'Sound FX Pack Vol. 1',
    slug: 'sound-fx-pack-vol-1',
    price: 1500,
    currency: 'KES',
    category: 'Samples',
    type: 'digital',
    image: 'https://picsum.photos/seed/sfx/400/400',
    shortDescription: 'High quality sound effects.',
    description: 'Over 100 high-quality sound effects for DJs and producers. Wav format.',
    variants: ['Standard License'],
    hasVariants: false,
    trackStock: false,
    stock: 9999,
    requiresShipping: false,
    isActive: true,
    visibility: 'public',
    tags: ['Digital', 'Sounds'],
    whatsappEnabled: false,
    status: 'published',
    digitalFileUrl: 'https://mega.nz/file/example',
    downloadPassword: 'FLOW-2023-SFX'
  },
  {
    id: 'p3',
    name: 'MacBook Pro DJ Setup',
    slug: 'macbook-pro-dj',
    price: 180000,
    currency: 'KES',
    category: 'Laptops',
    os: 'macOS',
    type: 'physical',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?auto=format&fit=crop&q=80&w=400',
    shortDescription: 'Powerful laptop optimized for Serato.',
    description: 'Refurbished MacBook Pro, perfect for live gigs.',
    hasVariants: false,
    trackStock: true,
    stock: 2,
    requiresShipping: true,
    isActive: true,
    visibility: 'public',
    tags: ['Tech', 'DJ Gear'],
    whatsappEnabled: true,
    status: 'published'
  },
  {
    id: 'p4',
    name: 'Private Remix Pack',
    slug: 'private-remix-pack',
    price: 5000,
    currency: 'KES',
    category: 'Software',
    type: 'digital',
    image: 'https://picsum.photos/seed/remix/400/400',
    shortDescription: 'Exclusive remixes.',
    description: 'Exclusive remixes not available anywhere else.',
    isHot: true,
    variants: ['Mp3 320kbps'],
    hasVariants: false,
    trackStock: false,
    stock: 9999,
    requiresShipping: false,
    isActive: true,
    visibility: 'members_only',
    tags: ['Music', 'Exclusive'],
    whatsappEnabled: false,
    status: 'published',
    digitalFileUrl: 'https://drive.google.com/file/d/example',
    downloadPassword: 'REMIX-VIP-2024'
  },
  {
    id: 'p5',
    name: 'Free DJ Drops',
    slug: 'free-dj-drops',
    price: 0,
    currency: 'KES',
    category: 'Samples',
    type: 'digital',
    image: 'https://picsum.photos/seed/drops/400/400',
    shortDescription: 'Essential vocal drops for your mix.',
    description: 'A collection of standard DJ drops available for free download.',
    hasVariants: false,
    trackStock: false,
    stock: 9999,
    requiresShipping: false,
    isActive: true,
    visibility: 'public',
    tags: ['Free', 'Drops'],
    whatsappEnabled: false,
    status: 'published',
    digitalFileUrl: 'https://dropbox.com/s/example',
    downloadPassword: 'No Password'
  }
];

export const SUBSCRIPTION_PLANS = [
  {
    id: 'yearly',
    name: '12 Months',
    price: 6000,
    period: 'yr',
    features: ['Unlimited Downloads', 'Priority Support', 'Exclusive Edits', 'Video Mixes'],
    link: 'https://paystack.shop/pay/po2leez4hy',
    isBestValue: true
  },
  {
    id: '6months',
    name: '6 Months',
    price: 3500,
    period: '6mo',
    features: ['Unlimited Downloads', 'Exclusive Edits', 'Video Mixes'],
    link: 'https://paystack.shop/pay/5p4gjiehpv'
  },
  {
    id: '3months',
    name: '3 Months',
    price: 1800,
    period: '3mo',
    features: ['Unlimited Downloads', 'Exclusive Edits'],
    link: 'https://paystack.shop/pay/ayljjgzxzp'
  },
  {
    id: 'monthly',
    name: '1 Month',
    price: 700,
    period: 'mo',
    features: ['Unlimited Downloads'],
    link: 'https://paystack.shop/pay/u0qw529xyk'
  },
  {
    id: 'weekly',
    name: '1 Week',
    price: 200,
    period: 'wk',
    features: ['7 Days Access'],
    link: 'https://paystack.shop/pay/7u8-7dn081'
  }
];

export const YOUTUBE_VIDEOS = [
  { id: 'v1', title: 'Live at Nairobi Fest', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  { id: 'v2', title: 'Studio Session Vlog', thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
  { id: 'v3', title: 'Amapiano Mix Visuals', thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
];

export const INITIAL_STUDIO_EQUIPMENT: StudioEquipment[] = [
  { id: 'eq1', name: 'Neumann U87 Ai', category: 'Microphones', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq2', name: 'Sony C800G', category: 'Microphones', image: 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq3', name: 'Shure SM7B', category: 'Microphones', image: 'https://images.unsplash.com/photo-1558584852-7b8c2c31e97d?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq4', name: 'AKG C414 XLII', category: 'Microphones', image: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq5', name: 'Yamaha HS8 Monitors', category: 'Monitoring & Acoustics', image: 'https://images.unsplash.com/photo-1558770147-a75d713c242c?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq6', name: 'Avantone Mixcubes', category: 'Monitoring & Acoustics', image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq7', name: 'Universal Audio Apollo x8p', category: 'Hardware & Interface', image: 'https://images.unsplash.com/photo-1519508234439-4f23643125c1?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq8', name: 'Tube-Tech CL 1B', category: 'Hardware & Interface', image: 'https://images.unsplash.com/photo-1563330232-5711c00f60f6?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq9', name: 'SSL Fusion', category: 'Hardware & Interface', image: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq10', name: 'Moog Sub 37', category: 'Production Materials', image: 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&q=80&w=600' },
  { id: 'eq11', name: 'Acoustic Panels', category: 'Production Materials', image: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&q=80&w=600' },
];

export const INITIAL_SHIPPING_ZONES: ShippingZone[] = [
  { 
    id: 'nbi_central', 
    name: 'Nairobi (Central/West/East)', 
    description: 'Westlands, Kileleshwa, Embakasi, Langata, Upperhill, Hurlingham, Kasarani, Ruaraka, Kibra, Dagoretti South',
    rates: [
      { id: 'r1', type: 'instant', price: 600, label: 'Instant Delivery', timeline: '4 Hours (Mon-Sat, 9am-5pm)' },
      { id: 'r2', type: 'express', price: 400, label: 'Express Delivery', timeline: '1 Day (Mon-Sat)' },
      { id: 'r3', type: 'standard', price: 250, label: 'Standard Shipping', timeline: '1-3 Days (Mon-Sat)' }
    ]
  },
  { 
    id: 'nbi_greater', 
    name: 'Greater Nairobi', 
    description: 'Kiambu Town, Thika Town, Syokimau, Mlolongo, Athi River',
    rates: [
      { id: 'r4', type: 'express', price: 500, label: 'Express Delivery', timeline: '1 Day (Mon-Sat)' },
      { id: 'r5', type: 'standard', price: 300, label: 'Standard Shipping', timeline: '1-3 Days (Mon-Sat)' }
    ]
  },
  { 
    id: 'major_towns', 
    name: 'Major Towns', 
    description: 'Mombasa, Eldoret, Naivasha, Kisumu',
    rates: [
      { id: 'r6', type: 'express', price: 800, label: 'Express Delivery', timeline: '1-2 Days (Mon-Sat)' },
      { id: 'r7', type: 'standard', price: 550, label: 'Standard Shipping', timeline: '3-4 Days (Mon-Sat)' }
    ]
  },
  { 
    id: 'regional_1', 
    name: 'Western / Coast Region', 
    description: 'Bungoma, Busia, Kilifi, Kisii',
    rates: [
      { id: 'r8', type: 'express', price: 950, label: 'Express Delivery', timeline: '2-3 Days (Mon-Sat)' },
      { id: 'r9', type: 'standard', price: 650, label: 'Standard Shipping', timeline: '4-5 Days (Mon-Sat)' }
    ]
  },
  { 
    id: 'regional_2', 
    name: 'Other Regions', 
    description: 'Kakamega, Kericho, Siaya, Turkana, Isiolo',
    rates: [
      { id: 'r10', type: 'express', price: 1200, label: 'Express Delivery', timeline: '3-4 Days (Mon-Sat)' },
      { id: 'r11', type: 'standard', price: 850, label: 'Standard Shipping', timeline: '5-6 Days (Mon-Sat)' }
    ]
  }
];

export const MOCK_SUBSCRIBERS: NewsletterSubscriber[] = [
  { id: 'sub1', email: 'john.doe@example.com', dateSubscribed: '2023-10-01', status: 'active' },
  { id: 'sub2', email: 'jane.smith@test.com', dateSubscribed: '2023-10-05', status: 'active' },
  { id: 'sub3', email: 'dj.mike@mix.com', dateSubscribed: '2023-11-12', status: 'unsubscribed' },
  { id: 'sub4', email: 'fan123@gmail.com', dateSubscribed: '2023-11-15', status: 'active' },
];
