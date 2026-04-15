#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# set_netlify_env.sh
# Pushes all DJ Flowerz environment variables to Netlify via CLI.
#
# Prerequisites:
#   npm install -g netlify-cli   (one-time)
#   netlify login                (one-time)
#   netlify link                 (run once in this project directory)
#
# Usage:
#   chmod +x set_netlify_env.sh
#   ./set_netlify_env.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${YELLOW}🌿 DJ Flowerz — Netlify Environment Variable Sync${NC}"
echo "────────────────────────────────────────────────"

# Verify Netlify CLI is available
if ! command -v netlify &> /dev/null; then
  echo -e "${RED}✗ netlify CLI not found. Run: npm install -g netlify-cli${NC}"
  exit 1
fi

# Helper: set a single env var (production + preview contexts)
set_var() {
  local key="$1"
  local value="$2"
  # Skip empty values
  if [[ -z "$value" ]]; then
    echo -e "  ${YELLOW}⚠ Skipping empty: $key${NC}"
    return
  fi
  netlify env:set "$key" "$value" --context production,deploy-preview,branch-deploy \
    2>/dev/null && echo -e "  ${GREEN}✓${NC} $key" \
    || echo -e "  ${RED}✗ Failed: $key${NC}"
}

echo ""
echo "📦 Build"
set_var "NPM_CONFIG_LEGACY_PEER_DEPS" "true"

echo ""
echo "🌐 App URLs"
set_var "VITE_APP_URL" "https://djflowerz.co.ke"
set_var "VITE_SITE_URL" "https://djflowerz.co.ke"

echo ""
echo "🗄  Supabase"
set_var "VITE_SUPABASE_URL" "https://yevqnoynsqidtplxggzs.supabase.co"
set_var "VITE_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnFub3luc3FpZHRwbHhnZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjQ3ODAsImV4cCI6MjA4NzY0MDc4MH0.cb_79oC-RKNkhJBshhGw_tcFIVG50Wg6K0HIIK2Uyms"
set_var "SUPABASE_DB_URL" "postgresql://postgres.yevqnoynsqidtplxggzs:%40Ravin303%23Wanjo@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
set_var "SUPABASE_PUBLISHABLE_KEY" "sb_publishable_1Wo3mGpyqser-Wg_hjd03g_KOaPbb-I"
set_var "SUPABASE_SECRET_KEY" "sb_secret_1Yfo54i-FpiyKUI3XY4B6w_Di7b8ABM"
set_var "SUPABASE_WEBHOOK_SECRET" "djflowerz-sync-2025"

echo ""
echo "☁️  Cloudflare Worker"
set_var "VITE_STORAGE_WORKER_URL" "https://djflowerz-worker.ianmuriithiflowerz.workers.dev"

echo ""
echo "👑 Admin"
set_var "VITE_ADMIN_EMAIL" "ianmuriithiflowerz@gmail.com"
set_var "REACT_APP_ADMIN_EMAIL" "ianmuriithiflowerz@gmail.com"

echo ""
echo "💳 Paystack"
set_var "VITE_PAYSTACK_PUBLIC_KEY" "pk_live_2ed6a5c46ebab203998efd1f5d9c22d2dcc05f71"
set_var "VITE_PAYSTACK_SECRET_KEY" "sk_live_ec66162f517e07fb5e2322ec5e5281e2fe3ab74b"
set_var "PAYSTACK_SECRET_KEY" "sk_live_ec66162f517e07fb5e2322ec5e5281e2fe3ab74b"
set_var "REACT_APP_PAYSTACK_PUBLIC_KEY" "pk_live_2ed6a5c46ebab203998efd1f5d9c22d2dcc05f71"
set_var "REACT_APP_PAYSTACK_SECRET_KEY" "sk_live_ec66162f517e07fb5e2322ec5e5281e2fe3ab74b"

