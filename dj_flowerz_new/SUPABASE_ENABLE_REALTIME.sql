-- Enable Realtime for all tables used in the Admin Dashboard and DataContext
-- Run this in the Supabase SQL Editor

DO $$
DECLARE
    t text;
    tables_to_enable text[] := ARRAY[
        'payments', 
        'tips', 
        'orders', 
        'profiles', 
        'subscriptions', 
        'bookings', 
        'session_types', 
        'studio_equipment', 
        'studio_rooms', 
        'maintenance_logs',
        'newsletter_subscribers', 
        'newsletter_campaigns', 
        'newsletter_segments', 
        'coupons', 
        'referral_stats', 
        'telegram_channels', 
        'contact_messages', 
        'mixtapes', 
        'products',
        'genres',
        'youtube_videos',
        'shipping_zones',
        'settings',
        'referral_logs',
        'telegram_config',
        'telegram_mappings',
        'telegram_users',
        'telegram_logs',
        'pool_tracks'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_enable LOOP
        -- Enable Realtime for each table if it exists and not already enabled
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = t) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
            END IF;
        END IF;
    END LOOP;
END $$;
