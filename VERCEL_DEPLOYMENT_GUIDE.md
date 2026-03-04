
# Vercel Deployment Guide for DJ Flowerz

This guide covers how to transition your site from Cloudflare Pages to **Vercel** and ensure that **Paystack payments** are correctly tracked in your Admin Portal.

## 1. Webhook Configuration (Crucial for Admin Payments)

The reason your Admin Portal wasn't receiving payment details is likely due to the Webhook URL being pointed to the old site or security rules blocking the update.

**Update your Paystack Dashboard:**
1. Go to [Paystack Settings > Developer](https://dashboard.paystack.com/#/settings/developer)
2. **Live Webhook URL**: `https://www.djflowerz.co.ke/api/paystack/webhook`
3. **Live Callback URL**: `https://www.djflowerz.co.ke/#/success`
4. Click **Save Changes**.

## 2. Vercel Environment Variables

You must add these environment variables in your Vercel Project Settings (`Settings > Environment Variables`):

| Variable Name | Value | Purpose |
|---------------|-------|---------|
| `PAYSTACK_SECRET_KEY` | `YOUR_SECRET_KEY` | Your Paystack Live Secret Key |
| `REACT_APP_PAYSTACK_PUBLIC_KEY` | `YOUR_PUBLIC_KEY` | For frontend payments |
| `FIREBASE_SERVICE_ACCOUNT` | `{"type": "service_account", ...}` | **Critical!** (See below) |
| `VITE_FIREBASE_API_KEY` | `YOUR_API_KEY` | Your Firebase Web API Key |
| `VITE_FIREBASE_PROJECT_ID` | `YOUR_PROJECT_ID` | Your Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `YOUR_STORAGE_BUCKET` | For track downloads |

| VITE_SUPABASE_URL | `https://your-project.supabase.co` | Supabase API URL |
| VITE_SUPABASE_ANON_KEY | `YOUR_ANON_KEY` | For frontend database access |
| SUPABASE_SERVICE_ROLE_KEY | `YOUR_SERVICE_ROLE_KEY` | For backend (webhook) updates |
| SUPABASE_DB_URL | `postgresql://...` | For direct database access |

### How to get the `FIREBASE_SERVICE_ACCOUNT` JSON:
To allow the Vercel backend to update your admin dashboard safely (if still using Firestore for some parts):
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. **Project Settings** > **Service Accounts**
3. Click **Generate new private key**
4. Copy the *entire* content of the downloaded `.json` file.
5. Paste it as the value for the `FIREBASE_SERVICE_ACCOUNT` variable in Vercel.

## 3. Deployment Steps

1. Connect your GitHub repository to Vercel.
2. Select **Vite** as the framework.
3. Use the default build settings (`npm run build`).
4. Ensure the `api/` directory is present in your repository root.

## 4. Why this fixes the Admin Portal issue
The new `api/paystack/webhook.ts` now uses the **Supabase client** with the Service Role key. This bypasses RLS and directly updates the `orders`, `profiles`, `subscriptions`, `payments`, and `tips` tables in Supabase.

When a user pays, Paystack notifies this webhook, which then creates the record that appears in your Admin Dashboard instantly.

---

**Current Configuration Summary:**
- **Vercel API Routes**: Updated to use Supabase for persistent tracking.
- **Supabase Migration**: Initial tables and buckets created.
- **Paystack Keys**: Configured in Vercel environment variables.
- **Admin Access**: ianmuriithiflowerz@gmail.com
