
import json
import re

input_file = 'r2_downloads_list.txt'
output_file = 'public/r2_tracks.json'

tracks_map = {}

current_category = "Uncategorized"

with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

i = 0
while i < len(lines):
    line = lines[i].strip()
    
    if line.startswith("CATEGORY:"):
        # Format: CATEGORY: Genre Name (Count tracks)
        match = re.search(r"CATEGORY: (.*?) \(", line)
        if match:
            current_category = match.group(1).strip()
        else:
            current_category = line.replace("CATEGORY:", "").strip()
        i += 1
        continue
    
    if line.startswith("Title:"):
        title = line.replace("Title:", "").strip()
        
        # Read next lines
        artist_line = lines[i+1].strip() if i+1 < len(lines) else ""
        preview_line = lines[i+2].strip() if i+2 < len(lines) else ""
        download_line = lines[i+3].strip() if i+3 < len(lines) else ""
        
        artist = artist_line.replace("Artist:", "").strip()
        preview_url = preview_line.replace("Preview Link:", "").strip()
        download_url = download_line.replace("Download Link:", "").strip()
        
        # Unique ID based on URL (since title/artist might have slight variations or duplicates)
        # Using URL ensures we match the exact file.
        track_id = download_url
        
        if track_id not in tracks_map:
            # Try to extract year
            year = 2024 # Default
            # Check category for year
            year_match = re.search(r'(20\d{2})', current_category)
            if year_match:
                year = int(year_match.group(1))
            else:
                # Check title/artist
                year_match_text = re.search(r'(20\d{2})', title + " " + artist)
                if year_match_text:
                    year = int(year_match_text.group(1))
            
            # Determine BPM (placeholder)
            bpm = 0
            
            tracks_map[track_id] = {
                "id": track_id, # Will be replaced by Firebase ID or hashed?
                # Actually, effectively we can let Firebase generate ID, but for deduping we use URL.
                "artist": artist,
                "title": title,
                "genre": current_category, # Primary genre
                "category": set(),
                "bpm": bpm,
                "year": year,
                "previewUrl": preview_url,
                "versions": [
                    {
                        "id": "v1", # Placeholder
                        "type": "Original", 
                        "downloadUrl": download_url
                    }
                ],
                "dateAdded": "2024-02-12T00:00:00Z" # ISO string
            }
        
        # Add category
        tracks_map[track_id]["category"].add(current_category)
        
        i += 4 # Skip the processed lines
    else:
        i += 1

# Convert sets to lists and values to array
final_tracks = []
for track in tracks_map.values():
    track['category'] = list(track['category'])
    # Clean up ID? No, we'll let the importer handle ID generation if needed, 
    # OR better: use a clear deterministic ID so we don't duplicate on re-runs.
    # but Firestore auto-id is safer.
    del track['id'] 
    final_tracks.append(track)

print(f"Parsed {len(final_tracks)} unique tracks.")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(final_tracks, f, indent=2)

print(f"Saved to {output_file}")
