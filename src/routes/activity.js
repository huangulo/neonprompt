const express = require('express');
const { authenticateAny } = require('../middleware/auth.js');
const db = require('../db.js');

const router = express.Router();

/**
 * GET / — return recent activity
 * Query params: ?limit=20&project_id=1&actor=ally
 * Default limit: 50
 */
router.get('/', authenticateAny, (req, res) => {
    try {
        const { limit, project_id, actor } = req.query;
        
        let query = `
            SELECT a.*, 
                   CASE 
                       WHEN a.entity_type = 'project' THEN p.name
                       WHEN a.entity_type = 'task' THEN t.title
                       ELSE NULL
                   END as entity_name
            FROM activity_log a
            LEFT JOIN projects p ON a.entity_type = 'project' AND a.entity_id = p.id
            LEFT JOIN tasks t ON a.entity_type = 'task' AND a.entity_id = t.id
            WHERE 1=1
        `;
        const params = [];
        
        // Add filters
        if (project_id) {
            query += ' AND a.entity_type = ? AND a.entity_id = ?';
            params.push('project', project_id);
        }
        
        if (actor) {
            query += ' AND a.actor = ?';
            params.push(actor);
        }
        
        // Add ordering and limit
        query += ' ORDER BY a.created_at DESC';
        
        const limitValue = limit ? parseInt(limit) : 50;
        if (limitValue > 0) {
            query += ' LIMIT ?';
            params.push(limitValue);
        }
        
        const activities = db.prepare(query).all(...params);
        
        res.json({
            success: true,
            data: activities
        });
    } catch (err) {
        console.error('[ACTIVITY] List error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to list activity'
            }
        });
    }
});

module.exports = router;
