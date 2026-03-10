-- 1. Create the new tracks and versions tables for Cloudflare D1
-- Note: Cloudflare D1 uses SQLite, so we adapt the syntax accordingly.

-- Main Tracks Table (Metadata)
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  display_genre TEXT,
  collection_hub TEXT,
  sub_genre TEXT,
  vibe TEXT,
  bpm INTEGER DEFAULT 0,
  release_year INTEGER,
  release_month TEXT,
  is_featured BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual Version Table (Files)
CREATE TABLE IF NOT EXISTS track_versions (
  id TEXT PRIMARY KEY,
  track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL, -- 'Original', 'Extended', 'Acapella', 'Instrumental' etc.
  preview_url TEXT,
  download_url TEXT NOT NULL,
  file_size TEXT,
  is_main_version BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Data Migration Logic
-- We need to move data from the old pool_tracks (if it exists) or tracks (if already using that name)
-- to this new structure.

-- IF OLD TABLE EXISTS, we migrate (Helper logic below)
-- INSERT INTO tracks (id, title, artist, display_genre, collection_hub, vibe, bpm, release_year, date_added)
-- SELECT id, title, artist, display_genre, collection_hub, vibe, bpm, release_year, date_added FROM pool_tracks;

-- INSERT INTO track_versions (id, track_id, version_name, preview_url, download_url, is_main_version)
-- SELECT 'VER-' || id, id, 'Original', preview_url, download_url, 1 FROM pool_tracks;
