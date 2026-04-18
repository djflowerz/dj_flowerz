#!/bin/bash

# DJ Flowerz Production Deployment Script
# This script handles D1 migrations and Cloudflare Worker deployment.

set -e

echo "🚀 Starting Production Deployment..."

# 1. Run D1 Migrations
echo "📦 Applying D1 Migrations to 'djflowerz-db'..."
npx wrangler d1 execute djflowerz-db --remote --file=migrations.sql

# 2. Deploy Cloudflare Worker
echo "⚡ Deploying Cloudflare Worker..."
npx wrangler deploy

# 3. Synchronize with Git (Trigger Netlify)
echo "🌍 Pushing changes to GitHub (Triggers Netlify Build)..."
git push origin main

echo "✅ Deployment Successful! Check https://www.djflowerz.co.ke/community in a few minutes."
