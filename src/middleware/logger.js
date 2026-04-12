/**
 * Activity Logger Middleware
 * Logs user/agent actions to the activity_log table
 */

/**
 * Log an activity event to the database
 * @param {Database} db - Database instance
 * @param {string} actor - Actor name (username or agent label)
 * @param {string} actorType - 'human' or 'agent'
 * @param {string} action - Action performed
 * @param {string} entityType - 'project', 'task', etc.
 * @param {number} entityId - ID of affected entity
 * @param {string} details - JSON string with additional details
 */
function logActivity(db, actor, actorType, action, entityType, entityId, details) {
    try {
        const stmt = db.prepare(`
            INSERT INTO activity_log (actor, actor_type, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            actor,
            actorType,
            action,
            entityType,
            entityId,
            JSON.stringify(details || {})
        );
        
        console.log(`[ACTIVITY] ${actorType}:${actor} ${action} ${entityType}:${entityId}`);
    } catch (err) {
        console.error('[ACTIVITY] Log error:', err);
    }
}

module.exports = { logActivity };
