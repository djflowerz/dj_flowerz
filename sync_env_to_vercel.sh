#!/bin/bash
PROJECT_NAME="dj-flowerz"
ENV_FILE=".env.local"

# Get relevant variables from .env.local
# This includes VITE_ for frontend and server-side secrets for Vercel functions
grep -E "^(VITE_|R2_|SUPABASE_|GMAIL_|DATABASE_|CRON_)" "$ENV_FILE" | while read -r line; do
    KEY=$(echo "$line" | cut -d'=' -f1)
    # Handle values that might be quoted or contain special characters
    VALUE=$(echo "$line" | cut -d'=' -f2- | sed 's/^"//;s/"$//;s/\\n/\n/g')
    
    echo "Syncing $KEY..."
    # Always update existing var
    vercel env rm "$KEY" production -y 2>/dev/null
    echo -n "$VALUE" | vercel env add "$KEY" production
done