echo ""
echo "🔗 Paystack Plan Links"
set_var "VITE_PLAN_1_WEEK" "https://paystack.shop/pay/7u8-7dn081"
set_var "VITE_PLAN_1_MONTH" "https://paystack.shop/pay/u0qw529xyk"
set_var "VITE_PLAN_3_MONTHS" "https://paystack.shop/pay/ayljjgzxzp"
set_var "VITE_PLAN_6_MONTHS" "https://paystack.shop/pay/5p4gjiehpv"
set_var "VITE_PLAN_12_MONTHS" "https://paystack.shop/pay/po2leez4hy"
set_var "REACT_APP_PLAN_1_WEEK" "https://paystack.shop/pay/7u8-7dn081"
set_var "REACT_APP_PLAN_1_MONTH" "https://paystack.shop/pay/u0qw529xyk"
set_var "REACT_APP_PLAN_3_MONTHS" "https://paystack.shop/pay/ayljjgzxzp"
set_var "REACT_APP_PLAN_6_MONTHS" "https://paystack.shop/pay/5p4gjiehpv"
set_var "REACT_APP_PLAN_12_MONTHS" "https://paystack.shop/pay/po2leez4hy"

echo ""
echo "🔥 Firebase"
set_var "VITE_FIREBASE_API_KEY" "AIzaSyCJ-yumwuCfGwxgjRhyCUIIc50_tcmEwb4"
set_var "VITE_FIREBASE_AUTH_DOMAIN" "flowpay-401a4.firebaseapp.com"
set_var "VITE_FIREBASE_PROJECT_ID" "flowpay-401a4"
set_var "VITE_FIREBASE_STORAGE_BUCKET" "flowpay-401a4.firebasestorage.app"
set_var "VITE_FIREBASE_MESSAGING_SENDER_ID" "990425156188"
set_var "VITE_FIREBASE_APP_ID" "1:990425156188:web:0b95648801bdd2a7d3f499"
set_var "VITE_FIREBASE_DATABASE_URL" "https://flowpay-401a4-default-rtdb.firebaseio.com"
set_var "REACT_APP_FIREBASE_API_KEY" "AIzaSyCJ-yumwuCfGwxgjRhyCUIIc50_tcmEwb4"
set_var "REACT_APP_FIREBASE_AUTH_DOMAIN" "flowpay-401a4.firebaseapp.com"
set_var "REACT_APP_FIREBASE_PROJECT_ID" "flowpay-401a4"
set_var "REACT_APP_FIREBASE_STORAGE_BUCKET" "flowpay-401a4.firebasestorage.app"
set_var "REACT_APP_FIREBASE_MESSAGING_SENDER_ID" "990425156188"
set_var "REACT_APP_FIREBASE_APP_ID" "1:990425156188:web:0b95648801bdd2a7d3f499"
set_var "REACT_APP_FIREBASE_DATABASE_URL" "https://flowpay-401a4-default-rtdb.firebaseio.com"

echo ""
echo "🪣 Cloudflare R2"
set_var "VITE_R2_URL" "https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev"
set_var "R2_ACCOUNT_ID" "ca961f0eb41ca2bf77291b1769ca1c1d"
set_var "R2_ACCESS_KEY_ID" "4edededb28b4666323bf7a763ab391d1"
set_var "R2_SECRET_ACCESS_KEY" "5d2ce9467a45d362df943ea8e0c5afd0857c2be36524c97d4026f1bd570f3a22"
set_var "R2_BUCKET_NAME" "djflowerz-images"

echo ""
echo "📧 Email"
set_var "EMAIL_ADMIN" "admin@djflowerz.co.ke"
set_var "EMAIL_BOOKINGS" "bookings@djflowerz.co.ke"
set_var "EMAIL_NOREPLY" "noreply@djflowerz.co.ke"
set_var "EMAIL_PROMO" "promo@djflowerz.co.ke"
set_var "EMAIL_RECEIPTS" "receipts@djflowerz.co.ke"
set_var "GMAIL_USER" "djflowerz254@gmail.com"
set_var "GMAIL_APP_PASSWORD" "xnqinwdsbbfjpick"
set_var "BREVO_API_KEY" "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"
set_var "BREVO_SENDER_EMAIL" "djflowerz254@gmail.com"
set_var "BREVO_SENDER_NAME" "DJ Flowerz"

