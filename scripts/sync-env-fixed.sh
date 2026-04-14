#!/bin/bash

# Source NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Ensure npx and vercel are available
if ! command -v npx &> /dev/null; then
    echo "NPX not found, trying to install/load"
    nvm use default || nvm use node || echo "NVM use failed"
fi

# Define variables specifically mentioned in .env.dj-flowerz
vars=(
  "VITE_PLAN_12_MONTHS=https://paystack.shop/pay/po2leez4hy"
  "VITE_PLAN_6_MONTHS=https://paystack.shop/pay/5p4gjiehpv"
  "VITE_PLAN_3_MONTHS=https://paystack.shop/pay/ayljjgzxzp"
  "VITE_PLAN_1_MONTH=https://paystack.shop/pay/u0qw529xyk"
  "VITE_PLAN_1_WEEK=https://paystack.shop/pay/7u8-7dn081"
  "VITE_APP_URL=https://www.djflowerz.co.ke"
)

for item in "${vars[@]}"; do
  key=$(echo $item | cut -d'=' -f1)
  value=$(echo $item | cut -d'=' -f2-)
  echo "Adding $key..."
  echo -n "$value" | npx vercel env add "$key" production --force
  echo -n "$value" | npx vercel env add "$key" preview --force
  echo -n "$value" | npx vercel env add "$key" development --force
done
