import { Mixtape, Product, Track, StudioEquipment, ShippingZone, NewsletterSubscriber, Genre } from './types';

export const KENYAN_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi',
  'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
  'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia',
  'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru',
  'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma',
  'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira'
];

// --- SHIPPING DATA ---
export const SHIPPING_ZONES_CONFIG = {
  'zone1': { name: 'Zone 1 (Nairobi)', towns: ['Nairobi'] },
  'zone2': { name: 'Zone 2 (Greater Nairobi)', towns: ['Kitengela', 'Kangundo', 'Kiambu', 'Tala', 'Gatundu', 'Athi River', 'Kikuyu', 'Thika'] },
  'zone3': { name: 'Zone 3 (Central / Rift / Lake)', towns: ['Limuru', 'Nanyuki', 'Naivasha', 'Meru', 'Gilgil', 'Chogoria', 'Nakuru', 'Maua', 'Kisumu', 'Kajiado', 'Eldoret'] },
  'zone4': { name: 'Zone 4 (Western / Central)', towns: ['Kericho', 'Kakamega', 'Embu', 'Karatina', 'Kerugoya', 'Kianyaga', 'Kutus', 'Nyeri'] },
  'zone5': { name: 'Zone 5 (Upcountry)', towns: ['Awendo', 'Bungoma', 'Busia', 'Homabay', 'Iten', 'Kaviani', 'Kilgore', 'Kimilili', 'Kisii', 'Litein', 'Mariakani', 'Migori', 'Mojo', 'Mumias', 'Oyugis', 'Rongo', 'Siaya', 'Sotik', 'Suneka', 'Webuye', 'Wundanyi'] },
  'zone6': { name: 'Zone 6 (Coast)', towns: ['Diani', 'Kilifi', 'Malindi', 'Mombasa', 'Ukunda', 'Vipingo', 'Watamu'] }
};

export const SHIPPING_RATES_MATRIX: Record<string, Record<string, number>> = {
  'zone1': { 'small': 160, 'medium': 250, 'large': 700 },
  'zone2': { 'small': 210, 'medium': 320, 'large': 850 },
  'zone3': { 'small': 260, 'medium': 400, 'large': 1000 },
  'zone4': { 'small': 310, 'medium': 480, 'large': 1150 },
  'zone5': { 'small': 360, 'medium': 560, 'large': 1300 },
  'zone6': { 'small': 410, 'medium': 650, 'large': 1450 }
};

// Map important towns to zones for auto-selection
export const TOWN_TO_ZONE_MAP: Record<string, string> = Object.entries(SHIPPING_ZONES_CONFIG).reduce((acc, [id, config]) => {
  config.towns.forEach(town => {
    acc[town.toLowerCase()] = id;
  });
  return acc;
}, {} as Record<string, string>);

// --- MUSIC POOL DATA ---
export const POSTER_URL = 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=1600&h=600&fit=crop&q=80';

export const POOL_HUBS = [
  'New Uploads',
  'Kenya Love Songs (Hype)',
  'Kenya Love Songs (Low Hype)',
  'Kikuyu Gospel (Kigoco)',
  'Bongo TZ Hype',
  'Bongo Flava (TBT) (TZ) Hype',
  'Bongo Flava (TBT) (TZ)Low Hype',
  'Afrobeat (Oldies)',
  'Remix & Mashups Hub',
  'Redrums Video Remixes',
  "Riddimz F'",
  '2026 VIDEO POOL EDITS',
  '2025 VIDEO POOL EDITS',
  '2024 VIDEO POOL EDITS',
  '2023 VIDEO POOL EDITS',
  '2022 VIDEO POOL EDITS',
  '2021 VIDEO POOL EDITS',
  '2020 VIDEO POOL EDITS',
  'Riddim Videos',
  'Afrohouse',
  'Reggae Fussion',
  'Amapiano',
  'Dancehall Edits',
  'Club Edits',
  'HYPE EDITS',
  'RnB Remixes',
  '3 Step Amapiano',
  'South Africa Amapiano',
  'Reggae Covers',
  'Afro Beats (TBT)',
  'Mugithi Covers (Kikuyu)',
  'Taarabu',
  'Afro Amapiano'
];

