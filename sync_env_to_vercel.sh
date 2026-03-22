#!/bin/bash
PROJECT_NAME="dj-flowerz"
ENV_FILE=".env.local"

# Get all VITE_ variables from .env.local
grep "^VITE_" "$ENV_FILE" | while read -r line; do
    KEY=$(echo "$line" | cut -d'=' -f1)
    VALUE=$(echo "$line" | cut -d'=' -f2- | tr -d '"')
    
    echo "Syncing $KEY..."
    # Remove existing var if it exists
    vercel env rm "$KEY" production -y 2>/dev/null
    # Add new var
    echo -n "$VALUE" | vercel env add "$KEY" production
done
