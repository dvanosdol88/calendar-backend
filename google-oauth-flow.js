/**
 * Google OAuth 2.0 Flow for Calendar Integration
 * 
 * This module provides OAuth 2.0 authentication flow for accessing
 * user's Google Calendar with their explicit permission.
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export class GoogleOAuthFlow {
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
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
        );

        // Set refresh token if available
        if (process.env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
            this.oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
            });
        }
    }

    /**
     * Generate authorization URL for user consent
     */
    getAuthUrl() {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
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
            throw new Error('No valid access token available. Please authenticate first.');
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
        return !!(credentials && credentials.access_token);
    }

    /**
     * Revoke authentication tokens
     */
    async revokeAuthentication() {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        try {
            await this.oauth2Client.revokeCredentials();
            this.oauth2Client.setCredentials({});

            return {
                success: true,
                message: 'Authentication revoked successfully'
            };
        } catch (error) {
            console.error('Error revoking authentication:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to revoke authentication'
            };
        }
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
     * Get calendar list for authenticated user
     */
    async getCalendarList() {
        try {
            const authClient = this.getAuthenticatedClient();
            const calendar = google.calendar({ version: 'v3', auth: authClient });
            
            const response = await calendar.calendarList.list();
            
            return {
                success: true,
                calendars: response.data.items || [],
                message: 'Calendar list retrieved successfully'
            };
        } catch (error) {
            console.error('Error getting calendar list:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to get calendar list'
            };
        }
    }
}

export default GoogleOAuthFlow;