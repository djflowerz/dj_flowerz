import re

def clean_sql():
    with open('supabase/cloudflare-d1-seed.sql', 'r') as f:
        lines = f.readlines()
    
    with open('supabase/cloudflare-d1-seed-clean.sql', 'w') as f:
        for line in lines:
            if line.startswith('INSERT'):
                # truncate any line longer than 10k to 10k but try to keep it valid SQL 
                # (this is crude but should stop the crashing)
                if len(line) > 10000:
                    # try to find the last comma or quote before 10k
                    truncated = line[:9900]
                    # This is very crude, it might break the SQL logic but will avoid the crashing
                    # Better solution: find the VALUES part and truncate the strings inside
                    pass
                
                # Actually, let's just REPLACE all long strings in the line
                # Match '...' strings
                cleaned_line = re.sub(r"'(.*?)'", lambda m: m.group(0) if len(m.group(0)) < 5000 else m.group(0)[:4999] + "'", line)
                f.write(cleaned_line)
            else:
                f.write(line)

if __name__ == "__main__":
    clean_sql()
