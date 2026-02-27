#!/usr/bin/env python3
"""
Script to add Remix & Mashups tracks to r2_downloads_list.txt
Formats the tracks in the same format as existing entries
Reads track data from remix_tracks_data.json
"""

import json
import re
import sys

def format_track_entry(track):
    """Format a single track in the r2_downloads_list.txt format"""
    return f"""Title: {track['title']}
Artist: {track['artist']}
Preview Link: {track['previewLink']}
Download Link: {track['downloadLink']}
"""

def check_for_duplicates(tracks, filename='r2_downloads_list.txt'):
    """Check if any tracks already exist in the file (optimized with set)"""
    print("🔍 Checking for duplicates...")
    
    # Read file and extract all download links into a set for O(1) lookup
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all existing download links
    existing_links = set(re.findall(r'Download Link: (.+)', content))
    print(f"📊 Found {len(existing_links)} existing tracks in file")
    
    duplicates = []
    new_tracks = []
    
    for track in tracks:
        if track['downloadLink'] in existing_links:
            duplicates.append(track)
        else:
            new_tracks.append(track)
    
    return duplicates, new_tracks

def append_tracks_to_file(tracks, filename='r2_downloads_list.txt', check_duplicates=True):
    """Append formatted tracks to the file"""
    
    original_count = len(tracks)
    
    if check_duplicates:
        dups, tracks = check_for_duplicates(tracks, filename)
        
        if dups:
            print(f"⚠️  Found {len(dups)} duplicate tracks (already in file)")
            print(f"✅ {len(tracks)} new tracks to add")
            
            if len(tracks) == 0:
                print("\n❌ No new tracks to add. All tracks already exist.")
                return False
        else:
            print(f"✅ All {len(tracks)} tracks are new")
    
    # Read current file to get total count
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract current total count
    match = re.search(r'Total Tracks: (\d+)', content)
    current_total = int(match.group(1)) if match else 0
    
    new_total = current_total + len(tracks)
    
    # Prepare new content
    category_header = f"\n\nCATEGORY: Remix & Mashups ({len(tracks)} tracks)\n"
    category_header += "-" * 50 + "\n"
    
    tracks_content = ""
    for track in tracks:
        tracks_content += format_track_entry(track) + "\n"
    
    # Update total count in header
    updated_content = re.sub(
        r'Total Tracks: \d+',
        f'Total Tracks: {new_total}',
        content
    )
    
    # Write updated content with new tracks
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(updated_content)
        f.write(category_header)
        f.write(tracks_content)
    
    print(f"\n✅ Successfully added {len(tracks)} tracks to {filename}")
    print(f"📊 Previous total: {current_total} tracks")
    print(f"📊 New total: {new_total} tracks")
    print(f"📁 Category: Remix & Mashups")
    return True

def load_tracks_from_json(json_file='remix_tracks_data.json'):
    """Load tracks from JSON file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            tracks = json.load(f)
        print(f"📥 Loaded {len(tracks)} tracks from {json_file}")
        return tracks
    except FileNotFoundError:
        print(f"❌ Error: {json_file} not found")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("  Remix & Mashups Track Importer")
    print("=" * 60)
    
    # Load tracks from JSON
    tracks = load_tracks_from_json()
    
    if tracks is None:
        print("\n❌ Failed to load tracks. Exiting.")
        sys.exit(1)
    
    if len(tracks) == 0:
        print("\n⚠️  No tracks found in JSON file. Exiting.")
        sys.exit(1)
    
    print(f"\n📋 Ready to add {len(tracks)} tracks")
    print(f"   First track: {tracks[0]['title']}")
    if len(tracks) > 1:
        print(f"   Last track: {tracks[-1]['title']}")
    
    # Confirm before proceeding
    response = input("\nProceed with adding tracks? (y/n): ")
    if response.lower() != 'y':
        print("❌ Aborted by user")
        sys.exit(0)
    
    # Append tracks
    success = append_tracks_to_file(tracks)
    
    if success:
        print("\n" + "=" * 60)
        print("  ✅ Import Complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Run: python parse_r2_to_json.py")
        print("2. Navigate to Admin Dashboard")
        print("3. Click 'Seed R2 Data' button")
        print("=" * 60)
    else:
        print("\n❌ Import failed or was cancelled")
        sys.exit(1)

