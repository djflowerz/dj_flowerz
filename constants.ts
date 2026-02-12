
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
  "Bongo Flava (TBT) Hype", "Bongo TBT Low Hype",
  "House", "Techno", "Jazz", "Classical", "Pop", "Rock", "Metal",
  "Country", "Blues", "Funk", "Disco", "Afro-House", "Deep House"
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

// All data below will be fetched from Firebase Firestore
export const POOL_TRACKS: Track[] = [];

export const FEATURED_MIXTAPES: Mixtape[] = [];

export const PRODUCTS: Product[] = [];

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

export const YOUTUBE_VIDEOS = [];

export const INITIAL_STUDIO_EQUIPMENT: StudioEquipment[] = [];

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

export const MOCK_SUBSCRIBERS: NewsletterSubscriber[] = [];
