import os

# We will revert api.djflowerz.co.ke back to djflowerz-worker.ianmuriithiflowerz.workers.dev
# ONLY in non-frontend files, or places where it acts as a proxy destination.

files_to_revert = [
    'vercel.json',
    'worker/index.js',
    'worker/api/storefront/pool.js',
    'api/og-proxy.js',
    'scripts/repair_user_subscription.js',
    'scripts/add_oraimo_product.js',
    'verify_product_d1_https.cjs',
    'verify_product_d1.cjs',
    'test-get-d1.js',
    'test-d1.js',
    'utils/cloudflare.ts', 
]

files_to_point_to_apex = [
    'components/Navbar.tsx',
    'components/LiveEventStreamer.tsx',
    'components/ui/floating-chat-widget-shadcnui.tsx',
    'components/admin/AdminLiveChatTab.tsx',
    'components/admin/AnalyticsTab.tsx',
    'pages/MusicPool.tsx',
    'pages/EscrowManager.tsx',
    'pages/Community.tsx',
    'pages/Notifications.tsx',
    'pages/PublicProfile.tsx',
]

for f in files_to_revert:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            content = content.replace('api.djflowerz.co.ke', 'djflowerz-worker.ianmuriithiflowerz.workers.dev')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Reverted {f} to workers.dev")

for f in files_to_point_to_apex:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            # If it's hardcoded with https://
            content = content.replace('https://api.djflowerz.co.ke', 'https://djflowerz.co.ke')
            # If just api.djflowerz.co.ke
            content = content.replace('api.djflowerz.co.ke', 'djflowerz.co.ke')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Pointed {f} to apex djflowerz.co.ke")

