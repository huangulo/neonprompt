const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Open database
const db = new Database(path.join(dataDir, 'dashboard.db'));

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create schema_version table if it doesn't exist
const createVersionTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
    )
`);
createVersionTable.run();

// Get current schema version
let currentVersion = db.prepare('SELECT version FROM schema_version').get();
if (!currentVersion) {
    currentVersion = 0;
} else {
    currentVersion = currentVersion.version;
}

console.log(`[DB] Current schema version: ${currentVersion}`);

// Read all migration files sorted by filename
const migrationsDir = path.join(__dirname, '../migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

console.log(`[DB] Found ${migrationFiles.length} migration files`);

// Run pending migrations
for (const file of migrationFiles) {
    // Extract version number from filename (e.g., 002-v2-upgrade.sql -> 2)
    const match = file.match(/^(\d+)-/);
    if (!match) continue;
    
    const version = parseInt(match[1], 10);
    
    // Skip if already applied
    if (version <= currentVersion) {
        console.log(`[DB] Skipping migration ${file} (version ${version} <= current ${currentVersion})`);
        continue;
    }
    
    console.log(`[DB] Applying migration: ${file} (version ${version})`);
    
    const migrationPath = path.join(migrationsDir, file);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute migration in transaction
    const transaction = db.transaction(() => {
        db.exec(migrationSQL);
        // Update schema_version
        db.prepare('REPLACE INTO schema_version (version) VALUES (?)').run(version);
    });
    
    transaction();  // Call the transaction, not run()
    console.log(`[DB] Migration ${file} applied successfully`);
    
    // Update current version for next iteration
    currentVersion = version;
}

console.log(`[DB] Schema version after migrations: ${currentVersion}`);

module.exports = db;