echo ""
echo "🔑 Google Auth"
set_var "VITE_GOOGLE_CLIENT_ID" "257698441008-6b97m97u8if55l1fc4ojjavcuakq50ki.apps.googleusercontent.com"

echo ""
echo "📬 MailerLite"
set_var "VITE_MAILERLITE_API_KEY" "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiYWUyZDUwOTU2NWM5YmJjMmEyYmRjOTEzZjRiMTNlMmMzOGVjYTUzYzg1ODBjOTBmNDQ2YmM1Y2Q2NjkzN2I3Yzg0NTI4N2NiZGEyM2Q3YzkiLCJpYXQiOjE3NzEyODg5NzMuMDY5MDg0LCJuYmYiOjE3NzEyODg5NzMuMDY5MDg3LCJleHAiOjQ5MjY5NjI1NzMuMDYxNjg2LCJzdWIiOiIyMTM4MDIzIiwic2NvcGVzIjpbXX0.rft9x8tAkmdhb82enQEiuscvQ21sVc-APQEqphZ59QIHkcGsOzbVXD4llEDD5tF6YbdA7nS6fzt0AcrvNGC-giImL7qGpnLqbvIBAVBLl_CyU2Ywdisp0gRObd5EvV166cc0dWu2e_79ixTFg0aRaau_re450cogL3x9WFeU01tcBgLXyRNpO3S6y0QsDWybgQYU3QvOaMebvqGHoT8I8ZgqQLBrQPVpihSl2va2W2ZFBQf0AEOa4OsXnG44MAqPkmGtzmf08Uqx5TX1FJoOHoxVxlLYyWq8QDhOzNFXHBo2I0HjJ4jkH_C4jyukkNg7dNCOcEpPC6uMFvAKoxh9PIltHkOMezniE173EMlAO_obCVKyxfMg5loEOF9MuZl_wxGTSHc1qxVQtcdc2QVXfz6TIiPK3ATHl-QNQxN8CbBmpscYNqv3AuSRFlZ7r3jQUHv9ERpk1y0w2V3DGgqXGm6q12zGd9E91-zabtHhbzY5AtC6a1hzCW2W3VzYGCzCNmkh9cV3G9Aqb_JrM5aV48qMO9un4HzTPGQBIcClsElyNmnvOXtVFlw2gvrmYj6EaH3x0gNYH7mNNG5P2LPPX4m2gFFDM0f4xvLmI3E2ashWk5AIY0n1JhbTwoqnEkypIWyHu6UNx0f_YxwBRUV2MTkW9LT0TITITl8_DJTdN-g"

echo ""
echo "📡 RapidAPI"
set_var "REACT_APP_RAPIDAPI_HOST" "hearthis-at.p.rapidapi.com"
set_var "REACT_APP_RAPIDAPI_KEY" "e02419edd9msh3b5138aeff67f8cp1e85e3jsne6054522ba4f"

