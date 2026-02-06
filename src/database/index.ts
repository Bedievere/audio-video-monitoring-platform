import { app } from 'electron'
import Database from 'better-sqlite3'
import * as path from 'path'

const dbPath = path.join(app.getPath('userData'), 'monitoring.db')

const db: Database.Database = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS audio_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    protocol TEXT NOT NULL,
    format TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS anomaly_records (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_name TEXT,
    type TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration INTEGER,
    recording_file_path TEXT,
    details TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (source_id) REFERENCES audio_sources(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_anomaly_source_id ON anomaly_records(source_id);
  CREATE INDEX IF NOT EXISTS idx_anomaly_type ON anomaly_records(type);
  CREATE INDEX IF NOT EXISTS idx_anomaly_start_time ON anomaly_records(start_time);
`)

export default db
