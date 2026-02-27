
import requests
import json
import time

import os

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_all_supabase_ids():
    if not SUPABASE_KEY:
        print("Error: SUPABASE_SERVICE_ROLE_KEY not set")
        return []

    url = f"{SUPABASE_URL}/rest/v1/pool_tracks?select=id"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    all_ids = []
    limit = 1000
    offset = 0
    
    while True:
        print(f"Fetching IDs, offset {offset}...")
        resp = requests.get(f"{url}&limit={limit}&offset={offset}", headers=headers)
        if resp.status_code != 200:
            print(f"Error: {resp.text}")
            break
        
        data = resp.json()
        if not data:
            break
        
        all_ids.extend([d['id'] for d in data])
        if len(data) < limit:
            break
        offset += limit
        
    return all_ids

if __name__ == "__main__":
    ids = get_all_supabase_ids()
    print(f"Found {len(ids)} total IDs in Supabase.")
    with open("supabase_ids.json", "w") as f:
        json.dump(ids, f)
