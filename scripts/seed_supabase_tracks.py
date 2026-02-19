
import requests
import json
import os
import re
import urllib.parse
import uuid

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://ogdxnqzhqvvhrrvrqoup.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set")
    exit(1)

# List of requested genres for matching
REQUESTED_GENRES = [
    "New Uploads", "Remix & Mashups Hub", "Redrums Video Remixes", "Riddimz F'",
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
    "Bongo Flava (TBT) Hype", "Bongo TBT Low Hype", "House", "Techno", "Jazz",
    "Classical", "Pop", "Rock", "Metal", "Country", "Blues", "Funk", "Disco",
    "Afro-House", "Deep House", "Moombahton", "Afrobeat (Oldies)", "Baila",
    "Soca", "Zouk", "Kwaito", "Gqom", "Trap", "K-Pop", "Latin Pop", "Salsa",
    "Bachata", "Kizomba", "Semba", "Makossa", "Highlife", "Hiplife", "Bongo Mixes",
    "Coupe Decale", "Drill", "Grime", "Rumba Congolaise", "Ethio-Jazz", "Habesha Mix"
]

# Pre-calculate clean versions of requested genres for speed
CLEAN_GENRES = [(re.sub(r'[^a-zA-Z0-9]', '', g).lower(), g) for g in REQUESTED_GENRES]

def map_genre(folder_path, file_name, artist, title):
    fp_lower = folder_path.lower()
    
    # Priority 1: Specific folder path matches for structural accuracy
    if "redrums video remixes" in fp_lower: return "Redrums Video Remixes"
    if "remix & mashups hub" in fp_lower: return "Remix & Mashups Hub"
    if "riddimz f" in fp_lower: return "Riddimz F'"
    
    # Priority 2: Search text matching
    search_text = f"{folder_path} {file_name} {artist} {title}"
    clean_search = re.sub(r'[^a-zA-Z0-9]', '', search_text).lower()
    
    for clean_g, original_g in CLEAN_GENRES:
        if clean_g in clean_search:
            return original_g
            
    # Priority 3: Use last folder name if it's not a generic year or type
    parts = [p.strip() for p in folder_path.split('/') if p.strip()]
    if parts:
        last = parts[-1]
        if not re.match(r'^(20\d{2}|video|audio|edited|edits)$', last.lower()):
            return last
            
    return "General"

