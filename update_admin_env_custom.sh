#!/bin/bash
# update_admin_env_custom.sh

PROJECT_DIR="admin-dashboard"

vars=(
    "VITE_API_URL=https://api.djflowerz.co.ke"
    "VITE_SUPABASE_URL=https://yevqnoynsqidtplxggzs.supabase.co"
    "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnFub3luc3FpZHRwbHhnZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjQ3ODAsImV4cCI6MjA4NzY0MDc4MH0.cb_79oC-RKNkhJBshhGw_tcFIVG50Wg6K0HIIK2Uyms"
    "VITE_APP_URL=https://djflowerz.co.ke"
    "VITE_ADMIN_EMAIL="
    "VITE_FIREBASE_API_KEY=AIzaSyCJ-yumwuCfGwxgjRhyCUIIc50_tcmEwb4"
    "VITE_FIREBASE_PROJECT_ID=flowpay-401a4"
    "VITE_FIREBASE_AUTH_DOMAIN=flowpay-401a4.firebaseapp.com"
    "VITE_FIREBASE_STORAGE_BUCKET=flowpay-401a4.firebasestorage.app"
    "VITE_FIREBASE_MESSAGING_SENDER_ID=990425156188"
    "VITE_FIREBASE_APP_ID=1:990425156188:web:0b95648801bdd2a7d3f499"
)

cd $PROJECT_DIR || exit

for item in "${vars[@]}"; do
    key=$(echo $item | cut -d'=' -f1)
    value=$(echo $item | cut -d'=' -f2-)
    echo "Updating $key in admin-dashboard production..."
    vercel env rm $key production -y 2>/dev/null
    echo -n "$value" | vercel env add $key production
done

echo "✅ Admin environment updated."
