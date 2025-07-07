import { google } from 'googleapis';
import express from 'express';

const router = express.Router();

// Gmail API setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Scopes for Gmail read access
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Generate auth URL
router.get('/auth/google', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
    res.redirect(authUrl);
});

// Handle OAuth callback
router.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Store tokens (in production, use secure storage)
        // For now, we'll store in memory or environment
        process.env.GMAIL_REFRESH_TOKEN = tokens.refresh_token;
        
        res.send('Gmail authentication successful! You can close this window.');
    } catch (error) {
        console.error('Error authenticating Gmail:', error);
        res.status(500).send('Authentication failed');
    }
});

// Get recent emails endpoint
router.get('/api/emails', async (req, res) => {
    try {
        // Set credentials from stored token
        if (process.env.GMAIL_REFRESH_TOKEN) {
            oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });
        } else {
            return res.status(401).json({ error: 'Gmail not authenticated. Please visit /auth/google' });
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Get recent emails
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 10,
            q: 'is:unread OR is:important'
        });

        if (!response.data.messages) {
            return res.json({ emails: [] });
        }

        // Fetch details for each email
        const emails = await Promise.all(
            response.data.messages.slice(0, 5).map(async (message) => {
                const email = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'metadata',
                    metadataHeaders: ['From', 'Subject', 'Date']
                });

                const headers = email.data.payload.headers;
                const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
                const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                const date = headers.find(h => h.name === 'Date')?.value || '';

                // Extract sender name from email
                const fromMatch = from.match(/^"?([^"<]+)"?\s*<?/);
                const fromName = fromMatch ? fromMatch[1].trim() : from.split('<')[0].trim();

                return {
                    id: message.id,
                    from: fromName,
                    subject: subject,
                    date: date,
                    snippet: email.data.snippet
                };
            })
        );

        res.json({ emails });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

export default router;