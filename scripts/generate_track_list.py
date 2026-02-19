
import os
import re

def clean_title(title):
    # Aggressively replace DJ VICKNICK with DJ FLOWERZ
    # Case insensitive, handle potential variations
    title = re.sub(r'DJ\s+VICKNICK', 'DJ FLOWERZ', title, flags=re.IGNORECASE)
    title = re.sub(r'VICKNICK', 'FLOWERZ', title, flags=re.IGNORECASE)
    
    # Remove file extensions
    title = os.path.splitext(title)[0]
    
    # Replace underscores with spaces for cleaner look
    title = title.replace('_', ' ')
    
    # Clean up multiple spaces
    title = re.sub(r'\s+', ' ', title).strip()
    
    return title

def parse_line(line):
    parts = line.strip().split('/')
    if len(parts) < 2:
        return None, None
    
    # Categorization logic matching user's requested "respective genres"
    if parts[0] == 'Genres':
        category = parts[1]
        filename = parts[-1]
    elif parts[0] == 'Remix & Mashups Hub':
        category = parts[1]
        filename = parts[-1]
    elif 'VIDEO POOL EDITS' in parts[0]:
        # Handle 2020 VIDEO POOL EDITS/APRIL 2020 EDITS/filename
        if len(parts) >= 3:
            category = f"{parts[0]} - {parts[1]}"
            filename = parts[-1]
        else:
            category = parts[0]
            filename = parts[-1]
    else:
        category = parts[0]
        filename = parts[-1]
    
    return category, filename

def main():
    input_file = 'scanned_files.txt'
    output_file = 'music_track_list.txt'
    
    if not os.path.exists(input_file):
        print(f"Input file {input_file} not found.")
        return

    data = {}

    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if not line.strip() or line.startswith('==='):
                continue
            
            category, filename = parse_line(line)
            if not category or not filename:
                continue
            
            cleaned = clean_title(filename)
            
            if category not in data:
                data[category] = []
            
            data[category].append(cleaned)

    # Sort categories
    sorted_categories = sorted(data.keys())

    with open(output_file, 'w', encoding='utf-8') as f:
        for cat in sorted_categories:
            f.write(f"========================================\n")
            f.write(f"{cat.upper()}\n")
            f.write(f"========================================\n\n")
            
            # Sort tracks within category
            tracks = sorted(list(set(data[cat]))) # Set to remove duplicates
            for track in tracks:
                f.write(f"- {track}\n")
            
            f.write("\n")

    print(f"Successfully generated {output_file}")

if __name__ == "__main__":
    main()
