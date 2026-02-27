
import requests
import json
import re
import os

def clean_branding(text):
    if not text:
        return text
    # Case-insensitive replacement of the old branding
    pattern = re.compile(re.escape("DJ VICKNICK VIDEO POOL"), re.IGNORECASE)
    cleaned = pattern.sub("DJ FLOWERZ VIDEO POOL", text)
    # Also handle variants without brackets if they exist
    cleaned = cleaned.replace("R2 Video Pool", "DJ FLOWERZ VIDEO POOL")
    return cleaned

def parse_filename(base_title):
    base_title = clean_branding(base_title)
    
    parts = base_title.split(' - ', 1)
    if len(parts) == 2:
        p1 = parts[0].strip()
        p2 = parts[1].strip()
        
        artist_indicators = ['&', 'feat', 'ft.', 'ft ', ' x ', ',']
        is_p1_potential_artist = any(sig in p1.lower() for sig in artist_indicators)
        
        if is_p1_potential_artist:
            artist = p1
            title = p2
        else:
            title = p1
            artist = p2
    else:
        title = base_title.strip()
        artist = "Unknown"
    
    # Extract year
    year_match = re.search(r'\((\d{4})\)', base_title)
    if not year_match:
        year_match = re.search(r'\b(20\d{2}|19\d{2})\b', base_title)
    year = year_match.group(1) if year_match else "N/A"
    
    return artist, title, year

def get_tracks_from_worker(url):
    print(f"Fetching from {url}...")
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error: {e}")
    return []

def get_tracks_from_html(url):
    print(f"Fetching from {url}...")
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            match = re.search(r'ALL_TRACKS\s*=\s*(\[.*?\]);', response.text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
    except Exception as e:
        print(f"Error: {e}")
    return []

def main():
    all_tracks_data = []
    
    worker_url = "https://remix-and-mashups-worker.dennismacharia20.workers.dev/api/tracks"
    worker_tracks = get_tracks_from_worker(worker_url)
    for t in worker_tracks:
        t['source'] = "DJ FLOWERZ VIDEO POOL"
        all_tracks_data.append(t)
        
    r2_url = "https://r2.vicknickvideopool.com/"
    r2_tracks = get_tracks_from_html(r2_url)
    for t in r2_tracks:
        t['source'] = "DJ FLOWERZ VIDEO POOL"
        all_tracks_data.append(t)
        
    print(f"Total: {len(all_tracks_data)}")
    
    output_lines = ["FILE_NAME | ARTIST | TRACK_NAME | YEAR | FOLDER_PATH | SOURCE"]
    output_lines.append("-" * 100)
    
    for track in all_tracks_data:
        base_title = track.get('baseTitle', 'Unknown')
        file_name = track.get('fileName', 'Unknown')
        key = track.get('key', 'Unknown')
        
        # Apply global cleaning
        file_name = clean_branding(file_name)
        key = clean_branding(key)
        
        artist, title, year = parse_filename(base_title)
        
        # Secondary check/clean on artist/title
        artist = clean_branding(artist)
        title = clean_branding(title)
        
        # Override year if field exists
        tf_year = track.get('year')
        if tf_year and str(tf_year).isdigit() and len(str(tf_year)) == 4:
            year = tf_year
            
        folder_path = os.path.dirname(key).replace("//", "/")
        source = track.get('source', 'Unknown')
        
        line = f"{file_name} | {artist} | {title} | {year} | {folder_path} | {source}"
        output_lines.append(line)
        
    with open("music_track_list.txt", "w", encoding='utf-8') as f:
        f.write("\n".join(output_lines))
    
    print("Done. Fully rebranded and cleaned R2 references.")

if __name__ == "__main__":
    main()
