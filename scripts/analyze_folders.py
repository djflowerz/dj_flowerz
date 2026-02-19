
import os

with open("music_track_list.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

subfolders = set()
for line in lines[2:]:
    parts = line.split('|')
    if len(parts) >= 5:
        folder_path = parts[4].strip()
        if folder_path.startswith("Remix & Mashups Hub/"):
            sub = folder_path.split('/')[1]
            subfolders.add(sub)

print("Subfolders of Remix & Mashups Hub:")
for sub in sorted(subfolders):
    print(f"- {sub}")