echo ""
echo "🗃  Neon / Postgres"
set_var "DATABASE_URL" "postgresql://neondb_owner:npg_qWfRemiUG21C@ep-round-glitter-ahq8mcsy-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
set_var "DATABASE_URL_UNPOOLED" "postgresql://neondb_owner:npg_qWfRemiUG21C@ep-round-glitter-ahq8mcsy.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
set_var "PGDATABASE" "neondb"
set_var "PGHOST" "ep-round-glitter-ahq8mcsy-pooler.c-3.us-east-1.aws.neon.tech"
set_var "PGHOST_UNPOOLED" "ep-round-glitter-ahq8mcsy.c-3.us-east-1.aws.neon.tech"
set_var "PGPASSWORD" "npg_qWfRemiUG21C"
set_var "PGUSER" "neondb_owner"
set_var "POSTGRES_DATABASE" "neondb"
set_var "POSTGRES_HOST" "ep-round-glitter-ahq8mcsy-pooler.c-3.us-east-1.aws.neon.tech"
set_var "POSTGRES_PASSWORD" "npg_qWfRemiUG21C"
set_var "POSTGRES_PRISMA_URL" "postgresql://neondb_owner:npg_qWfRemiUG21C@ep-round-glitter-ahq8mcsy-pooler.c-3.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require"
set_var "POSTGRES_URL" "postgresql://neondb_owner:npg_qWfRemiUG21C@ep-round-glitter-ahq8mcsy-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
set_var "POSTGRES_URL_NON_POOLING" "postgresql://neondb_owner:npg_qWfRemiUG21C@ep-round-glitter-ahq8mcsy.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
set_var "POSTGRES_URL_NO_SSL" "postgresql://neondb_owner:npg_qWfRemiUG21C@ep-round-glitter-ahq8mcsy-pooler.c-3.us-east-1.aws.neon.tech/neondb"
set_var "POSTGRES_USER" "neondb_owner"
set_var "NEON_AUTH_BASE_URL" "https://ep-round-glitter-ahq8mcsy.neonauth.c-3.us-east-1.aws.neon.tech/neondb/auth"
set_var "NEON_PROJECT_ID" "spring-glitter-42595081"

echo ""
echo "🔵 Turso (LibSQL)"
set_var "VITE_TURSO_DATABASE_URL" "https://dj-flowerz-djflowerz.aws-ap-northeast-1.turso.io"
set_var "VITE_TURSO_AUTH_TOKEN" "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzE5NjU2MTYsImlkIjoiMDE5YzkxNWYtOWQwMS03YmZlLThiODQtOTJiNzIyYjE5MzFkIiwicmlkIjoiMTgyYzk1ZTEtZmMxOC00YTU0LTkzZTAtZGNjMjJiZjFiZDk5In0.PLtmJqsYM1q8CVEg45a8tNIq86GtQTles_OyjHjSj12sVZKZqR6LeyED17pr-BZtTjN-AWHQDmmAXeLAuuKjCw"

echo ""
echo "📝 Appwrite"
set_var "APPWRITE_API_KEY" "standard_c768a42f1b52e6ad8e769acc843f118854019c97a9c51b8c9f16d5f9107b6032f3297378d69b1b697359e7c1eb11a500d3da2a30ad99643581ec636ad152d11046d2dfb568b10658c9721c969fcd5a40d1027ada7ef826286ece9d1e7ced80276481d202c4cebedca79251a1478bcdf5c21b58a0e1097883d7263499d8354529"
set_var "NEXT_PUBLIC_APPWRITE_ENDPOINT" "https://sfo.cloud.appwrite.io/v1"
set_var "NEXT_PUBLIC_APPWRITE_PROJECT" "697995280027c862787c"

echo ""
echo "🐙 GitHub"
set_var "GITHUB_TOKEN" "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"

echo ""
echo "⏰ Cron Secret"
set_var "CRON_SECRET" "djflowerz-cron-2025"

echo ""
echo "────────────────────────────────────────────────"
echo -e "${GREEN}✅ All environment variables pushed to Netlify!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run:  netlify deploy --prod   (to deploy to production)"
echo "  2. Visit: https://app.netlify.com → Site → Environment Variables"
echo "     to verify all vars are present."
echo "  3. Set FIREBASE_SERVICE_ACCOUNT manually in the dashboard"
echo "     (multiline JSON cannot be set via CLI — see instructions below)"
echo ""
echo -e "${YELLOW}⚠  FIREBASE_SERVICE_ACCOUNT must be set manually.${NC}"
echo "   Go to: Netlify → Site → Environment Variables → Add variable"
echo "   Key:   FIREBASE_SERVICE_ACCOUNT"
echo "   Value: (paste the full JSON from .env.netlify or .env.vercel.prod)"
