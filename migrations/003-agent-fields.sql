ALTER TABLE tasks ADD COLUMN model_used TEXT;
ALTER TABLE tasks ADD COLUMN tokens_in INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN tokens_out INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN progress INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN blocked_reason TEXT;

ALTER TABLE activity_log ADD COLUMN model_used TEXT;

CREATE TABLE IF NOT EXISTS agent_heartbeats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_label TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'idle',
    current_task_id INTEGER,
    model_used TEXT,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(current_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
