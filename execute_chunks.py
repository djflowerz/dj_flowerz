import subprocess
import os
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 execute_chunks.py <sql_file> [chunk_size]")
        sys.exit(1)
        
    path = sys.argv[1]
    chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 100

    if not os.path.exists(path):
        print(f"Error: File not found: {path}")
        sys.exit(1)

    with open(path, 'r') as f:
        lines = f.readlines()

    total_chunks = (len(lines) + chunk_size - 1) // chunk_size
    print(f"Executing {len(lines)} lines in {total_chunks} chunks (size {chunk_size})...")

    for i in range(0, len(lines), chunk_size):
        chunk = lines[i:i + chunk_size]
        chunk_idx = i // chunk_size
        chunk_file = f'./chunk_{chunk_idx}.sql'
        
        with open(chunk_file, 'w') as cf:
            cf.writelines(chunk)
        
        print(f"[{chunk_idx + 1}/{total_chunks}] Executing chunk...")
        cmd = [
            'npx', 'wrangler', 'd1', 'execute', 'djflowerz-db',
            f'--file={chunk_file}', '--remote'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error in chunk {chunk_idx + 1}: {result.stderr}")
            # Optional: os.remove(chunk_file); sys.exit(1)
        else:
            print(f"Chunk {chunk_idx + 1} success.")
        
        if os.path.exists(chunk_file):
            os.remove(chunk_file)

if __name__ == '__main__':
    main()
