#!/bin/bash
# update_vercel_env_robust.sh
# Robustly syncs .env and .env.local to Vercel production.

# Load and export vars from .env and .env.local
set -o allexport
[ -f .env ] && source .env
[ -f .env.local ] && source .env.local
set +o allexport

# Variables to sync to Vercel production
VARS_TO_SYNC=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "VITE_STORAGE_WORKER_URL"
    "VITE_R2_URL"
    "R2_ACCOUNT_ID"
    "R2_ACCESS_KEY_ID"
    "R2_SECRET_ACCESS_KEY"
    "R2_BUCKET_NAME"
    "VITE_ADMIN_EMAIL"
    "VITE_SITE_URL"
    "VITE_APP_URL"
    "VITE_FIREBASE_API_KEY"
    "VITE_FIREBASE_APP_ID"
    "VITE_FIREBASE_AUTH_DOMAIN"
    "VITE_FIREBASE_DATABASE_URL"
    "VITE_FIREBASE_MESSAGING_SENDER_ID"
    "VITE_FIREBASE_PROJECT_ID"
    "VITE_FIREBASE_STORAGE_BUCKET"
    "VITE_PAYSTACK_PUBLIC_KEY"
    "VITE_PAYSTACK_SECRET_KEY"
)

echo "🚀 Syncing environment variables to Vercel production..."

for var in "${VARS_TO_SYNC[@]}"; do
    value="${!var}"
    if [ -z "$value" ]; then
        echo "⚠️ $var is empty or not set. Skipping."
        continue
    fi
    
    echo "Updating $var..."
    # Remove to avoid conflicts
    vercel env rm "$var" production -y 2>/dev/null
    
    # Add new value
    echo -n "$value" | vercel env add "$var" production
done

echo "✅ Vercel environment synced. Run 'vercel --prod' to redeploy."