// Month names for filtering year-based edits
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const POOL_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export const GENRE_NAMES = [
  "New Uploads", "Remix & Mashups Hub", "Redrums Video Remixes", "Riddimz F'",
  "3 Step Amapiano", "South Africa Amapiano", "Reggae Covers", "Afrobeats (TBT)",
  "Mugithi Covers", "Taarabu", "Afro Amapiano", "Mugithi Kikuyu", "Souls",
  "East Africa TBT (Low Hype)", "East Africa TBT (Hype)", "Urban Pop (Low Hype)",
  "Urban Pop (Hype)", "EDMs", "Urban Pop", "Gospel Urban", "Drill Rhumba",
  "Kenya Love Songs (Hype)", "Kenya Love Songs (Low Hype)", "RnB (Low Hype)",
  "Dancehall (Low Hype)", "Bongo TZ Hype", "UG Music", "Dancehall (Hype)",
  "RnB (Hype)", "Ragga (Low Hype)", "Afrobeats (Naija) Hype", "Ragga Hype",
  "HipHop", "Basshall Dancehall", "Kikuyu Gospel (Kigoco)", "Arbantone & Gengetone",
  "Rhumba", "Bongo Hype", "Reggae Hype", "Reggae Videos", "254 Pop Sound",
  "Crunk", "Roots Hype", "Reggae Gospel", "90's Hits", "Luo Hits",
  "Tanzania Amapiano", "Kenyan Amapiano", "Urban Amapiano", "Dombolo",
  "Bongo Flava (TBT) (TZ) Hype", "Bongo Flava (TBT) (TZ)Low Hype",
  "House", "Techno", "Jazz", "Classical", "Pop", "Rock", "Metal",
  "Country", "Blues", "Funk", "Disco", "Afro-House", "Deep House",
  "Moombahton", "Afrobeat (Oldies)", "Baila", "Soca", "Zouk", "Kwaito",
  "Gqom", "Trap", "K-Pop", "Latin Pop", "Salsa", "Bachata", "Kizomba",
  "Semba", "Makossa", "Highlife", "Hiplife", "Bongo Mixes", "Coupe Decale",
  "Drill", "Grime", "Rumba Congolaise", "Ethio-Jazz", "Habesha Mix"
];

export const MIXTAPE_GENRE_NAMES = [
  "3-Step & Amapiano",
  "Bongo",
  "Gospel",
  "Arbantone",
  "Afropop & Afrobeats",
  "Rap & Hip Hop",
  "R&B & Soul",
  "Reggae",
  "Dancehall",
  "Club Bangers",
  "Kenyan",
  "Soul",
  "Pop",
  "Secular"
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
    name: '👑 1 Year Ultimate DJ Pass',
    price: 6000,
    period: 'yr',
    features: [
      '12 months uninterrupted full access',
      'Unlimited downloads for 1 full year',
      'Access to all new & old music releases',
      'Complete Redrum Packs included',
      'Fully sorted music by genre & vibe',
      'Weekly & monthly updates guaranteed',
      'Access to mashups & exclusive DJ edits',
      'High-quality, DJ-ready MP3 files',
      'Save Ksh 2400 compared to shorter plans ✅',
      'Best value for serious DJs building a long-term library'
    ],
    isBestValue: true,
    active: true
  },
  {
    id: '6months',
    name: '🔥 6 Months Elite DJ Access',
    price: 3500,
    period: '6mo',
    features: [
      'Full 6 months unlimited access',
      'Access to all new & old releases',
      'Complete Redrum Packs included',
      'Access to sorted music by genre & vibe',
      'Monthly & weekly uploads included',
      'Full access to mashups & exclusive edits',
      'High-quality, DJ-ready downloads',
      '200 downloads per day',
      'Save Ksh 700 compared to monthly plans',
      'Perfect for serious, consistent working DJs'
    ],
    isEliteChoice: true,
    active: true
  },
  {
    id: '3months',
    name: '🚀 3 Months Club Power Access',
    price: 1800,
    period: '3mo',
    features: [
      '3 months full access to new & old releases',
      'Access to all new music updates',
      'Music sorted by genre for easy selection',
      'Organized by energy level (Hype & Low Hype)',
      'Full access to all redrums',
      'Access to the complete Mashups folder',
      'DJ-ready, high-quality downloads',
      '200 downloads per day',
      'Perfect for DJs who want to stay fully equipped long-term'
    ],
    active: true
  },
  {
    id: 'monthly',
    name: '🔥 1 Month Pro DJ Access',
    price: 700,
    period: 'mo',
    features: [
      '30 days full access to new & old releases',
      'Includes exclusive redrums & DJ edits',
      'Music sorted by genre for easy crate digging',
      'Organized by energy level (Hype & Low Hype)',
      'DJ-ready, high-quality MP3 downloads',
      '200 downloads per day',
      'Perfect for fully equipped working DJs',
      'Stay updated all month long'
    ],
    active: true
  },
  {
    id: 'weekly',
    name: '🎧 1 Week Remix & Fresh Drops Access',
    price: 300,
    period: 'wk',
    features: [
      '30 DJ-Ready Downloads Per Day',
      'High Quality MP3 (Club Tested)',
      'Instant Access to Fresh Drops',
      'Perfect for Weekend Gigs',
      'No Commitment – Plug & Play'
    ],
    active: true
  },
  {
    id: 'trial',
    name: '1 Week Free Trial',
    price: 0,
    period: 'trial',
    features: ['10 Downloads / Day', 'Limited Access', 'One-time Use Only'],
    active: true,
    isTrial: true,
    promoExpiry: '2026-04-04'
  }
];


export const YOUTUBE_VIDEOS = [];

export const INITIAL_STUDIO_EQUIPMENT: StudioEquipment[] = [];

export const INITIAL_SHIPPING_ZONES: ShippingZone[] = Object.entries(SHIPPING_ZONES_CONFIG).map(([id, config]) => ({
  id,
  name: config.name,
  description: `Delivery to ${config.towns.slice(0, 3).join(', ')} and surrounding areas.`,
  rates: [
    { id: `${id}_door`, type: 'express', price: SHIPPING_RATES_MATRIX[id].small, label: 'Door-to-Door Delivery', timeline: '1-3 Business Days' }
  ]
}));

export const INITIAL_SUBSCRIBERS: NewsletterSubscriber[] = [];