def seed_tracks():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(script_dir, "..", "scanned_files.txt")
    if not os.path.exists(file_path):
        file_path = "scanned_files.txt"
        if not os.path.exists(file_path):
            print("Error: scanned_files.txt not found.")
            return

    print(f"Reading {file_path} for updated sync...")
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    processed_tracks = []
    current_ids = set()
    
    # Base URL for DJ FLOWERZ VIDEO POOL (R2 CDN)
    base_url = "https://cdn.vicknickvideopool.com"
    namespace = uuid.NAMESPACE_DNS
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith("==="): continue

        folder_path = os.path.dirname(line)
        file_name = os.path.basename(line)
        
        # Determine source
        source = "R2 Video Pool" # Default
        if "Remix & Mashups Hub" in line:
             source = "Remix & Mashups Hub"

        # Try to extract Artist - Title from filename
        # Common formats: "Artist - Title.mp4", "Artist - Title (feat X).mp4"
        name_part = os.path.splitext(file_name)[0]
        if " - " in name_part:
            artist, title = name_part.split(" - ", 1)
        else:
            artist = "Unknown Artist"
            title = name_part
        
        # Replace DJ VICNICK variants with DJ FLOWERZ
        if "[ DJ VICKNICK VIDEO POOL]" in title:
            title = title.replace("[ DJ VICKNICK VIDEO POOL]", "[DJ FLOWERZ VIDEOPOOL]")
        if "DJ VICKNICK VIDEO POOL" in title:
             title = title.replace("DJ VICKNICK VIDEO POOL", "DJ FLOWERZ VIDEOPOOL")
        if "DJ VICNICK VIDEOPOOL" in title:
             title = title.replace("DJ VICNICK VIDEOPOOL", "DJ FLOWERZ VIDEOPOOL")
        
        # Extract year from folder path if possible
        year_str = "0"
        # will try to extract in logic below.

        # Improved year detection
        year = None
        # Improved year detection - don't let it clutter titles
        year = None
        if "2026" in folder_path or "2026" in file_name:
            year = 2026
        elif "2025" in folder_path or "2025" in file_name:
            year = 2025
        elif "2024" in folder_path or "2024" in file_name:
            year = 2024

        genre = map_genre(folder_path, file_name, artist, title)
        
        # Start with folder structure as categories, but clean them up
        raw_categories = [p.strip() for p in folder_path.split('/') if p.strip()]
        categories = []
        for cat in raw_categories:
            c = cat.upper()
            # Clean up redundant branding but keep the core info (like year)
            c = c.replace("DJ FLOWERZ", "").replace("VIDEO POOL", "").replace("GENRES", "").replace("  ", " ").strip()
            # Format monthly edits nicely: "JANUARY 2026 EDITS" -> "JAN 2026 EDITS"
            c = c.replace("JANUARY", "JAN").replace("FEBRUARY", "FEB").replace("MARCH", "MAR")
            c = c.replace("APRIL", "APR").replace("AUGUST", "AUG").replace("SEPTEMBER", "SEP")
            c = c.replace("OCTOBER", "OCT").replace("NOVEMBER", "NOV").replace("DECEMBER", "DEC")
            
            if c and c not in categories:
                categories.append(c)
        
        # Add explicit categories based on naming conventions
        fp_lower = folder_path.lower()
        if "afrobeat" in fp_lower or "afro beat" in fp_lower:
            if "AFROBEATS" not in categories: categories.append("AFROBEATS")
        if "redrum" in fp_lower:
            if "REDRUM" not in categories: categories.append("REDRUM")
        if "remix" in fp_lower:
            if "REMIX" not in categories: categories.append("REMIX")
        if "hype" in fp_lower:
            if "HYPE" not in categories: categories.append("HYPE")

        full_path = f"{folder_path}/{file_name}".replace("//", "/")
        track_id = str(uuid.uuid5(namespace, full_path))
        current_ids.add(track_id)
        
        quoted_path = urllib.parse.quote(full_path)
        download_url = f"{base_url}/{quoted_path}"
        
        # Determine version type
        v_type = "Video" if file_name.lower().endswith(('.mp4', '.mov', '.webm', '.mkv')) else "Audio"
        if "clean" in file_name.lower(): v_type = "Clean"
        if "dirty" in file_name.lower(): v_type = "Dirty"
        if "extended" in file_name.lower(): v_type = "Extended"

        # Final title cleanup: remove "2026" or "2025" if it's explicitly in the title at the start
        # e.g. "2026 Leo" -> "Leo"
        clean_title = title.strip()
        # Regex to remove leading year like "2026 " or "(2026) "
        clean_title = re.sub(r'^(\(?202\d\)?\s+|-?\s*)', '', clean_title)
        
        track_data = {
            "id": track_id,
            "artist": artist.strip(),
            "title": clean_title,
            "year": year if year else 0,
            "genre": genre,
            "category": categories,
            "versions": [{
                "id": str(uuid.uuid5(namespace, full_path + "_v1")),
                "type": v_type,
                "fileName": file_name, 
                "folderPath": folder_path, 
                "source": source,
                "downloadUrl": download_url
            }]
        }
        processed_tracks.append(track_data)

    print(f"Parsed {len(processed_tracks)} tracks from local list.")

    # Headers for Supabase
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    upsert_url = f"{SUPABASE_URL}/rest/v1/pool_tracks"

    # 1. Batch Upsert
    batch_size = 400
    for i in range(0, len(processed_tracks), batch_size):
        batch = processed_tracks[i:i + batch_size]
        print(f"Upserting batch {i // batch_size + 1}... ({i} to {i + len(batch)})")
        response = requests.post(upsert_url, headers=headers, data=json.dumps(batch))
        if response.status_code not in [200, 201]:
            print(f"Error in batch {i}: {response.text}")

    # 2. Cleanup extras (Delete tracks not in the current list)
    print("Starting cleanup of old tracks...")
    supabase_ids_file = "supabase_ids.json"
    if os.path.exists(supabase_ids_file):
        with open(supabase_ids_file, "r") as f:
            supabase_ids = set(json.load(f))
        
        to_delete = supabase_ids - current_ids
        print(f"Found {len(to_delete)} tracks to delete from Supabase.")
        
        if to_delete:
            delete_headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            # Delete in batches to avoid URL length issues or timeout
            delete_list = list(to_delete)
            del_batch_size = 100
            for i in range(0, len(delete_list), del_batch_size):
                batch = delete_list[i:i+del_batch_size]
                ids_str = ",".join([f'"{id}"' for id in batch])
                del_url = f"{SUPABASE_URL}/rest/v1/pool_tracks?id=in.({ids_str})"
                print(f"Deleting batch {i // del_batch_size + 1} ({len(batch)} tracks)...")
                requests.delete(del_url, headers=delete_headers)
    else:
        print("Note: supabase_ids.json not found, skipping specific deletion. Run get_supabase_ids.py first for full sync.")

    print("Success! Music pool synchronized.")

if __name__ == "__main__":
    seed_tracks()
