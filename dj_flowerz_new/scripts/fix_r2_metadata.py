
import os

INPUT_FILE = "r2_downloads_list.txt"
BACKUP_FILE = "r2_downloads_list.txt.bak"

# List of "Artists" that are actually Genres/Categories
BAD_ARTISTS = [
    "Afro House",
    "Club Edits",
    "Dancehall Remixes",
    "Amapiano",
    "Reggae Fussion",
    "HYPE EDITS"
]

def fix_metadata():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    # Create backup
    import shutil
    shutil.copy2(INPUT_FILE, BACKUP_FILE)
    print(f"Backup created at {BACKUP_FILE}")

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    fixed_count = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        
        if line.startswith("Title:"):
            title_line = line
            artist_line_idx = i + 1
            
            # Ensure we don't go out of bounds and next line is Artist
            if artist_line_idx < len(lines) and lines[artist_line_idx].startswith("Artist:"):
                artist_val = lines[artist_line_idx].strip().replace("Artist:", "").strip()
                
                if artist_val in BAD_ARTISTS:
                    title_val = title_line.strip().replace("Title:", "").strip()
                    
                    if " - " in title_val:
                        # Split by " - "
                        # Heuristic: First part is Artist, Rest is Title
                        # ex: "Artist - Title" -> Artist, Title
                        # ex: "Artist - Title - Remix" -> Artist, Title - Remix
                        parts = title_val.split(" - ", 1)
                        
                        if len(parts) >= 2:
                            new_artist = parts[0].strip()
                            new_title = parts[1].strip()
                            
                            # Update lines in memory
                            lines[i] = f"Title: {new_title}\n"
                            lines[artist_line_idx] = f"Artist: {new_artist}\n"
                            
                            fixed_count += 1
                            # print(f"Fixed: '{title_val}' -> Artist: '{new_artist}', Title: '{new_title}'")
        
        i += 1

    with open(INPUT_FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"Successfully fixed {fixed_count} tracks.")

if __name__ == "__main__":
    fix_metadata()
