-- Initial Base Schema for DJ Flowerz (Minimal to avoid migration conflicts)

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  last_login DATETIME,
  phone_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mixtapes
CREATE TABLE IF NOT EXISTS mixtapes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  genre TEXT,
  description TEXT,
  release_date TEXT,
  status TEXT DEFAULT 'published',
  cover_url TEXT,
  audio_url TEXT,
  duration TEXT,
  preview_start_time TEXT,
  allow_full_stream BOOLEAN DEFAULT 0,
  allow_download BOOLEAN DEFAULT 0,
  download_type TEXT,
  stream_quality TEXT,
  tracklist TEXT,
  is_featured BOOLEAN DEFAULT 0,
  show_in_gallery BOOLEAN DEFAULT 1,
  show_in_music_pool BOOLEAN DEFAULT 0,
  tags TEXT,
  enable_comments BOOLEAN DEFAULT 1,
  require_login_to_comment BOOLEAN DEFAULT 1,
  moderate_comments BOOLEAN DEFAULT 0,
  download_url TEXT,
  video_download_url TEXT,
  download_limit INTEGER,
  download_expiry_days INTEGER,
  required_tier TEXT,
  youtube_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
