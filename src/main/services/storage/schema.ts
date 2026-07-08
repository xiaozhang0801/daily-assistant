export const schemaSql = `
CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL,
  image_path TEXT NOT NULL,
  active_app TEXT,
  window_title TEXT,
  status TEXT NOT NULL,
  skip_reason TEXT
);

CREATE TABLE IF NOT EXISTS recording_sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS work_events (
  id TEXT PRIMARY KEY,
  capture_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence REAL NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  base_url TEXT,
  api_key_ref TEXT NOT NULL,
  model_name TEXT NOT NULL,
  custom_headers TEXT NOT NULL,
  enabled INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
