import re
with open('context/DataContext.tsx', 'r') as f:
    content = f.read()

# Find all useCallback declarations
for m in re.finditer(r'useCallback\(.*?\n\s*\},?\s*\[(.*?)\]\);', content, re.DOTALL):
    pass
    # If this doesn't match properly, it might highlight the broken hook

