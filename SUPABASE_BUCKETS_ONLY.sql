-- ==========================================
-- STORAGE BUCKETS ONLY (Run this if buckets weren't created)
-- ==========================================

-- Bucket: 'images' (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'images', 
    'images', 
    true, 
    5242880, -- 5MB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Bucket: 'audio' (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio', 
    'audio', 
    true, 
    52428800, -- 50MB
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a']
) ON CONFLICT (id) DO NOTHING;

-- Bucket: 'downloads' (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'downloads', 
    'downloads', 
    false, 
    524288000, -- 500MB
    ARRAY['application/zip', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'application/x-zip-compressed']
) ON CONFLICT (id) DO NOTHING;
