
import requests
import json
import os
import re
import urllib.parse
import uuid

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://yevqnoynsqidtplxggzs.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set")
    exit(1)

def clean_title_logic(title):
    # Aggressively replace DJ VICKNICK with DJ FLOWERZ
    title = re.sub(r'DJ\s+VICKNICK', 'DJ FLOWERZ', title, flags=re.IGNORECASE)
    title = re.sub(r'VICKNICK', 'FLOWERZ', title, flags=re.IGNORECASE)
    
    # Remove file extensions
    title = os.path.splitext(title)[0]
    
    # Replace underscores with spaces for cleaner look
    title = title.replace('_', ' ')
    
    # Clean up multiple spaces
    title = re.sub(r'\s+', ' ', title).strip()
    
    return title

def parse_category_logic(line):
    parts = line.strip().split('/')
    if len(parts) < 2:
        return "General", parts[-1]
    
    # Categorization logic matching the .txt file
    if parts[0] == 'Genres':
        category = parts[1]
    elif parts[0] == 'Remix & Mashups Hub':
        category = parts[1]
    elif 'VIDEO POOL EDITS' in parts[0]:
        if len(parts) >= 3:
            category = f"{parts[0]} - {parts[1]}"
        else:
            category = parts[0]
    else:
        category = parts[0]
    
    return category, parts[-1]

def sync_tracks():
    input_file = "scanned_files.txt"
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    print(f"Reading {input_file} for Supabase sync...")
    with open(input_file, "r", encoding="utf-8", errors='ignore') as f:
        lines = f.readlines()

    processed_tracks = []
    
    # Base URL for DJ FLOWERZ VIDEO POOL (R2 CDN)
    base_url = "https://cdn.vicknickvideopool.com"
    namespace = uuid.NAMESPACE_DNS
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith("==="): continue

        folder_path = os.path.dirname(line)
        file_name = os.path.basename(line)
        
        # Determine category (which we will use as Genre) and filename
        category, filename = parse_category_logic(line)
        
        # Clean the title
        full_title = clean_title_logic(filename)
        
        # Extract Artist - Title if possible
        if " - " in full_title:
            parts = full_title.split(" - ", 1)
            artist = parts[0]
            title = parts[1]
        else:
            artist = "Various Artists"
            title = full_title
            
        # Determine source
        source = "R2 Video Pool"
        if "Remix & Mashups Hub" in line:
             source = "Remix & Mashups Hub"

        # Unique ID based on full path
        full_path = line.replace("//", "/")
        track_id = str(uuid.uuid5(namespace, full_path))
        
        quoted_path = urllib.parse.quote(full_path)
        download_url = f"{base_url}/{quoted_path}"
        
        # Determine version type
        v_type = "Video" if file_name.lower().endswith(('.mp4', '.mov', '.webm', '.mkv', '.avi', '.dat')) else "Audio"
        lower_filename = file_name.lower()
        if "clean" in lower_filename: v_type = "Clean"
        if "dirty" in lower_filename: v_type = "Dirty"
        if "extended" in lower_filename: v_type = "Extended"
        if "instr" in lower_filename: v_type = "Instrumental"
        if "acap" in lower_filename: v_type = "Acapella"

        # Year detection
        year = None
        match = re.search(r'(19|20)\d{2}', line)
        if match:
            year = int(match.group())

        track_data = {
            "id": track_id,
            "artist": artist.strip(),
            "title": title.strip(),
            "year": year,
            "genre": category, 
            "category": [category],
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

    print(f"Parsed {len(processed_tracks)} tracks.")

    # Headers for Supabase
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    upsert_url = f"{SUPABASE_URL}/rest/v1/pool_tracks"

    # Batch Upsert
    batch_size = 200 # Smaller batch just in case
    for i in range(0, len(processed_tracks), batch_size):
        batch = processed_tracks[i:i + batch_size]
        print(f"Upserting batch {i // batch_size + 1}... ({i} to {i + len(batch)})")
        response = requests.post(upsert_url, headers=headers, data=json.dumps(batch))
        if response.status_code not in [200, 201]:
            print(f"Error in batch {i}: {response.status_code} - {response.text}")
            # If still failing, let's try one by one to see the exact offending field if needed
            # but usually it's a schema issue.

    print("Success! Supabase updated with new structure and cleaned titles.")

if __name__ == "__main__":
    sync_tracks()
