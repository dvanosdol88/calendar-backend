/**
 * Unified Google OAuth 2.0 Flow for Calendar, Gmail, and Drive Integration
 * 
 * This module provides OAuth 2.0 authentication flow for accessing
 * user's Google services with their explicit permission.
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export class UnifiedGoogleOAuth {
    constructor() {
        this.oauth2Client = null;
        this.initializeOAuth();
    }

    /**
     * Initialize OAuth 2.0 client
     */
    initializeOAuth() {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            console.warn('OAuth 2.0 credentials not configured');
            return;
        }

        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'https://calendar-backend-xwk6.onrender.com/auth/google/callback'
        );

        // Set refresh token if available
        if (process.env.GOOGLE_REFRESH_TOKEN) {
            this.oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
        }
    }

    /**
     * Generate authorization URL for user consent with all required scopes
     */
    getAuthUrl() {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        const scopes = [
            // Gmail scopes
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.labels',
            
            // Calendar scopes
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            
            // Drive scopes
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly',
            'https://www.googleapis.com/auth/drive.file',
            
            // User info scope
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Force consent screen to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(code) {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            return {
                success: true,
                tokens,
                refreshToken: tokens.refresh_token,
                message: 'Authentication successful'
            };
        } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to exchange authorization code for tokens'
            };
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);

            return {
                success: true,
                credentials,
                message: 'Access token refreshed successfully'
            };
        } catch (error) {
            console.error('Error refreshing access token:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to refresh access token'
            };
        }
    }

    /**
     * Get authenticated client for API calls
     */
    getAuthenticatedClient() {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        // Check if we have valid credentials
        const credentials = this.oauth2Client.credentials;
        if (!credentials || !credentials.access_token) {
            // Try to refresh if we have a refresh token
            if (credentials && credentials.refresh_token) {
                this.refreshAccessToken();
            } else {
                throw new Error('No valid access token available. Please authenticate first.');
            }
        }

        return this.oauth2Client;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (!this.oauth2Client) {
            return false;
        }

        const credentials = this.oauth2Client.credentials;
        return !!(credentials && (credentials.access_token || credentials.refresh_token));
    }

    /**
     * Get user profile information
     */
    async getUserProfile() {
        try {
            const authClient = this.getAuthenticatedClient();
            const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
            
            const response = await oauth2.userinfo.get();
            
            return {
                success: true,
                profile: response.data,
                message: 'User profile retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting user profile:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to get user profile'
            };
        }
    }

    /**
     * Gmail: Get recent emails
     */
    async getRecentEmails(maxResults = 10, query = 'is:unread OR is:important') {
        try {
            const authClient = this.getAuthenticatedClient();
            const gmail = google.gmail({ version: 'v1', auth: authClient });
            
            const response = await gmail.users.messages.list({
                userId: 'me',
                maxResults,
                q: query
            });

            if (!response.data.messages) {
                return { success: true, emails: [] };
            }

            // Fetch details for each email
            const emails = await Promise.all(
                response.data.messages.slice(0, Math.min(5, maxResults)).map(async (message) => {
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
                        snippet: email.data.snippet,
                        labelIds: email.data.labelIds || []
                    };
                })
            );

            return {
                success: true,
                emails,
                message: 'Emails retrieved successfully'
            };
        } catch (error) {
            console.error('Error fetching emails:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to fetch emails'
            };
        }
    }

    /**
     * Drive: List recent files
     */
    async getRecentDriveFiles(pageSize = 10, orderBy = 'modifiedTime desc') {
        try {
            const authClient = this.getAuthenticatedClient();
            const drive = google.drive({ version: 'v3', auth: authClient });
            
            const response = await drive.files.list({
                pageSize,
                orderBy,
                fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink, owners, size)',
                q: "trashed = false"
            });

            return {
                success: true,
                files: response.data.files || [],
                message: 'Drive files retrieved successfully'
            };
        } catch (error) {
            console.error('Error fetching Drive files:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to fetch Drive files'
            };
        }
    }

    /**
     * Drive: Search files
     */
    async searchDriveFiles(query, pageSize = 10) {
        try {
            const authClient = this.getAuthenticatedClient();
            const drive = google.drive({ version: 'v3', auth: authClient });
            
            // Build search query
            let q = `name contains '${query}' and trashed = false`;
            
            const response = await drive.files.list({
                pageSize,
                q,
                fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink, owners, size)',
                orderBy: 'modifiedTime desc'
            });

            return {
                success: true,
                files: response.data.files || [],
                query,
                message: 'Drive search completed successfully'
            };
        } catch (error) {
            console.error('Error searching Drive files:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to search Drive files'
            };
        }
    }

    /**
     * Calendar: Get upcoming events
     */
    async getUpcomingEvents(maxResults = 10, timeMin = new Date()) {
        try {
            const authClient = this.getAuthenticatedClient();
            const calendar = google.calendar({ version: 'v3', auth: authClient });
            
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin.toISOString(),
                maxResults,
                singleEvents: true,
                orderBy: 'startTime'
            });

            return {
                success: true,
                events: response.data.items || [],
                message: 'Calendar events retrieved successfully'
            };
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to fetch calendar events'
            };
        }
    }

    /**
     * Get all service statuses
     */
    async getServiceStatuses() {
        const statuses = {
            authenticated: this.isAuthenticated(),
            services: {
                gmail: { available: false, error: null },
                drive: { available: false, error: null },
                calendar: { available: false, error: null }
            }
        };

        if (statuses.authenticated) {
            // Test Gmail
            try {
                await this.getRecentEmails(1);
                statuses.services.gmail.available = true;
            } catch (error) {
                statuses.services.gmail.error = error.message;
            }

            // Test Drive
            try {
                await this.getRecentDriveFiles(1);
                statuses.services.drive.available = true;
            } catch (error) {
                statuses.services.drive.error = error.message;
            }

            // Test Calendar
            try {
                await this.getUpcomingEvents(1);
                statuses.services.calendar.available = true;
            } catch (error) {
                statuses.services.calendar.error = error.message;
            }
        }

        return statuses;
    }
}

export default UnifiedGoogleOAuth;