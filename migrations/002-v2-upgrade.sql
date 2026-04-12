-- V2 Schema Upgrade

-- Add new columns to projects table
ALTER TABLE projects ADD COLUMN description TEXT;
ALTER TABLE projects ADD COLUMN created_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP;

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN description TEXT;
ALTER TABLE tasks ADD COLUMN status TEXT;
ALTER TABLE tasks ADD COLUMN priority TEXT;
ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
ALTER TABLE tasks ADD COLUMN due_date TEXT;
ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;

-- Set defaults for existing rows
UPDATE projects SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

UPDATE tasks SET status = 'todo' WHERE status IS NULL;
UPDATE tasks SET priority = 'medium' WHERE priority IS NULL;
UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Migrate existing completed data to new status
UPDATE tasks SET status = 'done' WHERE completed = 1;
UPDATE tasks SET status = 'todo' WHERE completed = 0;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
