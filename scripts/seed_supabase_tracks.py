
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
    file_path = os.path.join(script_dir, "..", "music_track_list.txt")
    if not os.path.exists(file_path):
        file_path = "music_track_list.txt"
        if not os.path.exists(file_path):
            print("Error: music_track_list.txt not found.")
            return

    print(f"Reading {file_path} for updated sync...")
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    processed_tracks = []
    current_ids = set()
    
    # Base URL for DJ FLOWERZ VIDEO POOL (R2 CDN)
    base_url = "https://cdn.vicknickvideopool.com"
    namespace = uuid.NAMESPACE_DNS
    
    for line in lines[2:]:
        parts = line.split('|')
        if len(parts) < 6: continue
        
        file_name = parts[0].strip()
        artist = parts[1].strip()
        title = parts[2].strip()
        year_str = parts[3].strip()
        folder_path = parts[4].strip()
        source = parts[5].strip()

        # Improved year detection
        year = None
        if year_str.isdigit():
            year = int(year_str)
        
        if "2026" in folder_path or "2026" in file_name:
            year = 2026
        elif "2025" in folder_path or "2025" in file_name:
            if not year: year = 2025

        genre = map_genre(folder_path, file_name, artist, title)
        
        # Start with folder structure as categories
        categories = [p.strip() for p in folder_path.split('/') if p.strip()]
        
        # Add explicit categories based on naming conventions to support POOL_HUBS filters
        fp_lower = folder_path.lower()
        
        # Year-based categories with month extraction
        if "2026" in folder_path or "2025" in folder_path or "2024" in folder_path or "2023" in folder_path or "2022" in folder_path or "2021" in folder_path or "2020" in folder_path:
            if "New Uploads" not in categories and ("2026" in folder_path or "2025" in folder_path):
                categories.append("New Uploads")
        
        # Remix & Mashups Hub
        if "remix & mashups hub" in fp_lower or "remix" in fp_lower:
            if "Remix & Mashups Hub" not in categories:
                categories.append("Remix & Mashups Hub")
        
        # Redrums
        if "redrums video remixes" in fp_lower or "redrum" in fp_lower:
            if "Redrums Video Remixes" not in categories:
                categories.append("Redrums Video Remixes")
        
        # Riddimz
        if "riddimz f" in fp_lower or "riddim" in fp_lower:
            if "Riddimz F'" not in categories:
                categories.append("Riddimz F'")
        
        # Genre-based categories from Genres/ folder
        if "genres/" in fp_lower:
            # Kenyan Love Songs
            if "kenya love songs (low hype)" in fp_lower or "kenya love songs (hype)" in fp_lower:
                if "Kenyan Love Songs (Low Hype)" in fp_lower and "Kenyan Love Songs (Low Hype)" not in categories:
                    categories.append("Kenyan Love Songs (Low Hype)")
                elif "kenya love songs (hype)" in fp_lower and "Kenyan Love Songs Hype" not in categories:
                    categories.append("Kenyan Love Songs Hype")
            
            # Kikuyu Gospel
            if "kikuyu gospel" in fp_lower or "kigoco" in fp_lower:
                if "Kikuyu Gospel (Kigocco)" not in categories:
                    categories.append("Kikuyu Gospel (Kigocco)")
            
            # Bongo Flava
            if "bongo flava (tbt)" in fp_lower:
                if "hype" in fp_lower and "Bongo Flava (TBT) Hype" not in categories:
                    categories.append("Bongo Flava (TBT) Hype")
                elif "low hype" in fp_lower and "Bongo TBT Low Hype" not in categories:
                    categories.append("Bongo TBT Low Hype")
            
            # Afrobeat Oldies
            if "afro beats (tbt)" in fp_lower or "afrobeat" in fp_lower:
                if "Afrobeat (Oldies)" not in categories:
                    categories.append("Afrobeat (Oldies)")
            
            # Amapiano
            if "amapiano" in fp_lower:
                if "Amapiano" not in categories:
                    categories.append("Amapiano")
            
            # Afrohouse
            if "afro amapiano" in fp_lower or "afrohouse" in fp_lower:
                if "Afrohouse" not in categories:
                    categories.append("Afrohouse")
            
            # Reggae Fussion
            if "reggae" in fp_lower and "gospel" not in fp_lower:
                if "Reggae Fussion" not in categories:
                    categories.append("Reggae Fussion")
            
            # Dancehall Edits
            if "dancehall" in fp_lower:
                if "Dancehall Edits" not in categories:
                    categories.append("Dancehall Edits")
            
            # Club Edits
            if "club" in fp_lower or "crunk" in fp_lower:
                if "Club Edits" not in categories:
                    categories.append("Club Edits")
            
            # Hype Edits
            if "hype" in fp_lower and "low hype" not in fp_lower:
                if "HYPE EDITS" not in categories:
                    categories.append("HYPE EDITS")
            
            # RnB Remixes
            if "rnb" in fp_lower or "r&b" in fp_lower:
                if "RnB Remixes" not in categories:
                    categories.append("RnB Remixes")

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

        track_data = {
            "id": track_id,
            "artist": artist,
            "title": title,
            "year": year,
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
