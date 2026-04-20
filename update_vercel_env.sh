#!/bin/bash
# update_vercel_env.sh
# Final script to push core environment variables to Vercel production.
# Removes legacy Brevo/MailerLite and points to Gmail SMTP & Cloudflare R2.

# 1. Core Secrets (Use Vercel dashboard for security if possible, but providing here for migration)
# Replace with actual values if needed.
vars=(
    "GMAIL_USER=djflowerz254@gmail.com"
    "GMAIL_APP_PASSWORD=xnqinwdsbbfjpick"
    "VITE_R2_URL=https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev"
    "R2_ACCOUNT_ID=ca961f0eb41ca2bf77291b1769ca1c1d"
    "R2_ACCESS_KEY_ID=4edededb28b4666323bf7a763ab391d1"
    "R2_SECRET_ACCESS_KEY=5d2ce9467a45d362df943ea8e0c5afd0857c2be36524c97d4026f1bd570f3a22"
    "R2_BUCKET_NAME=djflowerz-images"
    "VITE_ADMIN_EMAIL="
    "VITE_APP_URL=https://djflowerz.co.ke"
    "EMAIL_NOREPLY=noreply@djflowerz.co.ke"
    "EMAIL_BOOKINGS=bookings@djflowerz.co.ke"
    "EMAIL_ADMIN=admin@djflowerz.co.ke"
    "EMAIL_PROMO=promo@djflowerz.co.ke"
    "EMAIL_RECEIPTS=receipts@djflowerz.co.ke"
    "VITE_STORAGE_WORKER_URL=https://www.djflowerz.co.ke"
)

# 2. Add vars to Vercel
for item in "${vars[@]}"; do
    key=$(echo $item | cut -d'=' -f1)
    value=$(echo $item | cut -d'=' -f2-)
    echo "Updating $key in Vercel production..."
    
    # Try removing old key first to avoid duplicates
    # Ignore errors if it doesn't exist
    vercel env rm $key production -y 2>/dev/null
    
    # Add new key
    echo -n "$value" | vercel env add $key production
done

echo "✅ Vercel environment updated. Trigger a redeploy to apply changes."
