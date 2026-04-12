const express = require('express');
const db = require('../db.js');
const { authenticateAgent, authenticateAny } = require('../middleware/auth.js');

const router = express.Router();

/**
 * POST /api/v1/heartbeat
 * Update agent heartbeat
 * Requires: authenticateAgent only (API key)
 * Body: { status, current_task_id?, model_used? }
 */
router.post('/heartbeat', authenticateAgent, (req, res) => {
    try {
        const { status, current_task_id, model_used } = req.body;
        const agentLabel = req.agent.label;

        // Validate status
        const validStatuses = ['idle', 'working', 'error'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Status must be one of: idle, working, error'
                }
            });
        }

        // Upsert heartbeat
        const stmt = db.prepare(`
            INSERT INTO agent_heartbeats (agent_label, status, current_task_id, model_used, last_seen_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(agent_label) DO UPDATE SET
                status = COALESCE(?, status),
                current_task_id = COALESCE(?, current_task_id),
                model_used = COALESCE(?, model_used),
                last_seen_at = CURRENT_TIMESTAMP
        `);

        stmt.run(
            agentLabel, status, current_task_id, model_used,
            status, current_task_id, model_used
        );

        // Get the updated heartbeat
        const heartbeat = db.prepare('SELECT * FROM agent_heartbeats WHERE agent_label = ?').get(agentLabel);

        res.json({
            success: true,
            data: {
                agent: heartbeat.agent_label,
                status: heartbeat.status,
                last_seen_at: heartbeat.last_seen_at
            }
        });
    } catch (err) {
        console.error('[AGENTS] Heartbeat error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update heartbeat'
            }
        });
    }
});

/**
 * GET /api/v1/agents
 * List all agents
 * Requires: authenticateAny (JWT or API key)
 */
router.get('/', authenticateAny, (req, res) => {
    try {
        const agents = db.prepare(`
            SELECT
                ah.agent_label,
                ah.status,
                ah.model_used,
                ah.current_task_id,
                t.title as current_task_title,
                ah.last_seen_at
            FROM agent_heartbeats ah
            LEFT JOIN tasks t ON ah.current_task_id = t.id
            ORDER BY ah.last_seen_at DESC
        `).all();

        res.json({
            success: true,
            data: agents
        });
    } catch (err) {
        console.error('[AGENTS] List error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to list agents'
            }
        });
    }
});

module.exports = router;
