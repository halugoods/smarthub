-- Smart Hub Database Schema (Cloudflare D1)

-- Branches/cabang
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  outlet TEXT DEFAULT '',
  ig_handle TEXT DEFAULT '',
  wa_number TEXT DEFAULT '',
  pin TEXT NOT NULL,
  karyawan TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now', '+7 hours'))
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT NOT NULL,
  jam TEXT NOT NULL DEFAULT '14:00',
  branch_id TEXT NOT NULL,
  link_drive TEXT NOT NULL DEFAULT '',
  caption TEXT DEFAULT '',
  deskripsi TEXT DEFAULT '',
  hashtag TEXT DEFAULT '',
  link_tiktok TEXT DEFAULT '',
  link_ig TEXT DEFAULT '',
  link_fb TEXT DEFAULT '',
  link_music_tk TEXT DEFAULT '',
  link_music_ig TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  submit_at TEXT,
  verify_at TEXT,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Index for scheduler
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_jam ON tasks(jam);
CREATE INDEX IF NOT EXISTS idx_tasks_tanggal ON tasks(tanggal);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('app_title', 'Halu Goods Smart Hub');
INSERT OR IGNORE INTO settings (key, value) VALUES ('app_subtitle', 'Dimsum Sewu - Content Management');

-- Seed branches
INSERT OR IGNORE INTO branches (id, name, outlet, ig_handle, wa_number, pin, karyawan) VALUES
('pracimantoro', 'Pracimantoro', 'SPBU Praci', '@dimsumsewu.pracimantoro', '081390466764', '190305', 'Citra'),
('pracimantoro2', 'Pracimantoro 2', 'Alfamidi Ngulurejo', '@dimsumsewu.pracimantoro2', '083804511803', '550806', 'Fajar'),
('suci', 'Suci', 'Alfamart Suci', '@dimsumsewu.suci', '085878033500', '240220', 'Dimas'),
('giriwoyo', 'Giriwoyo', 'Timur Pasar Giriwoyo', '@dimsumsewu.giriwoyo', '081226393579', '210706', 'Sari'),
('baturetno', 'Baturetno', 'Alfamart Watuagung', '@dimsumsewu.baturetno', '08985907026', '270996', 'Bowo'),
('eromoko', 'Eromoko', 'Selatan Terminal Eromoko', '@dimsumsewu.eromoko', '085156980041', '530780', 'Wawan'),
('indonesia', 'Dimsum Sewu Indonesia', 'Pusat', '@dimsumsewu.indonesia', '08976280303', '231202', 'Rosi');
