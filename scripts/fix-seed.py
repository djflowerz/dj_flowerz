import re

def fix_seed():
    with open('supabase/cloudflare-d1-seed.sql', 'r') as f:
        lines = f.readlines()

    fixed_lines = []
    for line in lines:
        if line.startswith('INSERT'):
            # Basic truncation for extreme cases
            if len(line) > 100000: # 100KB limit per statement is usually safe, but D1 might be stricter
                line = line[:90000] + "..." + line[-100:]
            fixed_lines.append(line)
        else:
            fixed_lines.append(line)

    with open('supabase/cloudflare-d1-seed-fixed.sql', 'w') as f:
        f.writelines(fixed_lines)

if __name__ == "__main__":
    fix_seed()
