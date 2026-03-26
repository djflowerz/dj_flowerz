import re
import sys

def main():
    path = '/Users/DJFLOWERZ/.gemini/antigravity/scratch/dj_flowerz/import_pool.sql'
    with open(path, 'r') as f:
        content = f.read()

    # Find the track entry for Post Malone - Wow. - Urban Fusion Candy Shop Edit
    pattern = r"\('(ext_\d+)', 'Wow. - Urban Fusion Candy Shop Edit'"
    match = re.search(pattern, content)
    
    if not match:
        print("Track ID not found for 'Post Malone'")
        return

    track_id = match.group(1)
    print(f"Found Track ID: {track_id}")

    # Count versions for this track_id
    version_pattern = rf"\('ver_\d+', '{track_id}'"
    versions = re.findall(version_pattern, content)
    print(f"Number of versions found for {track_id}: {len(versions)}")

if __name__ == '__main__':
    main()
