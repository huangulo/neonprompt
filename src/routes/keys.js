const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db.js');
const { authenticateHuman } = require('../middleware/auth.js');

const router = express.Router();

/**
 * GET /api/v1/keys
 * List all API keys (for the authenticated human user)
 */
router.get('/', authenticateHuman, (req, res) => {
    try {
        const keys = db.prepare('SELECT id, label, created_at, last_used_at FROM api_keys ORDER BY created_at DESC').all();
        
        res.json({
            success: true,
            data: keys
        });
    } catch (err) {
        console.error('[KEYS] List error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to list API keys'
            }
        });
    }
});

/**
 * POST /api/v1/keys
 * Create a new API key
 * Returns the plain key ONCE - it will never be shown again
 */
router.post('/', authenticateHuman, (req, res) => {
    try {
        const { label } = req.body;
        
        if (!label) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Label is required'
                }
            });
        }
        
        // Generate API key
        const apiKey = 'pd_' + uuidv4();
        
        // Hash the key
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        
        // Store hash in database
        const result = db.prepare('INSERT INTO api_keys (key_hash, label) VALUES (?, ?)').run(keyHash, label);
        
        res.json({
            success: true,
            data: {
                id: result.lastInsertRowid,
                key: apiKey,
                label
            }
        });
    } catch (err) {
        console.error('[KEYS] Create error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create API key'
            }
        });
    }
});

/**
 * DELETE /api/v1/keys/:id
 * Delete an API key
 */
router.delete('/:id', authenticateHuman, (req, res) => {
    try {
        const { id } = req.params;
        
        const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'API key not found'
                }
            });
        }
        
        res.json({
            success: true,
            data: {
                deleted: true
            }
        });
    } catch (err) {
        console.error('[KEYS] Delete error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete API key'
            }
        });
    }
});

module.exports = router;
