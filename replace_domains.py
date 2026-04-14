import os

directory = '.'
search_str = 'djflowerz-worker.ianmuriithiflowerz.workers.dev'
replace_str = 'api.djflowerz.co.ke'
extensions = ['.js', '.tsx', '.ts', '.jsx', '.cjs', '.html', '.sh', '.json', '.dev', '.prod']

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.git' in root or 'dist' in root:
        continue
    for file in files:
        if file.endswith(tuple(extensions)) or file == 'index.html':
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            if search_str in content:
                content = content.replace(search_str, replace_str)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filepath}")
print("Replacement complete.")
