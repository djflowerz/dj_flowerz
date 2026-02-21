-- ==========================================
-- MUSIC POOL RECLASSIFICATION SCRIPT
-- ==========================================

-- 1. Fix Genre Naming Schema Mismatches
-- Align DB genres with folder names and intended UI categories
UPDATE pool_tracks SET genre = 'Kenya Love Songs (Hype)' WHERE genre ILIKE '%Kenyan Love Songs Hype%';
UPDATE pool_tracks SET genre = 'Kenya Love Songs (Low Hype)' WHERE genre ILIKE '%Kenyan Love Songs (Low Hype)%';
UPDATE pool_tracks SET genre = 'Kikuyu Gospel (Kigoco)' WHERE genre ILIKE '%Kikuyu Gospel (Kigocco)%';
UPDATE pool_tracks SET genre = 'East Africa TBT (Hype)' WHERE genre ILIKE '%Bongo Flava (TBT) Hype%';
UPDATE pool_tracks SET genre = 'East Africa TBT (Low Hype)' WHERE genre ILIKE '%Bongo TBT Low Hype%';

-- 2. Move 'New Uploads' and 'Remix & Mashups' to their specific Genres based on Keywords
-- Target: Bongo TZ (Hype)
UPDATE pool_tracks 
SET genre = 'Bongo TZ Hype' 
WHERE (genre = 'New Uploads' OR genre = 'Remix & Mashups Hub' OR genre IS NULL)
AND (
    artist ILIKE '%Diamond Platnumz%' OR artist ILIKE '%Rayvanny%' OR artist ILIKE '%Harmonize%' OR 
    artist ILIKE '%Zuchu%' OR artist ILIKE '%Mbosso%' OR artist ILIKE '%Alikiba%' OR 
    artist ILIKE '%Marioo %' OR artist ILIKE '%Nandy%' OR artist ILIKE '%Jux%' OR 
    artist ILIKE '%Darassa%' OR artist ILIKE '%Phina%' OR artist ILIKE '%Haitham Kim%' OR
    title ILIKE '%Bongo%'
);

-- Target: Bongo Flava (TBT) (TZ) Hype
UPDATE pool_tracks 
SET genre = 'Bongo Flava (TBT) (TZ) Hype' 
WHERE (genre = 'New Uploads' OR genre = 'Remix & Mashups Hub' OR genre IS NULL)
AND (
    artist ILIKE '%Professor Jay%' OR artist ILIKE '%Mr Nice%' OR artist ILIKE '%Dully Sykes%' OR 
    artist ILIKE '%Lady Jaydee%' OR artist ILIKE '%TID %' OR artist ILIKE '%Saida Karoli%' OR 
    artist ILIKE '%Marlaw%' OR artist ILIKE '%MB Dog%' OR artist ILIKE '%Zanto%' OR
    title ILIKE '%TBT%' OR title ILIKE '%Oldies%'
);

-- Target: Amapiano
UPDATE pool_tracks 
SET genre = 'Amapiano' 
WHERE (genre = 'New Uploads' OR genre = 'Remix & Mashups Hub' OR genre IS NULL)
AND (
    artist ILIKE '%Kabza De Small%' OR artist ILIKE '%DJ Maphorisa%' OR artist ILIKE '%Focalistic%' OR 
    artist ILIKE '%Musa Keys%' OR artist ILIKE '%Young Stunna%' OR artist ILIKE '%Daliwonga%' OR 
    artist ILIKE '%Tyler ICU%' OR artist ILIKE '%Uncle Waffles%' OR title ILIKE '%Amapiano%'
);

-- Target: Urban Pop (Kenya)
UPDATE pool_tracks 
SET genre = 'Urban Pop' 
WHERE (genre = 'New Uploads' OR genre = 'Remix & Mashups Hub' OR genre IS NULL)
AND (
    artist ILIKE '%Sauti Sol%' OR artist ILIKE '%Nyashinski%' OR artist ILIKE '%Khaligraph Jones%' OR 
    artist ILIKE '%Nadia Mukami%' OR artist ILIKE '%Otile Brown%' OR artist ILIKE '%Mejja%' OR 
    artist ILIKE '%Willy Paul%' OR artist ILIKE '%Bahati%' OR artist ILIKE '%King Kaka%'
);

-- Target: Dancehall (Hype)
UPDATE pool_tracks 
SET genre = 'Dancehall (Hype)' 
WHERE (genre = 'New Uploads' OR genre = 'Remix & Mashups Hub' OR genre IS NULL)
AND (
    artist ILIKE '%Vybz Kartel%' OR artist ILIKE '%Popcaan%' OR artist ILIKE '%Skillibeng%' OR 
    artist ILIKE '%Shenseea%' OR artist ILIKE '%Masicka%' OR artist ILIKE '%Spice%' OR
    title ILIKE '%Dancehall%' OR title ILIKE '%Refix%' OR title ILIKE '%Redrum%'
);

-- 3. Cleanup: Remove tracks from 'New Uploads' if they have a more specific category in their array
-- (Optional, based on how the UI handles multiple categories)

-- 4. Mark all year-based edits if year is known
UPDATE pool_tracks SET genre = '2024 VIDEO POOL EDITS' WHERE year = 2024 AND (genre IS NULL OR genre = 'New Uploads');
UPDATE pool_tracks SET genre = '2025 VIDEO POOL EDITS' WHERE year = 2025 AND (genre IS NULL OR genre = 'New Uploads');
UPDATE pool_tracks SET genre = '2023 VIDEO POOL EDITS' WHERE year = 2023 AND (genre IS NULL OR genre = 'New Uploads');

-- 5. Ensure the genres exist in the genres table
INSERT INTO genres (id, name)
VALUES 
    ('kenya-love-songs-hype', 'Kenya Love Songs (Hype)'),
    ('kenya-love-songs-low-hype', 'Kenya Love Songs (Low Hype)'),
    ('kikuyu-gospel-kigoco', 'Kikuyu Gospel (Kigoco)'),
    ('bongo-tz-hype', 'Bongo TZ Hype'),
    ('bongo-flava-tbt-tz-hype', 'Bongo Flava (TBT) (TZ) Hype'),
    ('east-africa-tbt-hype', 'East Africa TBT (Hype)'),
    ('east-africa-tbt-low-hype', 'East Africa TBT (Low Hype)')
ON CONFLICT (id) DO NOTHING;
