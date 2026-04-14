import { getAuthorizedUser, isAdminEmail } from '../../utils/auth.js';
import { cleanMetadata, extractVersionInfo } from '../../utils/normalization.js';
import { signDownload, verifyDownload } from '../../utils/signing.js';

function sanitizeName(name) {
    if (!name) return name;
    return name.replace(/dj\s*vick\s*nick/gi, 'DJ Flowerz');
}

async function checkAndIncrementDownloads(user, env, isAdminEmail) {
    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
    const now = new Date();
    const nowMs = now.getTime();
    const todayUtcString = now.toISOString().split('T')[0];
    const createdDate = new Date(user?.created_at || now.toISOString());
    const daysSinceCreated = Math.floor((nowMs - createdDate.getTime()) / (1000 * 3600 * 24));
    
    const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
    const isSubscribed = (user?.is_subscriber === 1 && expiry > nowMs);
    
    let limit = 0;
    const userPlan = user?.subscription_plan?.toLowerCase() || 'none';

    if (isMaster) {
        limit = 9999;
    } else if (isSubscribed) {
        // All paid plans get unlimited downloads
        limit = 9999;
    } else {
        limit = 0; // Unsubscribed users get 0 downloads
    }
    
    if (limit === 0) {
         return { allowed: false, error: "SUBSCRIPTION_REQUIRED", status: 403 };
    }

    let currentCount = user?.daily_download_count || 0;
    const lastReset = user?.last_download_reset;

    if (lastReset !== todayUtcString) {
        currentCount = 0;
    }

    if (currentCount >= limit && !isMaster) {
        return { allowed: false, error: `Daily limit of ${limit} reached.`, status: 429 };
    }

    // Increment count if allowed
    const newCount = currentCount + 1;
    try {
         await env.DB.prepare(
             `UPDATE profiles SET daily_download_count = ?, last_download_reset = ? WHERE id = ? OR email = ?`
         ).bind(newCount, todayUtcString, user.id, user.email).run();
    } catch (dbErr) {
         console.error("[Download Track] DB Update error", dbErr);
    }

    return { allowed: true, remaining: isMaster ? 9999 : (limit - newCount) };
}

