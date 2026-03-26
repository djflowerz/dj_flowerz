import json
import sys
import os

def main():
    path = '/Users/DJFLOWERZ/.gemini/antigravity/scratch/dj_flowerz/tracks_debug.json'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
        
    with open(path, 'r') as f:
        data = json.load(f)
    
    matches = [item for item in data if 'Candy Shop' in item.get('baseTitle', '')]
    print(json.dumps(matches, indent=2))

if __name__ == '__main__':
    main()
