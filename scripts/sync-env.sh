#!/bin/bash

# Define variables to add
vars=(
  "VITE_FIREBASE_API_KEY=YOUR_API_KEY"
  "VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN"
  "VITE_FIREBASE_DATABASE_URL=YOUR_DATABASE_URL"
  "VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID"
  "VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET"
  "VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID"
  "VITE_FIREBASE_APP_ID=YOUR_APP_ID"
  "VITE_PAYSTACK_PUBLIC_KEY=YOUR_PUBLIC_KEY"
  "VITE_PAYSTACK_SECRET_KEY=YOUR_SECRET_KEY"
  "VITE_ADMIN_EMAIL=YOUR_ADMIN_EMAIL"
  "VITE_PLAN_12_MONTHS=YOUR_PLAN_URL"
  "VITE_PLAN_6_MONTHS=YOUR_PLAN_URL"
  "VITE_PLAN_3_MONTHS=YOUR_PLAN_URL"
  "VITE_PLAN_1_MONTH=YOUR_PLAN_URL"
  "VITE_PLAN_1_WEEK=YOUR_PLAN_URL"
)

for item in "${vars[@]}"; do
  key=$(echo $item | cut -d'=' -f1)
  value=$(echo $item | cut -d'=' -f2-)
  echo "Adding $key..."
  echo -n "$value" | vercel env add "$key" production --force
  echo -n "$value" | vercel env add "$key" preview --force
  echo -n "$value" | vercel env add "$key" development --force
done