async function handlePoolFilters(request, env) {
  try {
    const cacheKey = "cache:pool:filters_v4";
    
    // Explicit list of hubs and their sub-genres (mapped as subfolders in the UI)
    const POOL_STRUCTURE = [
      {
        name: "2026 VIDEO POOL EDITS",
        genres: [
          { name: "January 2026 Edits", sub_genres: [] },
          { name: "February 2026 Edits", sub_genres: [] },
          { name: "March 2026 Edits", sub_genres: [] },
          { name: "April 2026 Edits", sub_genres: [] }
        ]
      },
      {
        name: "2025 VIDEO POOL EDITS",
        genres: [
          { name: "Jan 2025 Edits", sub_genres: [] },
          { name: "Feb 2025 Edits", sub_genres: [] },
          { name: "March 2025 Edits", sub_genres: [] },
          { name: "April Edits", sub_genres: [] },
          { name: "May 2025 Edits", sub_genres: [] },
          { name: "June 2025 Edits", sub_genres: [] },
          { name: "July 2025 Edits", sub_genres: [] },
          { name: "August 2025 Edits", sub_genres: [] },
          { name: "September 2025 Edits", sub_genres: [] },
          { name: "October 2025 Edits", sub_genres: [] },
          { name: "November 2025 Edits", sub_genres: [] },
          { name: "December 2025 Edits", sub_genres: [] }
        ]
      },
      {
        name: "2024 VIDEO POOL EDITS",
        genres: [
          { name: "Jan 2024 Edits", sub_genres: [] },
          { name: "Feb 2024 Edits", sub_genres: [] },
          { name: "March 2024 Edits", sub_genres: [] },
          { name: "April Edits", sub_genres: [] },
          { name: "May 2024 Edits", sub_genres: [] },
          { name: "June 2024 Edits", sub_genres: [] },
          { name: "July 2024 Edits", sub_genres: [] },
          { name: "August 2024 Edits", sub_genres: [] },
          { name: "September 2024 Edits", sub_genres: [] },
          { name: "October 2024 Edits", sub_genres: [] },
          { name: "November 2024 Edits", sub_genres: [] },
          { name: "December 2024 Edits", sub_genres: [] }
        ]
      },
      {
        name: "2023 VIDEO POOL EDITS",
        genres: [
          { name: "Jan 2023 Edits", sub_genres: [] },
          { name: "Feb 2023 Edits", sub_genres: [] },
          { name: "March 2023 Edits", sub_genres: [] },
          { name: "April 2023 Edits", sub_genres: [] },
          { name: "May 2023 Edits", sub_genres: [] },
          { name: "June 2023 Edits", sub_genres: [] },
          { name: "July 2023 Edits", sub_genres: [] },
          { name: "August 2023 Edits", sub_genres: [] },
          { name: "September 2023 Edits", sub_genres: [] },
          { name: "October 2023 Edits", sub_genres: [] },
          { name: "November 2023 Edits", sub_genres: [] },
          { name: "December 2023 Edits", sub_genres: [] }
        ]
      },
      {
        name: "2022 VIDEO POOL EDITS",
        genres: [
          { name: "Jan 2022 Edits", sub_genres: [] },
          { name: "Feb 2022 Edits", sub_genres: [] },
          { name: "March 2022 Edits", sub_genres: [] },
          { name: "April 2022 Edits", sub_genres: [] },
          { name: "May 2022 Edits", sub_genres: [] },
          { name: "June 2022 Edits", sub_genres: [] },
          { name: "July 2022 Edits", sub_genres: [] },
          { name: "August 2022 Edits", sub_genres: [] },
          { name: "September 2022 Edits", sub_genres: [] },
          { name: "October 2022 Edits", sub_genres: [] },
          { name: "November 2022 Edits", sub_genres: [] },
          { name: "December 2022 Edits", sub_genres: [] }
        ]
      },
      {
        name: "2021 VIDEO POOL EDITS",
        genres: [
          { name: "JANUARY 2021 EDITS", sub_genres: [] },
          { name: "FEB 2021 EDITS", sub_genres: [] },
          { name: "March 2021 Edits", sub_genres: [] },
          { name: "April 2021 Edits", sub_genres: [] },
          { name: "May 2021 Edits", sub_genres: [] },
          { name: "June 2021 Edits", sub_genres: [] },
          { name: "JULY 2021 EDITS", sub_genres: [] },
          { name: "AUGUST EDITS 2021", sub_genres: [] },
          { name: "September 2021 EDITS", sub_genres: [] },
          { name: "October 2021 Edits", sub_genres: [] },
          { name: "November 2021 Edits", sub_genres: [] },
          { name: "December 2021 Edits", sub_genres: [] }
        ]
      },
      {
        name: "2020 VIDEO POOL EDITS",
        genres: [
          { name: "FEB 2020 EDITS", sub_genres: [] },
          { name: "MARCH 2020 EDITS", sub_genres: [] },
          { name: "APRIL 2020 EDITS", sub_genres: [] },
          { name: "MAY 2020 EDITS", sub_genres: [] },
          { name: "JUNE 2020 EDITS", sub_genres: [] },
          { name: "JULY 2020 EDITS", sub_genres: [] },
          { name: "August 2020 Edits", sub_genres: [] },
          { name: "SEPTEMBER 2020 EDITS", sub_genres: [] },
          { name: "Octomber 2020 Edits", sub_genres: [] },
          { name: "November 2020 Edits", sub_genres: [] },
          { name: "December 2020 EDITS", sub_genres: [] }
        ]
      },
      {
        name: "Genres",
        genres: [
          { name: "REGGAE VIDEOS", sub_genres: [] },
          { name: "Amapiano", sub_genres: [] },
          { name: "Dancehall (Hype)", sub_genres: [] },
          { name: "Dancehall (Low Hype)", sub_genres: [] },
          { name: "Afro Beats (Naija) (Hype)", sub_genres: [] },
          { name: "Afro House", sub_genres: [] },
          { name: "Gospel (Urban)", sub_genres: [] },
          { name: "Rhumba (Zilizopendwa)", sub_genres: [] },
          { name: "Urbantone & Gengetone (Hype)", sub_genres: [] },
          { name: "Urbantone & Gengetone (Low Hype)", sub_genres: [] },
          { name: "Mugithi (Kikuyu)", sub_genres: [] },
          { name: "East Africa TBT (Hype)", sub_genres: [] },
          { name: "Bongo (TZ) (Hype)", sub_genres: [] },
          { name: "Kenya Love Songs (Hype)", sub_genres: [] },
          { name: "Kikuyu Gospel (Kigoco)", sub_genres: [] },
          { name: "Afro Amapiano", sub_genres: [] },
          { name: "Tanzania Amapiano", sub_genres: [] },
          { name: "254 Pop Sound", sub_genres: [] },
          { name: "CRUNK", sub_genres: [] },
          { name: "REGGAE HYPE", sub_genres: [] },
          { name: "Rnb 90", sub_genres: [] },
          { name: "Rnb 2000", sub_genres: [] },
          { name: "Rnb 2010", sub_genres: [] }
        ]
      },
      {
        name: "Riddim Videos",
        genres: [
          { name: "WYFL Riddim", sub_genres: [] },
          { name: "Love Echoes Riddim", sub_genres: [] },
          { name: "Recovery Riddim", sub_genres: [] }
        ]
      },
      {
        name: "Redrums & Afro Extended",
        genres: [
          { name: "Redrums Video Remixes", sub_genres: [] },
          { name: "DaPhonk", sub_genres: [] },
          { name: "ReFixes", sub_genres: [] },
          { name: "Amapiano", sub_genres: [] },
          { name: "Afro House", sub_genres: [] },
          { name: "R&B Remixes", sub_genres: [] },
          { name: "Dancehall Remixes", sub_genres: [] },
          { name: "Afro Beats (Audio) Remixes", sub_genres: [] },
          { name: "Audio Redrums", sub_genres: [] },
          { name: "Reggae Fusion", sub_genres: [] },
          { name: "Reggaeton (Audio) Remixes", sub_genres: [] },
          { name: "REMIXAH", sub_genres: [] },
          { name: "HYPE EDITS", sub_genres: [] },
          { name: "Amapiano Redrum Remixes", sub_genres: [] },
          { name: "Made In Kenya (Remixes)", sub_genres: [] }
        ]
      },
      {
        name: "Full Riddims",
        genres: [
          { name: "OVER PROOF RIDDIM (PT. 2) - JA-PRODS", sub_genres: [] },
          { name: "back it up", sub_genres: [] },
          { name: "BIG DOG RIDDIM - BOARDHOUSE", sub_genres: [] },
          { name: "SIGNATURE BOUNCE RIDDIM - SOUNIQUE", sub_genres: [] },
          { name: "(97) Riva Stone Riddim(Dj Frass Records)", sub_genres: [] },
          { name: "SOULMATERIDDIM - DUNWELL", sub_genres: [] },
          { name: "[101]BRIXTON B OUNCE RIDDIM", sub_genres: [] },
          { name: "Tomatoe Riddim [2012]", sub_genres: [] },
          { name: "Tear Drops Riddim - Cashflow Records Studio", sub_genres: [] },
          { name: "AFTER SUMMER RIDDIM - G3 MUZIK", sub_genres: [] },
          { name: "LOVE LINE RIDDIM - NOISE CHECK", sub_genres: [] },
          { name: "SILENT SMILE RIDDIM - ARROW MUSIC", sub_genres: [] },
          { name: "BIG STICK RIDDIM - NO FACE", sub_genres: [] },
          { name: "COOL FACE RIDDIM - CR24", sub_genres: [] },
          { name: "HEAVEN'S GATE RIDDIM", sub_genres: [] },
          { name: "HIGH LIFE RIDDIM - JUP_PROD", sub_genres: [] },
          { name: "LIQUID SOUL RECORDS - AFTER MIDNIGHT RIDDIM", sub_genres: [] },
          { name: "Aura Riddim - Dj Frass Records", sub_genres: [] },
          { name: "WAVE RIDDIM - T100", sub_genres: [] },
          { name: "Tropic Riddim - Chimney Records", sub_genres: [] },
          { name: "The Success Riddim - Good Good Productions", sub_genres: [] },
          { name: "The Party Fire Riddim - Studio Vibes", sub_genres: [] },
          { name: "Star Gyal Riddim - Notnice Records", sub_genres: [] },
          { name: "Socialize Riddim - Good Good Productions", sub_genres: [] },
          { name: "Sexting Riddim - SRE Records", sub_genres: [] },
          { name: "Sex On The Beach Riddim - SJR", sub_genres: [] },
          { name: "Selfie Riddim - Rvssian_Head Concussion Records", sub_genres: [] },
          { name: "Screechie Riddim - Notnice Records_Gevano Records", sub_genres: [] },
          { name: "Sanke Riddim - JayCrazie Records", sub_genres: [] },
          { name: "Pure Water Riddim - Adde Instrumentals_Zojak World Wide", sub_genres: [] },
          { name: "Punaany Riddim", sub_genres: [] },
          { name: "Pledge Riddim - Studio Vybes", sub_genres: [] },
          { name: "Paper Chase Riddim - Studio 91 Records", sub_genres: [] },
          { name: "Overtime Riddim - JA Productions", sub_genres: [] },
          { name: "Numbers Don't Lie Riddim - Dane Raychords_Unstoppable Records", sub_genres: [] },
          { name: "Nice & Easy Riddim - CR203", sub_genres: [] },
          { name: "Nerves Riddim - No Doubt Records", sub_genres: [] },
          { name: "Natural Riddim - Birch Hill Records", sub_genres: [] },
          { name: "Money Mix Riddim - Good Good Productions", sub_genres: [] },
          { name: "Miss You Riddim - Young Pow Production", sub_genres: [] },
          { name: "Mildew Riddim - UIM Records", sub_genres: [] },
          { name: "Mercury Riddim - Birchill Records", sub_genres: [] },
          { name: "MDC Riddim - SJR Records", sub_genres: [] },
          { name: "Match Up Riddim - Notnice Records", sub_genres: [] },
          { name: "Live In Love Riddim - TJ Records", sub_genres: [] },
          { name: "Life Support Riddim - Good Good Production", sub_genres: [] },
          { name: "Label Riddim - Chimney Records", sub_genres: [] },
          { name: "Kingsstone Riddim - JA Production", sub_genres: [] },
          { name: "Kick Off Riddim - Kimichi Records", sub_genres: [] },
          { name: "Juice Riddim - Bright Beam Music", sub_genres: [] },
          { name: "Joint Riddim - TJ Records", sub_genres: [] },
          { name: "Islander Riddim - Chimney Records", sub_genres: [] },
          { name: "I-Scream Riddim - Birchill Records", sub_genres: [] },
          { name: "In Transit Riddim - Notnice Records", sub_genres: [] },
          { name: "Happy Hour Riddim - Chimney Records", sub_genres: [] },
          { name: "Hapiness Riddim - Good Good Production", sub_genres: [] },
          { name: "Gyal Policy Riddim - Jahvy_Jordan_Emilio_Records", sub_genres: [] },
          { name: "Greatest Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Gully Bop Riddim - Notnice Records", sub_genres: [] },
          { name: "Good Book Riddim - HCR", sub_genres: [] },
          { name: "Gold Dust Riddim - Adde Instrumentals_Maikon Check", sub_genres: [] },
          { name: "Ghetto Bible Riddim - Full Chaarge Records", sub_genres: [] },
          { name: "Fix Up Riddim - Yard Vibe Ent", sub_genres: [] },
          { name: "First Capital Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Fever Tick Riddim - JA-Prods", sub_genres: [] },
          { name: "Explosion Riddim - JA-Production", sub_genres: [] },
          { name: "Execution Riddim - G-Force Records", sub_genres: [] },
          { name: "Elite Riddim - Chimney Records", sub_genres: [] },
          { name: "Easy To Love Riddim", sub_genres: [] },
          { name: "Drone Weed Riddim - Hemton Music_Attomatic Records", sub_genres: [] },
          { name: "Double Up Riddim - Dre-Day Production", sub_genres: [] },
          { name: "Dinner Time Riddim - U.I.M Records", sub_genres: [] },
          { name: "Darwin Riddim - Notnice Records", sub_genres: [] },
          { name: "Crossbreed Riddim - Notnice Records", sub_genres: [] },
          { name: "Country Bus Riddim - Chimney Records", sub_genres: [] },
          { name: "Cold Vibes Riddim - TJ Records", sub_genres: [] },
          { name: "Clean Heart Riddim - Notnice Records", sub_genres: [] },
          { name: "Choices Riddim - One Love Records", sub_genres: [] },
          { name: "Canopy Riddim - JA Productions", sub_genres: [] },
          { name: "Buzzer Riddim - TJ Records", sub_genres: [] },
          { name: "Boom Box Riddim - Notnice Records", sub_genres: [] },
          { name: "Body & Soul Riddim - J-Vibe Productions", sub_genres: [] },
          { name: "Big League Riddim - Chimney Records", sub_genres: [] },
          { name: "Beast Mode Riddim - Notnice Records", sub_genres: [] },
          { name: "Beach Vibe Riddim - CR203 Records", sub_genres: [] },
          { name: "Banjalo Riddim - CR203 Records", sub_genres: [] },
          { name: "Ball Game Riddim - Cashflow Records", sub_genres: [] },
          { name: "Balance Riddim - Cr203 Records", sub_genres: [] },
          { name: "Badness Riddim - One Time Music", sub_genres: [] },
          { name: "Bad People Riddim - Rvssian_HCR", sub_genres: [] },
          { name: "Baby Face Riddim - CR203 Records", sub_genres: [] },
          { name: "Auto-Tune Riddim - SJR", sub_genres: [] },
          { name: "Anarchy Riddim - Chimney Records", sub_genres: [] },
          { name: "Addicted Riddim - SJR Records", sub_genres: [] },
          { name: "90s Don Dada Riddim - Bonded Music", sub_genres: [] },
          { name: "True Words Riddim - U.I.M Records", sub_genres: [] },
          { name: "Table Fi Table Riddim", sub_genres: [] },
          { name: "Summer Wave Riddim - Tj Records", sub_genres: [] },
          { name: "Social Emotions Riddim - JA-Productions", sub_genres: [] },
          { name: "Sex On The Beach Riddim", sub_genres: [] },
          { name: "Season Change Riddim", sub_genres: [] },
          { name: "Save A Penny Riddim", sub_genres: [] },
          { name: "Safari Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Rewind Riddim - Oxos Records", sub_genres: [] },
          { name: "Reggae Rock Riddim - Turf Music", sub_genres: [] },
          { name: "Progress Riddim - Dunwell Production", sub_genres: [] },
          { name: "Poolside Riddim - HCR", sub_genres: [] },
          { name: "Payback Riddim - Notnice Records", sub_genres: [] },
          { name: "Pain Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Ovation Riddim - Notnice Records", sub_genres: [] },
          { name: "One Day Riddim - HCR", sub_genres: [] },
          { name: "Nature's Way Riddim", sub_genres: [] },
          { name: "Memory Lane Riddim - JA Productions", sub_genres: [] },
          { name: "Master Riddim - JA Production", sub_genres: [] },
          { name: "M-A-M Riddim - Dunwell_Zojak World Wide", sub_genres: [] },
          { name: "Long Drive Riddim - Tj Records", sub_genres: [] },
          { name: "Life's Journey Riddim - Dunwell_Zojak World Wide", sub_genres: [] },
          { name: "Krazy Riddim", sub_genres: [] },
          { name: "Keep Walking Riddim", sub_genres: [] },
          { name: "Invasion Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Intuition Riddim - Notnice Records", sub_genres: [] },
          { name: "Instant Disaster Riddim", sub_genres: [] },
          { name: "Ice Creams Riddim", sub_genres: [] },
          { name: "High Stakes Riddim - JA Productions", sub_genres: [] },
          { name: "High Altitude Riddim - JA-Productions", sub_genres: [] },
          { name: "Greatness Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Global Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Full Blast Riddim - Notnice Records", sub_genres: [] },
          { name: "Front Page Riddim", sub_genres: [] },
          { name: "Freedom Street Riddim", sub_genres: [] },
          { name: "Fling Riddim - Adde Records", sub_genres: [] },
          { name: "Fire Wire Riddim - JA-Production", sub_genres: [] },
          { name: "Final Stage Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Fight Fi Peace Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Evolution Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Drop It Riddim - Notnice Records", sub_genres: [] },
          { name: "Dreamers Riddim - Notnice Records", sub_genres: [] },
          { name: "Dark Room Riddim - HCR", sub_genres: [] },
          { name: "Dancehall Night Riddim - Notnice Records", sub_genres: [] },
          { name: "Current Events Riddim - Notnice Records", sub_genres: [] },
          { name: "Crown Love Riddim - Rvssian_HCR", sub_genres: [] },
          { name: "Contra Riddim - Notnice Records", sub_genres: [] },
          { name: "City Vibes Riddim - SRE Records", sub_genres: [] },
          { name: "Cali Riddim - Dunwell Productions", sub_genres: [] },
          { name: "Broadwalk Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Blessings Riddim", sub_genres: [] },
          { name: "Birth Place Riddim - JA-Production", sub_genres: [] },
          { name: "Big Talk Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Believe Riddim - Notnice Records", sub_genres: [] },
          { name: "Awesome Riddim - Oxos Records", sub_genres: [] },
          { name: "Art Of War Riddim - Tj Records", sub_genres: [] },
          { name: "All Night Riddim - Oxos Records", sub_genres: [] },
          { name: "Aggression Riddim - Notnice Records", sub_genres: [] },
          { name: "19-Mile Riddim - Oxos Records", sub_genres: [] },
          { name: "Love Reggae Riddim", sub_genres: [] },
          { name: "Z-March Riddim - Oxos Records", sub_genres: [] },
          { name: "Work Hard Riddim - Yard Vibe Ent", sub_genres: [] },
          { name: "Unfinished Business Riddim - Zojak World Wide", sub_genres: [] },
          { name: "Top-Speed Riddim - Oxos Records", sub_genres: [] },
          { name: "The Rock Riddim - Zojak World Wide", sub_genres: [] },
          { name: "Success Riddim - Oxos Records", sub_genres: [] },
          { name: "State Of Mind Riddim - JA-Prods", sub_genres: [] },
          { name: "Start From Scratch Riddim - Oxos Records", sub_genres: [] },
          { name: "Smokin Riddim - U.I.M Records", sub_genres: [] },
          { name: "Sign Language Riddim - Chimney Records", sub_genres: [] },
          { name: "School Yard Riddim - Yard Vibe Ent", sub_genres: [] },
          { name: "Rave Riddim - Notnice Records", sub_genres: [] },
          { name: "Power Chord Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Paper-Chaser Riddim - Dre-Day Production", sub_genres: [] },
          { name: "Pain-Free Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Night-Shift Riddim - JA-Prods", sub_genres: [] },
          { name: "Natural High Riddim - Dre-Day Production", sub_genres: [] },
          { name: "Motivation Riddim - SJR", sub_genres: [] },
          { name: "Money-Box Riddim - Chimney Records", sub_genres: [] },
          { name: "Mayweather Riddim - CR203 Records", sub_genres: [] },
          { name: "Luv-A-Dub Riddim - SJR", sub_genres: [] },
          { name: "Live-Large Riddim - CR203 Records", sub_genres: [] },
          { name: "Key-Chord Riddim - JA-Prods", sub_genres: [] },
          { name: "Interstate Riddim - Armzhouse Records", sub_genres: [] },
          { name: "Invasion Riddim", sub_genres: [] },
          { name: "Instruction Riddim - Yard Vibe Ent", sub_genres: [] },
          { name: "Inner-City Riddim - SJR", sub_genres: [] },
          { name: "Infinity Riddim - CR203 Records", sub_genres: [] },
          { name: "In-Style Riddim - HCR", sub_genres: [] },
          { name: "Hybrid Riddim - CR203 Records", sub_genres: [] },
          { name: "Head-Shot Riddim - SJR", sub_genres: [] },
          { name: "Gyal-Shop Riddim - CR203 Records", sub_genres: [] },
          { name: "Grill-Work Riddim - CR203 Records", sub_genres: [] },
          { name: "Great-Lakes Riddim - JA-Prods", sub_genres: [] },
          { name: "Game-Changer Riddim - CR203 Records", sub_genres: [] },
          { name: "Full-Speed Riddim - Chimney Records", sub_genres: [] },
          { name: "Full-House Riddim - JA-Prods", sub_genres: [] },
          { name: "Free-Style Riddim - HCR", sub_genres: [] },
          { name: "Formula Riddim - SJR", sub_genres: [] },
          { name: "Fine-Wine Riddim - CR203 Records", sub_genres: [] },
          { name: "Face-Off Riddim - CR203 Records", sub_genres: [] },
          { name: "End-Game Riddim - CR203 Records", sub_genres: [] },
          { name: "Eight-Ball Riddim - Chimney Records", sub_genres: [] },
          { name: "Drive-By Riddim - JA-Prods", sub_genres: [] },
          { name: "Deep-Sea Riddim - JA-Prods", sub_genres: [] },
          { name: "Cross-Fire Riddim - CR203 Records", sub_genres: [] },
          { name: "Crime-Scene Riddim - HCR", sub_genres: [] },
          { name: "Cold-Play Riddim - SJR", sub_genres: [] },
          { name: "Code-Red Riddim - HCR", sub_genres: [] },
          { name: "Clean-Heart Riddim - CR203 Records", sub_genres: [] },
          { name: "Chill-Out Riddim - SJR", sub_genres: [] },
          { name: "Body-Guard Riddim - SJR", sub_genres: [] },
          { name: "Blue-Sky Riddim - JA-Prods", sub_genres: [] },
          { name: "Black-List Riddim - HCR", sub_genres: [] },
          { name: "Best-Of-Me Riddim - CR203 Records", sub_genres: [] },
          { name: "Bad-Habit Riddim - SJR", sub_genres: [] },
          { name: "Air-Force Riddim - HCR", sub_genres: [] },
          { name: "After-Hours Riddim - SJR", sub_genres: [] },
          { name: "Roof Top Riddim", sub_genres: [] }
        ]
      }
    ];

    const responseData = {
      hubsWithGenres: POOL_STRUCTURE,
      years: [] // Years are now integrated into the hubs in v4
    };

    if (env.KV) {
        try {
            await env.KV.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 3600 });
        } catch (e) {
            console.error("KV write error:", e);
        }
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

async function handleGetPoolTracks(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    const user = await getAuthorizedUser(request, env);

    // 1. Determine User Role for specific limits later
    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
    const now = new Date().getTime();
    const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
    const isSubscribed = (user?.is_subscriber === 1 && expiry > now);

    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const hub = url.searchParams.get("hub");
    const genre = url.searchParams.get("genre");
    const subGenre = url.searchParams.get("sub_genre");
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");
    const search = url.searchParams.get("search");
    const isHype = url.searchParams.get("isHype") === "true";

    let conditions = ["1=1"]; // Removed specific is_active = 1 condition as it might cause 500 error if column is missing on tracks.
    const params = [];

    if (isHype) {
        conditions.push("(LOWER(t.genre) LIKE '%hype%' OR LOWER(t.display_genre) LIKE '%hype%' OR LOWER(t.vibe) LIKE '%hype%' OR LOWER(t.collection_hub) LIKE '%hype%')");
    }
    
    // Enhanced mapping for Music Pool v4 Hierarchy based on actual Database Metadata
    if (hub && !['All Hubs', 'all', 'Select Folder', 'undefined', ''].includes(hub)) {
        conditions.push("(t.collection_hub LIKE ? OR t.display_genre LIKE ? OR t.genre LIKE ?)");
        params.push(hub, hub, hub);
    }

    if (genre && !['All Genres', 'All', 'all', 'Select Subfolder', 'undefined', ''].includes(genre)) {
        conditions.push("(t.sub_genre LIKE ? OR t.display_genre LIKE ? OR t.genre LIKE ?)");
        params.push(genre, genre, genre);
    }

    // Sub-genre filter (if needed)
    if (subGenre && subGenre !== 'undefined' && subGenre !== 'all' && subGenre !== '') {
        conditions.push("t.sub_genre LIKE ?");
        params.push(subGenre);
    }
    
    // Explicit year/month search params (v3 compatibility or manual filters)
    if (year && year !== 'All Years' && year !== 'undefined' && year !== '') {
        const yearInt = parseInt(year);
        if (!isNaN(yearInt)) {
            conditions.push("t.release_year = ?");
            params.push(yearInt);
        }
    }
    if (month && month !== 'All Months' && month !== 'undefined' && month !== '') {
        conditions.push("t.release_month = ?");
        params.push(month);
    }

    if (search) {
        conditions.push("(t.title LIKE ? OR t.artist LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    // Get total counts first for pagination metadata
    const countQuery = `SELECT count(DISTINCT t.id) as total FROM tracks t ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...params).first().catch(() => ({ total: 0 }));
    const totalRecords = countResult?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const offset = (page - 1) * limit;

    const query = `
        SELECT 
            t.*,
            (SELECT COALESCE(preview_url, file_url, download_url) FROM track_versions WHERE track_id = t.id ORDER BY is_main_version DESC LIMIT 1) as previewUrl,
            json_group_array(
                CASE WHEN v.id IS NOT NULL THEN
                    json_object(
                        'id', v.id,
                        'version_name', v.version_name,
                        'preview_url', COALESCE(v.preview_url, v.file_url, v.download_url),
                        'download_url', COALESCE(v.download_url, v.file_url, v.preview_url),
                        'is_main_version', v.is_main_version
                    )
                ELSE NULL END
            ) as versions_json
        FROM tracks t
        LEFT JOIN track_versions v ON t.id = v.track_id
        ${whereClause}
        GROUP BY t.id 
        ORDER BY t.release_year DESC, t.created_at DESC 
        LIMIT ? OFFSET ?
    `;

    const pagedParams = [...params, limit, offset];
    const results = await env.DB.prepare(query).bind(...pagedParams).all().then(r => r.results).catch(() => []);

    // Calculate daily limits
    const createdDate = new Date(user?.created_at || now);
    const daysSinceCreated = Math.floor((now - createdDate.getTime()) / (1000 * 3600 * 24));
    
    let dailyLimit = 0;
    const userPlan = user?.subscription_plan?.toLowerCase() || 'none';

    if (isMaster) {
        dailyLimit = 9999;
    } else if (isSubscribed) {
        // All paid plans get unlimited downloads
        dailyLimit = 9999;
    } else {
        dailyLimit = 0; // Unsubscribed users get 0 downloads
    }

    const responsePayload = {
        tracks: results.map(r => {
            let parsedVersions = [];
            if (r.versions_json && r.versions_json !== '[null]' && r.versions_json !== '[]') {
                try {
                    parsedVersions = JSON.parse(r.versions_json).filter(Boolean);
                } catch (e) { }
            }
            delete r.versions_json;
            
            // Apply name replacement
            const artist = sanitizeName(r.artist);
            const title = sanitizeName(r.title);

            return {
                ...r,
                artist,
                title,
                versions: parsedVersions
            };
        }),
        pagination: {
            page,
            limit,
            totalRecords,
            totalPages
        },
        isAuthorized: true,
        downloadLimit: dailyLimit,
        downloadsCount: user?.daily_download_count || 0
    };

    return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handlePoolDownload(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "POST") {
        const user = await getAuthorizedUser(request, env);
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        const body = await request.json();
        const { url: downloadUrl } = body;
        
        if (!downloadUrl) {
            return new Response(JSON.stringify({ error: "Missing download URL" }), { status: 400, headers: corsHeaders });
        }

        const check = await checkAndIncrementDownloads(user, env, isAdminEmail);
        if (!check.allowed) {
            return new Response(JSON.stringify({ error: check.error }), { status: check.status, headers: corsHeaders });
        }

        // Generate JIT Signature (Fortress Phase 1)
        const versionId = body.versionId;
        if (!versionId) return new Response(JSON.stringify({ error: "versionId required" }), { status: 400, headers: corsHeaders });

        const { sig, exp } = await signDownload(env.ENVIRONMENT_SECRET || 'djflowerz_stealth_default', user.id, versionId);

        return new Response(JSON.stringify({ 
            sig, 
            exp, 
            remaining: check.remaining, 
            success: true 
        }), { 
            headers: { 
                ...corsHeaders, 
                "Content-Type": "application/json",
                "X-Downloads-Remaining": check.remaining.toString()
            } 
        });
    }

    // GET method (direct proxy for browser download)
    const token = url.searchParams.get("token");
    const sig = url.searchParams.get("sig");
    const exp = url.searchParams.get("exp");
    const versionId = url.searchParams.get("versionId");
    const filename = url.searchParams.get("filename") || "track.mp3";

    if (!token || !sig || !exp) {
        return new Response(JSON.stringify({ error: "Access Denied: Missing Signature" }), { status: 401, headers: corsHeaders });
    }

    // Build a fake request with the token in the Authorization header
    let user = null;
    try {
        const fakeReq = new Request(request.url, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        user = await getAuthorizedUser(fakeReq, env);
    } catch (e) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Verify JIT Signature (Fortress Phase 1)
    const isValidSig = await verifyDownload(env.ENVIRONMENT_SECRET || 'djflowerz_stealth_default', user.id, versionId, sig, exp);
    if (!isValidSig) {
        return new Response(JSON.stringify({ error: "Access Denied: Invalid or Expired Signature" }), { status: 403, headers: corsHeaders });
    }

    const isMaster = user?.role === 'admin' || isAdminEmail(user?.email);
    const now = new Date().getTime();
    const expiry = user?.subscription_expiry ? new Date(user.subscription_expiry).getTime() : 0;
    const isSubscribed = isMaster || (user?.is_subscriber === 1 && expiry > now);

    if (!isSubscribed) {
        return new Response(JSON.stringify({ error: "SUBSCRIPTION_REQUIRED" }), { status: 403, headers: corsHeaders });
    }

    // Enforce and increment daily limit
    const check = await checkAndIncrementDownloads(user, env, isAdminEmail);
    if (!check.allowed) {
        return new Response(JSON.stringify({ error: check.error }), { status: check.status, headers: corsHeaders });
    }

    if (!versionId) {
        return new Response(JSON.stringify({ error: "versionId required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch the download URL from D1
    const version = await env.DB.prepare(
        `SELECT download_url, file_url FROM track_versions WHERE id = ?`
    ).bind(versionId).first();

    if (!version || (!version.download_url && !version.file_url)) {
        return new Response(JSON.stringify({ error: "Track version not found" }), { status: 404, headers: corsHeaders });
    }

    const fileUrl = version.download_url || version.file_url;

    // Proxy the file and force a download dialog in the browser
    const fileResponse = await fetch(fileUrl, {
        headers: {
            "User-Agent": "DJFlowerz-Worker/1.0",
            "Referer": "https://djflowerz.co.ke",
        }
    });

    if (!fileResponse.ok) {
        return new Response(JSON.stringify({ error: "File not available at source", status: fileResponse.status }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const contentType = fileResponse.headers.get("Content-Type") || "application/octet-stream";
    const cleanFn = cleanMetadata(filename);
    const safeFilename = cleanFn.replace(/[^\w.\- ()]/g, '_');

    return new Response(fileResponse.body, {
        status: 200,
        headers: {
            ...corsHeaders,
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${safeFilename}"`,
            "Cache-Control": "no-store",
        }
    });
}

export async function handleStorefrontPool(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        if (method === "GET" && path === "/api/pool/filters") {
            return handlePoolFilters(request, env);
        }

        if (method === "GET" && path === "/api/pool/tracks") {
            return handleGetPoolTracks(request, env);
        }

        if (path === "/api/pool/download") {
            return handlePoolDownload(request, env);
        }

    } catch (e) {
        console.error("[Pool API Error]", e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
}

export async function handleGetSyncNotifications(request, env) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const user = await getAuthorizedUser(request, env);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    try {
        const { results } = await env.DB.prepare(`
            SELECT * FROM sync_notifications 
            ORDER BY created_at DESC 
            LIMIT 10
        `).all();

        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}
