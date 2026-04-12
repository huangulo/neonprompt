const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db.js');

/**
 * Authenticate human users via JWT
 */
const authenticateHuman = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or missing token'
            }
        });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        };
        req.actor = {
            name: decoded.username,
            type: 'human'
        };
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or missing token'
            }
        });
    }
};

/**
 * Authenticate agents via API key
 */
const authenticateAgent = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'API key required'
            }
        });
    }
    
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyRow = db.prepare('SELECT id, label FROM api_keys WHERE key_hash = ?').get(keyHash);
    
    if (!keyRow) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid API key'
            }
        });
    }
    
    // Update last_used_at
    db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyRow.id);
    
    req.agent = {
        id: keyRow.id,
        label: keyRow.label
    };
    req.actor = {
        name: keyRow.label,
        type: 'agent'
    };
    next();
};

/**
 * Authenticate via JWT or API key (tries both)
 */
const authenticateAny = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];
    
    // Try JWT first
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
            req.actor = {
                name: decoded.username,
                type: 'human'
            };
            return next();
        } catch (err) {
            // JWT failed, continue to API key check
        }
    }
    
    // Try API key
    if (apiKey) {
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const keyRow = db.prepare('SELECT id, label FROM api_keys WHERE key_hash = ?').get(keyHash);
        
        if (keyRow) {
            db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyRow.id);
            req.agent = {
                id: keyRow.id,
                label: keyRow.label
            };
            req.actor = {
                name: keyRow.label,
                type: 'agent'
            };
            return next();
        }
    }
    
    // Both failed
    return res.status(401).json({
        success: false,
        error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing token'
        }
    });
};

module.exports = {
    authenticateHuman,
    authenticateAgent,
    authenticateAny
};
