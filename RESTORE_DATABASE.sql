-- ==========================================
-- RESTORE DATABASE TO PREVIOUS WORKING STATE
-- ==========================================

-- 1. Remove the speaker products that were partially imported
DELETE FROM public.products 
WHERE slug IN (
    'hp-dhs-2101-speakers',
    'havit-waterproof-portable-outdoor-wireless-speaker',
    'havit-strong-bass-wireless-speaker',
    'hp-dhe-6004s-colorful-light-horn-audio-speaker',
    'hp-dhs-2111-speaker-desktop-wired-mini-multimedia-usb-speaker',
    'hp-dhe-6002s-gaming-gear-led-rgb-multimedia-speaker',
    'hp-dhe-6002s-speakers',
    'havit-sk885bt-colourful-rgb-light-speaker',
    'golden-field-m102-desktop-multimedia-2-0',
    'hp-dhe-6004s-colorful-light-horn-audio-speaker-v2',
    'havit-sk800bt-wireless-portable-speaker'
) OR category = 'Speakers';

-- 2. Drop the custom RLS policies added today that might be causing authentication delays or recursion
DROP POLICY IF EXISTS "Profiles updateable by admin" ON profiles;

-- 3. Ensure the core profiles policies are intact
-- If "every account cant access", we want to make sure profiles are readable.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
    END IF;
END $$;

-- 4. Clean up any other temporary policies
DROP POLICY IF EXISTS "Admin manages subscriptions" ON subscriptions;

-- 5. Force refresh of the profiles table (optional, but good for clearing locks if any)
ANALYZE profiles;
ANALYZE products;

-- ==========================================
-- RESTORATION COMPLETE
-- ==========================================
