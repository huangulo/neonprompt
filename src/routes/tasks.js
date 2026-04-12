const express = require('express');
const { authenticateAny } = require('../middleware/auth.js');
const { logActivity } = require('../middleware/logger.js');
const db = require('../db.js');

const router = express.Router();

/**
 * GET /project/:projectId — list tasks for a project
 * Query filters: ?status=todo&priority=high&assigned_to=ally
 */
router.get('/project/:projectId', authenticateAny, (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, priority, assigned_to } = req.query;

        let query = `
            SELECT t.*, p.name as project_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.project_id = ?
        `;
        const params = [projectId];

        // Add filters
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        if (priority) {
            query += ' AND t.priority = ?';
            params.push(priority);
        }

        if (assigned_to) {
            query += ' AND t.assigned_to = ?';
            params.push(assigned_to);
        }

        // Sort by priority (urgent first) then due_date (soonest first)
        query += ` ORDER BY
            CASE t.priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END ASC,
            t.due_date ASC NULLS LAST,
            t.created_at DESC
        `;

        const tasks = db.prepare(query).all(...params);

        res.json({
            success: true,
            data: tasks
        });
    } catch (err) {
        console.error('[TASKS] List error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to list tasks'
            }
        });
    }
});

/**
 * GET /:id — single task with project name
 */
router.get('/:id', authenticateAny, (req, res) => {
    try {
        const { id } = req.params;

        const task = db.prepare(`
            SELECT t.*, p.name as project_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.id = ?
        `).get(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Task not found'
                }
            });
        }

        res.json({
            success: true,
            data: task
        });
    } catch (err) {
        console.error('[TASKS] Get error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get task'
            }
        });
    }
});

/**
 * POST /project/:projectId — create task
 */
router.post('/project/:projectId', authenticateAny, (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, priority, assigned_to, due_date, status, model_used, tokens_in, tokens_out, progress } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Title is required'
                }
            });
        }

        // Default values
        const taskStatus = status || 'todo';
        const taskPriority = priority || 'medium';

        const result = db.prepare(`
            INSERT INTO tasks (project_id, title, description, priority, assigned_to, due_date, status, model_used, tokens_in, tokens_out, progress)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            projectId,
            title,
            description || null,
            taskPriority,
            assigned_to || null,
            due_date || null,
            taskStatus,
            model_used || null,
            tokens_in || 0,
            tokens_out || 0,
            progress || 0
        );

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

        // Log activity
        logActivity(db, req.actor.name, req.actor.type, 'create', 'task', result.lastInsertRowid, {
            title: task.title,
            priority: task.priority,
            model_used: task.model_used
        });

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (err) {
        console.error('[TASKS] Create error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create task'
            }
        });
    }
});

/**
 * PATCH /:id — update task
 */
router.patch('/:id', authenticateAny, (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Allowed fields (expanded with new agent fields)
        const allowedFields = [
            'title', 'description', 'priority', 'assigned_to', 'due_date', 'status',
            'model_used', 'tokens_in', 'tokens_out', 'progress', 'blocked_reason'
        ];
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

        // Get current task for status change tracking
        const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        if (!currentTask) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Task not found'
                }
            });
        }

        // Validate: when status is "blocked", require blocked_reason
        if (updates.status === 'blocked' && !updates.blocked_reason) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'blocked_reason is required when status is "blocked"'
                }
            });
        }

        // When status changes from "blocked" to something else, clear blocked_reason
        let finalUpdates = { ...updates };
        if (updates.status && updates.status !== 'blocked' && currentTask.status === 'blocked') {
            finalUpdates.blocked_reason = null;
            updateFields.push('blocked_reason');
        }

        // When progress is set to 100, auto-set status to "done" and completed_at
        if (updates.progress === 100 && currentTask.status !== 'done') {
            finalUpdates.status = 'done';
            if (!updateFields.includes('status')) {
                updateFields.push('status');
            }
        }

        // Build SET clause with completed_at handling
        let setClause = '';
        let values = [];
        for (const key of updateFields) {
            if (setClause) setClause += ', ';
            setClause += `${key} = ?`;
            values.push(finalUpdates[key]);
        }

        // Handle completed_at: set to CURRENT_TIMESTAMP if status='done', clear if status changes from 'done'
        if (finalUpdates.status === 'done') {
            setClause += ', completed_at = CURRENT_TIMESTAMP';
        } else if (finalUpdates.status && finalUpdates.status !== 'done' && currentTask.status === 'done') {
            setClause += ', completed_at = NULL';
        }

        // Execute update
        values.push(id);
        db.prepare(`UPDATE tasks SET updated_at = CURRENT_TIMESTAMP, ${setClause} WHERE id = ?`).run(...values);

        // Log activity (include model_used if present)
        const logMetadata = {
            changes: updateFields,
            previous: currentTask.status
        };
        if (finalUpdates.model_used) {
            logMetadata.model_used = finalUpdates.model_used;
        }

        logActivity(db, req.actor.name, req.actor.type, 'update', 'task', parseInt(id), logMetadata);

        res.json({
            success: true,
            data: db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
        });
    } catch (err) {
        console.error('[TASKS] Update error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update task'
            }
        });
    }
});

/**
 * DELETE /:id — delete task
 */
router.delete('/:id', authenticateAny, (req, res) => {
    try {
        const { id } = req.params;

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Task not found'
                }
            });
        }

        db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

        // Log activity
        logActivity(db, req.actor.name, req.actor.type, 'delete', 'task', parseInt(id), {
            title: task.title
        });

        res.json({
            success: true,
            data: { deleted: true }
        });
    } catch (err) {
        console.error('[TASKS] Delete error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete task'
            }
        });
    }
});

module.exports = router;
