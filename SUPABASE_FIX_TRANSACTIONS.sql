-- Add missing columns to orders if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'type') THEN
        ALTER TABLE public.orders ADD COLUMN type text DEFAULT 'Store';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'metadata') THEN
        ALTER TABLE public.orders ADD COLUMN metadata jsonb DEFAULT '{}';
    END IF;
END $$;

-- Fix id in orders to be primary key and have default if needed
-- (Assume orders table already exists with id)

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
    id text DEFAULT gen_random_uuid()::text PRIMARY KEY,
    user_id text,
    user_email text,
    amount numeric,
    currency text DEFAULT 'KES',
    status text DEFAULT 'success',
    payment_ref text,
    payment_type text, -- 'tip', 'subscription', 'booking', 'store'
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Admins can manage payments" ON payments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Create tips table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tips (
    id text DEFAULT gen_random_uuid()::text PRIMARY KEY,
    user_id text,
    email text,
    amount numeric,
    message text,
    status text DEFAULT 'completed',
    created_at timestamptz DEFAULT now()
);

-- RLS for tips
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage tips" ON tips;
CREATE POLICY "Admins can manage tips" ON tips FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);
