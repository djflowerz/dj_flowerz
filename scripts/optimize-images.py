import os
import re

def optimize_images():
    count = 0
    # Match <img ... > but ensure we don't accidentally match something else.
    # Look for <img and replace with <img loading="lazy" if it doesn't already have loading=
    img_regex = re.compile(r'<img\s+(?![^>]*\bloading=)([^>]*?)>')

    for root, dirs, files in os.walk('./'):
        if 'node_modules' in root or '.git' in root or 'dist' in root or 'build' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.jsx')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content, num_subs = img_regex.subn(r'<img loading="lazy" \1>', content)
                
                if num_subs > 0:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Optimized {num_subs} images in {path}")
                    count += num_subs
    print(f"Total images optimized: {count}")

if __name__ == "__main__":
    optimize_images()
