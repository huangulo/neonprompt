const express = require('express');
const { authenticateAny } = require('../middleware/auth.js');
const { logActivity } = require('../middleware/logger.js');
const db = require('../db.js');

const router = express.Router();

/**
 * GET / — list all projects
 * Query params: ?status=active
 * Includes task count summary for each project
 */
router.get('/', authenticateAny, (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT p.*,
                   COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_count,
                   COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_count,
                   COUNT(CASE WHEN t.status = 'done' THEN 1 END) as done_count,
                   COUNT(CASE WHEN t.status = 'blocked' THEN 1 END) as blocked_count
            FROM projects p
            LEFT JOIN tasks t ON p.id = t.project_id
            GROUP BY p.id
            ORDER BY p.id DESC
        `;
        
        let projects;
        
        if (status) {
            projects = db.prepare(query + ' WHERE p.status = ?').all(status);
        } else {
            projects = db.prepare(query).all();
        }
        
        res.json({
            success: true,
            data: projects
        });
    } catch (err) {
        console.error('[PROJECTS] List error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to list projects'
            }
        });
    }
});

/**
 * GET /:id — single project with its full task list
 */
router.get('/:id', authenticateAny, (req, res) => {
    try {
        const { id } = req.params;
        
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Project not found'
                }
            });
        }
        
        const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC').all(id);
        
        res.json({
            success: true,
            data: {
                ...project,
                tasks
            }
        });
    } catch (err) {
        console.error('[PROJECTS] Get error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get project'
            }
        });
    }
});

/**
 * POST / — create project
 */
router.post('/', authenticateAny, (req, res) => {
    try {
        const { name, description, status } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Name is required'
                }
            });
        }
        
        const result = db.prepare(
            'INSERT INTO projects (name, description, status) VALUES (?, ?, ?)'
        ).run(name, description || null, status || 'active');
        
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
        
        // Log activity
        logActivity(db, req.actor.name, req.actor.type, 'create', 'project', result.lastInsertRowid, {
            name: project.name
        });
        
        res.status(201).json({
            success: true,
            data: project
        });
    } catch (err) {
        console.error('[PROJECTS] Create error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create project'
            }
        });
    }
});

/**
 * PATCH /:id — update project
 */
router.patch('/:id', authenticateAny, (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Allowed fields
        const allowedFields = ['name', 'description', 'status'];
        const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'No valid fields to update'
                }
            });
        }
        
        // Build UPDATE query
        const setClause = updateFields.map(key => `${key} = ?`).join(', ');
        const values = updateFields.map(key => updates[key]);
        
        values.push(id);
        
        db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP, ${setClause} WHERE id = ?`).run(...values);
        
        // Log activity
        logActivity(db, req.actor.name, req.actor.type, 'update', 'project', parseInt(id), {
            changes: updateFields
        });
        
        res.json({
            success: true,
            data: db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
        });
    } catch (err) {
        console.error('[PROJECTS] Update error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update project'
            }
        });
    }
});

/**
 * DELETE /:id — delete project (cascade deletes tasks)
 */
router.delete('/:id', authenticateAny, (req, res) => {
    try {
        const { id } = req.params;
        
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Project not found'
                }
            });
        }
        
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        
        // Log activity
        logActivity(db, req.actor.name, req.actor.type, 'delete', 'project', parseInt(id), {
            name: project.name
        });
        
        res.json({
            success: true,
            data: { deleted: true }
        });
    } catch (err) {
        console.error('[PROJECTS] Delete error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete project'
            }
        });
    }
});

module.exports = router;
