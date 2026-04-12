const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db.js');

const router = express.Router();

/**
 * POST /auth/setup
 * First-run bootstrap - create initial admin user
 * Only works if users table is empty
 */
router.post('/setup', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if setup already completed
        const existingUser = db.prepare('SELECT COUNT(*) as count FROM users').get();
        if (existingUser.count > 0) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'SETUP_COMPLETE',
                    message: 'Setup already completed'
                }
            });
        }
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Username and password are required'
                }
            });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert admin user
        const result = db.prepare(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        ).run(username, passwordHash, 'admin');
        
        // Generate JWT
        const token = jwt.sign(
            { id: result.lastInsertRowid, username, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                token,
                expiresIn: '24h'
            }
        });
    } catch (err) {
        console.error('[AUTH] Setup error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to complete setup'
            }
        });
    }
});

/**
 * POST /auth/login
 * Authenticate existing user
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Username and password are required'
                }
            });
        }
        
        // Look up user
        const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid username or password'
                }
            });
        }
        
        // Compare password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid username or password'
                }
            });
        }
        
        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                token,
                expiresIn: '24h'
            }
        });
    } catch (err) {
        console.error('[AUTH] Login error:', err);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Login failed'
            }
        });
    }
});

module.exports = router;
