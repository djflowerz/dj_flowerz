
import requests
import json
import os
import re
import urllib.parse
import uuid

# List of "Hub" folders that should be treated as genres despite not being in /Genres/
HUB_GENRES = ["Riddimz F'", "Remix & Mashups Hub", "Redrums Video Remixes", "Riddim Videos"]

def extract_genre_info(folder_path):
    parts = [p.strip() for p in folder_path.split('/') if p.strip()]
    if not parts:
        return "General", None
    
    genre = "General"
    sub_genre = None

    # Priority 1: Match Genres/Subfolder
    if parts[0].lower() == "genres" and len(parts) > 1:
        genre = parts[1]
        if len(parts) > 2:
            sub_genre = parts[-1] # The immediate parent
    
    # Priority 2: Match top-level Hubs
    elif parts[0] in HUB_GENRES:
        genre = parts[0]
        if len(parts) > 1:
            sub_genre = parts[-1]
    
    # Priority 3: Check for year edits at top level
    elif re.match(r'202\d VIDEO POOL EDITS', parts[0], re.IGNORECASE):
        genre = "Pool Edits"
        if len(parts) > 1:
            sub_genre = parts[1]
    
    # Fallback
    else:
        genre = parts[0]
        if len(parts) > 1:
            sub_genre = parts[-1]

    # CLEANUP: If sub_genre is just a year or month, and we want to keep it "clean"
    # User said "do not add year and months edits in the side genre"
    # But for subfolders, it's okay? "if a genre has folders inside create subfolders inside that genre"
    
    return genre, sub_genre

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
    unique_genres = set()
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
        source = "R2 Video Pool" 
        if "Remix & Mashups Hub" in folder_path:
             source = "Remix & Mashups Hub"

        name_part = os.path.splitext(file_name)[0]
        if " - " in name_part:
            artist, title = name_part.split(" - ", 1)
        else:
            artist = "Unknown Artist"
            title = name_part
        
        # Replace legacy branding
        if "[ DJ VICKNICK VIDEO POOL]" in title:
            title = title.replace("[ DJ VICKNICK VIDEO POOL]", "[DJ FLOWERZ VIDEOPOOL]")
        if "DJ VICKNICK VIDEO POOL" in title:
              title = title.replace("DJ VICKNICK VIDEO POOL", "DJ FLOWERZ VIDEOPOOL")
        if "DJ VICNICK VIDEOPOOL" in title:
              title = title.replace("DJ VICNICK VIDEOPOOL", "DJ FLOWERZ VIDEOPOOL")
        
        # Improved year detection
        year = None
        if "2026" in folder_path or "2026" in file_name: year = 2026
        elif "2025" in folder_path or "2025" in file_name: year = 2025
        elif "2024" in folder_path or "2024" in file_name: year = 2024
        elif "2023" in folder_path or "2023" in file_name: year = 2023
        elif "2022" in folder_path or "2022" in file_name: year = 2022

        genre, sub_genre = extract_genre_info(folder_path)
        unique_genres.add(genre)
        
        # Categories: Clean up folder structure
        raw_parts = [p.strip() for p in folder_path.split('/') if p.strip()]
        categories = []
        
        # Always include the top genre and sub-genre in categories for filtering
        if genre: categories.append(genre.upper())
        if sub_genre: categories.append(sub_genre.upper())

        for part in raw_parts:
            c = part.upper()
            c = c.replace("DJ FLOWERZ", "").replace("VIDEO POOL", "").replace("GENRES", "").replace("  ", " ").strip()
            # Monthly format
            c = c.replace("JANUARY", "JAN").replace("FEBRUARY", "FEB").replace("MARCH", "MAR")
            c = c.replace("APRIL", "APR").replace("AUGUST", "AUG").replace("SEPTEMBER", "SEP")
            c = c.replace("OCTOBER", "OCT").replace("NOVEMBER", "NOV").replace("DECEMBER", "DEC")
            
            if c and c not in categories:
                categories.append(c)
        
        # Specific Category extraction (Hype/Low Hype/Redrum/etc)
        fp_lower = folder_path.lower()
        if "afrobeat" in fp_lower or "afro beat" in fp_lower:
            if "AFROBEATS" not in categories: categories.append("AFROBEATS")
        if "redrum" in fp_lower:
            if "REDRUM" not in categories: categories.append("REDRUM")
        if "remix" in fp_lower:
            if "REMIX" not in categories: categories.append("REMIX")
            
        # FIX for Hype/Low Hype Confusion
        # Only add HYPE if it says "(Hype)" and not "(Low Hype)"
        if "(hype)" in fp_lower or " hype" in fp_lower:
            if "(low hype)" not in fp_lower and "low hype" not in fp_lower:
                if "HYPE" not in categories: categories.append("HYPE")
        
        if "low hype" in fp_lower:
            if "LOW HYPE" not in categories: categories.append("LOW HYPE")

        full_path = f"{folder_path}/{file_name}".replace("//", "/")
        track_id = str(uuid.uuid5(namespace, full_path))
        current_ids.add(track_id)
        
        quoted_path = urllib.parse.quote(full_path)
        download_url = f"{base_url}/{quoted_path}"
        
        # Version type
        v_type = "Video" if file_name.lower().endswith(('.mp4', '.mov', '.webm', '.mkv')) else "Audio"
        fn_lower = file_name.lower()
        if "clean" in fn_lower: v_type = "Clean"
        if "dirty" in fn_lower: v_type = "Dirty"
        if "extended" in fn_lower or "extendz" in fn_lower: v_type = "Extended"

        clean_title = title.strip()
        clean_title = re.sub(r'^(\(?202\d\)?\s+|-?\s*)', '', clean_title)
        
        track_data = {
            "id": track_id,
            "artist": artist.strip(),
            "title": clean_title,
            "year": year if year else 0,
            "genre": genre,
            "subGenre": sub_genre,
            "category": categories,
            "isNew": year == 2026,
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

    print(f"Parsed {len(processed_tracks)} tracks. Found {len(unique_genres)} genres.")

    # 1. Save Pool Tracks
    output_file = os.path.join(script_dir, "..", "public", "data", "pool_tracks.json")
    print(f"Saving tracks to {output_file}...")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(processed_tracks, f, indent=2)

    # 2. Save Genres
    # Sort genres nicely
    sorted_genres = sorted(list(unique_genres))
    genre_data = []

    # Track sub-genres for each genre
    sub_genre_map = {}
    for t in processed_tracks:
        g = t['genre']
        sg = t.get('subGenre')
        if g not in sub_genre_map:
            sub_genre_map[g] = set()
        if sg:
            sub_genre_map[g].add(sg)

    for g in sorted_genres:
        # Calculate track count for this genre
        count = sum(1 for t in processed_tracks if t['genre'] == g)
        sub_genres = sorted(list(sub_genre_map.get(g, set())))

        genre_data.append({
            "id": str(uuid.uuid5(namespace, g)),
            "name": g,
            "slug": g.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("&", "n"),
            "trackCount": count,
            "subGenres": sub_genres,
            "is_active": True,
            "created_at": "2026-03-03T00:00:00.000Z"
        })
    
    genres_file = os.path.join(script_dir, "..", "public", "data", "genres.json")
    print(f"Saving {len(genre_data)} genres to {genres_file}...")
    with open(genres_file, "w", encoding="utf-8") as f:
        json.dump(genre_data, f, indent=2)

    print("Success! Music pool and genres exported with subfolder support.")

if __name__ == "__main__":
    seed_tracks()
