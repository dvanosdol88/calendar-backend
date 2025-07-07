/**
 * Google Calendar Integration
 * Provides real calendar functionality to prevent hallucination
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

export class GoogleCalendarIntegration {
    constructor() {
        this.isEnabled = false;
        this.calendar = null;
        this.auth = null;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.initializeCalendar();
    }

    /**
     * Initialize Google Calendar API
     */
    async initializeCalendar() {
        try {
            // Check if calendar integration is properly configured
            if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_CLIENT_SECRET) {
                console.warn('Google Calendar integration not configured');
                return;
            }

            // Initialize with service account (recommended for server-side)
            if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
                this.auth = new google.auth.GoogleAuth({
                    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
                    scopes: ['https://www.googleapis.com/auth/calendar']
                });
            } else if (process.env.GOOGLE_CLIENT_SECRET) {
                // OAuth2 client setup (for user authentication)
                this.auth = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    process.env.GOOGLE_REDIRECT_URI
                );
            }

            this.calendar = google.calendar('v3');
            this.isEnabled = true;
            console.log('Google Calendar integration initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Google Calendar:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Check if calendar integration is available
     */
    isCalendarAvailable() {
        return this.isEnabled && this.calendar && this.auth;
    }

    /**
     * Parse calendar command from natural language
     */
    async parseCalendarCommand(userInput) {
        const systemPrompt = `You are a calendar command parser. Analyze the user input and determine if it's a calendar-related command.

        VALID CALENDAR COMMANDS:
        - "Add meeting with John tomorrow at 2pm"
        - "Schedule dentist appointment for next Friday at 10am"
        - "Book conference call for March 15th at 3:30pm"
        - "What's on my calendar today?"
        - "Show me tomorrow's schedule"
        - "Cancel the 2pm meeting"

        INVALID COMMANDS (not calendar-related):
        - "I had a meeting" (past event, not scheduling)
        - "Meeting went well" (status update, not calendar)
        - "Need to schedule something" (too vague)

        Response format (JSON only):
        {
            "isCalendarCommand": boolean,
            "action": "add|get|update|delete|list",
            "eventTitle": "string or null",
            "dateTimeText": "raw date/time text from user input",
            "duration": "minutes or null",
            "description": "string or null",
            "confidence": 0-100,
            "reasoning": "explanation of classification"
        }

        For date/time parsing:
        - "tomorrow" = next day
        - "next Friday" = upcoming Friday
        - "today at 4:30" = today at 16:30
        - "2pm" = 14:00 on specified date
        - "4:30pm" = 16:30 on specified date
        - "10 AM" = 10:00 on specified date
        - "next week Monday" = upcoming Monday
        - Default duration = 60 minutes if not specified
        - Always return ISO datetime string in user's timezone
        
        Current date/time context: ${new Date().toISOString()}
        User timezone: America/New_York (Eastern Time)`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.1,
                max_tokens: 300
            });

            const response = completion.choices[0].message.content.trim();
            const analysis = JSON.parse(response);
            
            // Additional validation
            if (analysis.isCalendarCommand && analysis.confidence < 80) {
                analysis.isCalendarCommand = false;
                analysis.reasoning += " (Lowered confidence due to ambiguity)";
            }
            
            return analysis;
        } catch (error) {
            console.error('Error parsing calendar command:', error);
            return { 
                isCalendarCommand: false, 
                confidence: 0,
                reasoning: "Failed to parse calendar command"
            };
        }
    }

    /**
     * Enhanced date/time parsing with timezone support
     */
    async parseDateTime(dateTimeString, timezone = 'America/New_York') {
        const systemPrompt = `You are a date/time parser. Convert natural language date/time expressions to ISO datetime strings.

        Current date/time: ${new Date().toISOString()}
        Target timezone: ${timezone}
        
        Rules:
        - "today at 4:30" = today at 16:30 in target timezone
        - "tomorrow at 10 AM" = tomorrow at 10:00 in target timezone  
        - "next Friday at 2pm" = upcoming Friday at 14:00 in target timezone
        - "Monday" = this Monday if in future, otherwise next Monday
        - "next week Monday" = Monday of next week
        - Handle both 12-hour (3pm, 10 AM) and 24-hour (15:00) formats
        - Default to current date if no date specified
        - Default to 9 AM if no time specified
        
        Response format (JSON only):
        {
            "dateTime": "YYYY-MM-DDTHH:mm:ss.sssZ",
            "success": true,
            "parsedDate": "human readable date",
            "parsedTime": "human readable time",
            "confidence": 0-100
        }
        
        For invalid/unparseable input:
        {
            "success": false,
            "error": "explanation",
            "confidence": 0
        }`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Parse this date/time: "${dateTimeString}"` }
                ],
                temperature: 0.1,
                max_tokens: 150
            });

            const response = completion.choices[0].message.content.trim();
            const parsed = JSON.parse(response);
            
            if (parsed.success && parsed.confidence >= 80) {
                return {
                    success: true,
                    dateTime: parsed.dateTime,
                    parsedDate: parsed.parsedDate,
                    parsedTime: parsed.parsedTime,
                    confidence: parsed.confidence
                };
            } else {
                return {
                    success: false,
                    error: parsed.error || 'Low confidence in date/time parsing',
                    confidence: parsed.confidence || 0
                };
            }
        } catch (error) {
            console.error('Error parsing date/time:', error);
            return {
                success: false,
                error: 'Failed to parse date/time',
                confidence: 0
            };
        }
    }

    /**
     * Add event to Google Calendar
     */
    async addEvent(eventDetails) {
        if (!this.isCalendarAvailable()) {
            return {
                success: false,
                error: 'Calendar integration not available',
                message: 'Google Calendar integration is not configured. Cannot add calendar events.'
            };
        }

        try {
            const authClient = await this.auth.getClient();
            
            // Parse and validate date/time
            const startDateTime = new Date(eventDetails.dateTime);
            const endDateTime = new Date(startDateTime.getTime() + (eventDetails.duration || 60) * 60000);
            
            const event = {
                summary: eventDetails.eventTitle,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: eventDetails.timeZone || 'America/New_York'
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: eventDetails.timeZone || 'America/New_York'
                },
                description: eventDetails.description || '',
                location: eventDetails.location || ''
            };

            const response = await this.calendar.events.insert({
                auth: authClient,
                calendarId: 'primary',
                requestBody: event
            });

            return {
                success: true,
                eventId: response.data.id,
                eventUrl: response.data.htmlLink,
                message: `Event "${eventDetails.eventTitle}" added to calendar for ${startDateTime.toLocaleString()}`,
                eventDetails: {
                    title: eventDetails.eventTitle,
                    startTime: startDateTime.toLocaleString(),
                    endTime: endDateTime.toLocaleString(),
                    url: response.data.htmlLink
                }
            };
        } catch (error) {
            console.error('Error adding calendar event:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to add calendar event: ${error.message}`
            };
        }
    }

    /**
     * Get calendar events for a date range
     */
    async getEvents(startDate, endDate) {
        if (!this.isCalendarAvailable()) {
            return {
                success: false,
                error: 'Calendar integration not available',
                message: 'Google Calendar integration is not configured. Cannot retrieve calendar events.'
            };
        }

        try {
            const authClient = await this.auth.getClient();
            
            const response = await this.calendar.events.list({
                auth: authClient,
                calendarId: 'primary',
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 50
            });

            const events = response.data.items || [];
            
            return {
                success: true,
                events: events.map(event => ({
                    id: event.id,
                    title: event.summary,
                    start: event.start.dateTime || event.start.date,
                    end: event.end.dateTime || event.end.date,
                    description: event.description || '',
                    location: event.location || '',
                    url: event.htmlLink
                })),
                message: `Found ${events.length} events`
            };
        } catch (error) {
            console.error('Error retrieving calendar events:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to retrieve calendar events: ${error.message}`
            };
        }
    }

    /**
     * Update an existing calendar event
     */
    async updateEvent(eventId, eventDetails) {
        if (!this.isCalendarAvailable()) {
            return {
                success: false,
                error: 'Calendar integration not available',
                message: 'Google Calendar integration is not configured. Cannot update calendar events.'
            };
        }

        try {
            const authClient = await this.auth.getClient();
            
            const updateData = {};
            if (eventDetails.eventTitle) updateData.summary = eventDetails.eventTitle;
            if (eventDetails.description) updateData.description = eventDetails.description;
            if (eventDetails.location) updateData.location = eventDetails.location;
            
            if (eventDetails.dateTime) {
                const startDateTime = new Date(eventDetails.dateTime);
                const endDateTime = new Date(startDateTime.getTime() + (eventDetails.duration || 60) * 60000);
                
                updateData.start = {
                    dateTime: startDateTime.toISOString(),
                    timeZone: eventDetails.timeZone || 'America/New_York'
                };
                updateData.end = {
                    dateTime: endDateTime.toISOString(),
                    timeZone: eventDetails.timeZone || 'America/New_York'
                };
            }

            const response = await this.calendar.events.update({
                auth: authClient,
                calendarId: 'primary',
                eventId: eventId,
                requestBody: updateData
            });

            return {
                success: true,
                eventId: response.data.id,
                eventUrl: response.data.htmlLink,
                message: `Event "${response.data.summary}" updated successfully`
            };
        } catch (error) {
            console.error('Error updating calendar event:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to update calendar event: ${error.message}`
            };
        }
    }

    /**
     * Delete a calendar event
     */
    async deleteEvent(eventId) {
        if (!this.isCalendarAvailable()) {
            return {
                success: false,
                error: 'Calendar integration not available',
                message: 'Google Calendar integration is not configured. Cannot delete calendar events.'
            };
        }

        try {
            const authClient = await this.auth.getClient();
            
            await this.calendar.events.delete({
                auth: authClient,
                calendarId: 'primary',
                eventId: eventId
            });

            return {
                success: true,
                message: 'Calendar event deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting calendar event:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to delete calendar event: ${error.message}`
            };
        }
    }

    /**
     * Process calendar command and execute appropriate action
     */
    async processCalendarCommand(userInput) {
        // First, check if calendar integration is available
        if (!this.isCalendarAvailable()) {
            return {
                success: false,
                isCalendarCommand: false,
                message: 'Google Calendar integration is not configured. I cannot add, update, or retrieve calendar events. Please configure the calendar integration first.'
            };
        }

        // Parse the command
        const analysis = await this.parseCalendarCommand(userInput);
        
        if (!analysis.isCalendarCommand || analysis.confidence < 80) {
            return {
                success: false,
                isCalendarCommand: false,
                message: 'This does not appear to be a calendar-related command.'
            };
        }

        try {
            switch (analysis.action) {
                case 'add':
                    // Parse the date/time from natural language
                    if (analysis.dateTimeText) {
                        const parsedDateTime = await this.parseDateTime(analysis.dateTimeText);
                        if (!parsedDateTime.success) {
                            return {
                                success: false,
                                message: `Could not parse date/time "${analysis.dateTimeText}": ${parsedDateTime.error}`
                            };
                        }
                        
                        // Create event with parsed date/time
                        return await this.addEvent({
                            eventTitle: analysis.eventTitle,
                            dateTime: parsedDateTime.dateTime,
                            duration: analysis.duration || 60,
                            description: analysis.description || '',
                            timeZone: 'America/New_York'
                        });
                    } else {
                        return {
                            success: false,
                            message: 'Date and time are required to create a calendar event. Please specify when you want to schedule it.'
                        };
                    }
                
                case 'get':
                case 'list':
                    const today = new Date();
                    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
                    return await this.getEvents(today, tomorrow);
                
                case 'update':
                    return {
                        success: false,
                        message: 'Event updates require the event ID. Please specify which event to update.'
                    };
                
                case 'delete':
                    return {
                        success: false,
                        message: 'Event deletion requires the event ID. Please specify which event to delete.'
                    };
                
                default:
                    return {
                        success: false,
                        message: `Unknown calendar action: ${analysis.action}`
                    };
            }
        } catch (error) {
            console.error('Error processing calendar command:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to process calendar command'
            };
        }
    }

    /**
     * Generate user-friendly calendar response
     */
    async generateCalendarResponse(userInput, result) {
        const systemPrompt = `You are a helpful calendar assistant. 
        Generate a friendly, conversational response about the calendar operation.
        
        Keep responses concise but informative.
        If the operation failed, explain why and suggest alternatives.
        If it succeeded, confirm what was done.`;

        const userPrompt = `User said: "${userInput}"
        
        Calendar operation result: ${JSON.stringify(result)}
        
        Generate a friendly response about what happened.`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error generating calendar response:', error);
            return result.message || 'Calendar operation completed.';
        }
    }
}

export default GoogleCalendarIntegration;