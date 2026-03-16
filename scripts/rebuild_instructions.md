# DJ Flowerz — Clean Backend Rebuild

## Step 1: Wipe Old Backend

Run these in your terminal from the `dj_flowerz` directory:

```bash
# Delete old D1 database (permanent - no undo)
npx wrangler d1 delete djflowerz-db

# Delete the deployed worker
npx wrangler delete

# Clear local wrangler cache
rm -rf .wrangler
```

## Step 2: Create Fresh Database

```bash
# Create new D1 database (keep the same name so wrangler.toml stays valid)
npx wrangler d1 create djflowerz-db
```

**Copy the `database_id` from the output** and update `wrangler.toml` line 14:
```
database_id = "YOUR_NEW_ID_HERE"
```

## Step 3: Apply the Clean Schema

```bash
npx wrangler d1 execute djflowerz-db --file=./scripts/schema_clean.sql --remote
```

## Step 4: Deploy the Updated Worker

```bash
npx wrangler deploy
```

## Step 5: Set Up TailAdmin (New Admin UI)

```bash
# Clone TailAdmin into a sibling folder
cd ..
git clone https://github.com/TailAdmin/free-react-tailwind-admin-dashboard.git dj_flowerz_admin
cd dj_flowerz_admin
npm install
npm run dev
```

The admin will connect to the same `STORAGE_WORKER_URL` endpoints as before.

## Result: Clean Table Structure

| Table | Replaces |
|-------|---------|
| `profiles` | profiles, users, user_profiles, subscribers |
| `products` | products, products_new, product_variants, product_types |
| `orders` | orders, orders_old, orders_new |
| `order_items` | order_line_items |
| `pool_tracks` | pool_tracks, tracks, track_versions, music |
| `mixtapes` | mixtapes, mixtape_comments |
| `interactions` | reviews, mixtape_comments, support_tickets |
| `settings` | settings, store_settings |
| `subscriptions` | subscriptions |
| `subscription_plans` | subscription_plans |
| `studio_sessions` | studio_sessions |
| `event_gigs` | event_gigs |
| `newsletter_subscribers` | newsletter_subscribers, subscribers |
| `newsletter_campaigns` | newsletter_campaigns |
| `genres` | genres |
| `download_history` | download_history |
