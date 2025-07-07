/**
 * Google Services API Routes
 * Provides unified endpoints for Gmail, Drive, and Calendar
 */

import express from 'express';
import UnifiedGoogleOAuth from './google-oauth-unified.js';

const router = express.Router();
const googleAuth = new UnifiedGoogleOAuth();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!googleAuth.isAuthenticated()) {
        return res.status(401).json({
            error: 'Not authenticated',
            authUrl: '/api/google/auth',
            message: 'Please authenticate with Google first'
        });
    }
    next();
};

// OAuth flow endpoints
router.get('/api/google/auth', (req, res) => {
    try {
        const authUrl = googleAuth.getAuthUrl();
        res.json({
            authUrl,
            message: 'Visit the authUrl to authorize access to Google services',
            services: ['Gmail', 'Google Drive', 'Google Calendar']
        });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

// OAuth callback
router.get('/auth/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.status(400).send(`
            <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h1 style="color: #e74c3c;">Authorization Failed</h1>
                    <p>Error: ${error}</p>
                    <a href="/" style="color: #3498db;">Return to Dashboard</a>
                </body>
            </html>
        `);
    }

    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }

    try {
        const result = await googleAuth.exchangeCodeForTokens(code);
        
        if (result.success) {
            // Return success page with instructions
            res.send(`
                <html>
                    <head>
                        <title>Google Services Connected</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                padding: 40px;
                                text-align: center;
                                background: #f5f5f5;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                background: white;
                                padding: 40px;
                                border-radius: 10px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }
                            .success {
                                color: #27ae60;
                                font-size: 48px;
                                margin-bottom: 20px;
                            }
                            .token-box {
                                background: #f8f8f8;
                                padding: 20px;
                                border-radius: 5px;
                                margin: 20px 0;
                                word-break: break-all;
                                font-family: monospace;
                                font-size: 12px;
                            }
                            .services {
                                display: flex;
                                justify-content: center;
                                gap: 20px;
                                margin: 30px 0;
                            }
                            .service {
                                padding: 10px 20px;
                                background: #3498db;
                                color: white;
                                border-radius: 5px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="success">✓</div>
                            <h1>Google Services Connected!</h1>
                            <p>Your Google account has been successfully connected.</p>
                            
                            <div class="services">
                                <div class="service">📧 Gmail</div>
                                <div class="service">📁 Drive</div>
                                <div class="service">📅 Calendar</div>
                            </div>
                            
                            <p><strong>Important:</strong> Save this refresh token in your environment variables:</p>
                            <div class="token-box">
                                GOOGLE_REFRESH_TOKEN=${result.refreshToken || 'Already stored'}
                            </div>
                            
                            <p style="margin-top: 30px;">
                                <a href="https://dvanosdol88.github.io/mg-dashboard/" 
                                   style="background: #27ae60; color: white; padding: 15px 30px; 
                                          text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Return to Dashboard
                                </a>
                            </p>
                        </div>
                    </body>
                </html>
            `);
        } else {
            res.status(500).send(`
                <html>
                    <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                        <h1 style="color: #e74c3c;">Authentication Failed</h1>
                        <p>${result.message}</p>
                        <a href="/api/google/auth" style="color: #3498db;">Try Again</a>
                    </body>
                </html>
            `);
        }
    } catch (error) {
        console.error('Error in OAuth callback:', error);
        res.status(500).send('Authentication failed');
    }
});

// Service status endpoint
router.get('/api/google/status', requireAuth, async (req, res) => {
    try {
        const statuses = await googleAuth.getServiceStatuses();
        const profile = await googleAuth.getUserProfile();
        
        res.json({
            ...statuses,
            user: profile.success ? profile.profile : null
        });
    } catch (error) {
        console.error('Error checking service status:', error);
        res.status(500).json({ error: 'Failed to check service status' });
    }
});

// Gmail endpoints
router.get('/api/gmail/messages', requireAuth, async (req, res) => {
    try {
        const { maxResults = 10, query = 'is:unread OR is:important' } = req.query;
        const result = await googleAuth.getRecentEmails(parseInt(maxResults), query);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// Drive endpoints
router.get('/api/drive/files', requireAuth, async (req, res) => {
    try {
        const { pageSize = 10, orderBy = 'modifiedTime desc' } = req.query;
        const result = await googleAuth.getRecentDriveFiles(parseInt(pageSize), orderBy);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error fetching Drive files:', error);
        res.status(500).json({ error: 'Failed to fetch Drive files' });
    }
});

router.get('/api/drive/search', requireAuth, async (req, res) => {
    try {
        const { q, pageSize = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query (q) is required' });
        }
        
        const result = await googleAuth.searchDriveFiles(q, parseInt(pageSize));
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error searching Drive:', error);
        res.status(500).json({ error: 'Failed to search Drive files' });
    }
});

// Calendar endpoints (keeping existing functionality)
router.get('/api/calendar/events', requireAuth, async (req, res) => {
    try {
        const { maxResults = 10, timeMin } = req.query;
        const startTime = timeMin ? new Date(timeMin) : new Date();
        
        const result = await googleAuth.getUpcomingEvents(parseInt(maxResults), startTime);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
});

// Legacy email endpoint compatibility
router.get('/api/emails', requireAuth, async (req, res) => {
    try {
        const result = await googleAuth.getRecentEmails(5);
        
        if (result.success) {
            res.json({ emails: result.emails });
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// Disconnect all services
router.post('/api/google/disconnect', requireAuth, async (req, res) => {
    try {
        // Clear credentials
        googleAuth.oauth2Client.setCredentials({});
        
        res.json({
            success: true,
            message: 'Google services disconnected successfully'
        });
    } catch (error) {
        console.error('Error disconnecting services:', error);
        res.status(500).json({ error: 'Failed to disconnect services' });
    }
});

export default router;