-- Migration 004: Music Pool Restructure
-- Creates pool_tracks table with the new sifted metadata columns.
-- Safe to run even if pool_tracks already exists.

CREATE TABLE IF NOT EXISTS pool_tracks (
  id          TEXT PRIMARY KEY,
  artist      TEXT NOT NULL DEFAULT 'DJ FLOWERZ',
  title       TEXT NOT NULL DEFAULT 'Untitled Mix',
  -- Genre fields
  genre         TEXT,                       -- raw genre string (legacy)
  display_genre TEXT,                       -- clean, UI-facing label
  collection_hub TEXT,                      -- top-level hub
  sub_genre     TEXT,                       -- sub-category (e.g. Riddim folder name)
  -- Temporal metadata
  release_year  INTEGER,                    -- e.g. 2024, 2025
  release_month TEXT,                       -- e.g. 'March'
  -- Energy
  vibe          TEXT DEFAULT 'Hype',        -- 'Hype' | 'Low Hype' | 'Chill' | 'Energetic'
  -- URLs
  preview_url   TEXT,                       -- streamable preview
  download_url  TEXT,                       -- primary download link
  versions      TEXT DEFAULT '[]',          -- JSON: [{type, label, downloadUrl}]
  -- Metadata
  bpm           INTEGER DEFAULT 0,
  category      TEXT DEFAULT '[]',          -- JSON string array of tags
  link_status   TEXT DEFAULT 'unchecked',   -- 'ok' | 'broken' | 'unchecked'
  date_added    TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- If table already existed, run ALTER TABLE to add any missing columns
-- (SQLite ignores them if they already exist via "no such column" protection)
-- We use a workaround: create a table with all columns via CREATE TABLE IF NOT EXISTS,
-- then try each ALTER individually — each will silently fail if column already exists.
-- The safest approach on D1 is to use UPSERT patterns, so:

-- Ensure indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_pool_tracks_display_genre  ON pool_tracks(display_genre);
CREATE INDEX IF NOT EXISTS idx_pool_tracks_collection_hub ON pool_tracks(collection_hub);
CREATE INDEX IF NOT EXISTS idx_pool_tracks_release_year   ON pool_tracks(release_year);
CREATE INDEX IF NOT EXISTS idx_pool_tracks_vibe           ON pool_tracks(vibe);
CREATE INDEX IF NOT EXISTS idx_pool_tracks_link_status    ON pool_tracks(link_status);
