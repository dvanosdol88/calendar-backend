import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import cors from 'cors'; // <--- Added this line
import gmailRouter from './gmail-integration.js';
import taskRouter from './task-api.js';
import aiTaskRouter from './ai-task-routes.js';
import AITaskAssistant from './ai-task-assistant.js';
import ConversationManager from './conversation-manager.js';
import ContextManager from './context-manager.js';
import AntiHallucinationFilter from './anti-hallucination-filter.js';
import GoogleCalendarIntegration from './google-calendar-integration.js';
import GoogleOAuthFlow from './google-oauth-flow.js';

dotenv.config();
const app = express();

app.use(cors()); // <--- Added this line to enable CORS for all origins
app.use(express.json());

// Gmail integration routes
app.use(gmailRouter);

// Task management routes
app.use(taskRouter);

// AI task assistant routes
app.use(aiTaskRouter);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize AI task assistant, conversation memory, and anti-hallucination filter
const aiTaskAssistant = new AITaskAssistant();
const conversationManager = new ConversationManager();
const contextManager = new ContextManager(conversationManager);
const antiHallucinationFilter = new AntiHallucinationFilter();
const calendarIntegration = new GoogleCalendarIntegration();
const oauthFlow = new GoogleOAuthFlow();

// Initialize conversation manager on startup
conversationManager.initialize().then(() => {
    console.log('Conversation memory system initialized');
}).catch(err => {
    console.error('Failed to initialize conversation memory:', err);
});

app.post('/ask-gpt', async (req, res) => {
  const { prompt, clarificationContext, sessionId, conversationId } = req.body;
  if (!prompt) return res.status(400).send({ error: "No prompt provided." });
  if (!sessionId) return res.status(400).send({ error: "No sessionId provided." });

  try {
    // Get or create conversation
    const conversation = await conversationManager.getOrCreateConversation(
      sessionId,
      conversationId
    );
    
    // Add user message to conversation
    await conversationManager.addMessage(
      conversation.conversationId,
      'user',
      prompt,
      { sessionId }
    );
    
    // Build context with conversation history
    const context = await contextManager.buildContext(
      conversation.conversationId,
      prompt
    );
    
    // First, check if this is a task-related or calendar-related command
    const taskResult = await aiTaskAssistant.processUserInput(prompt, clarificationContext);
    
    if (taskResult.isTaskCommand || taskResult.isCalendarCommand) {
      // Apply anti-hallucination filter to task response
      const filteredTaskResponse = antiHallucinationFilter.filterResponse(
        taskResult.aiResponse, 
        { strict: true, originalPrompt: prompt }
      );
      
      // Add filtered assistant response to conversation
      await conversationManager.addMessage(
        conversation.conversationId,
        'assistant',
        filteredTaskResponse.response,
        { 
          taskCommand: taskResult.isTaskCommand,
          calendarCommand: taskResult.isCalendarCommand,
          executionResult: taskResult.executionResult,
          antiHallucinationFilter: {
            wasFiltered: filteredTaskResponse.wasRewritten,
            originalResponse: filteredTaskResponse.originalResponse,
            issues: filteredTaskResponse.issues || [],
            confidence: filteredTaskResponse.confidence
          }
        }
      );
      
      // Handle task commands and clarification responses
      const response = {
        answer: filteredTaskResponse.response,
        taskCommand: taskResult.isTaskCommand,
        calendarCommand: taskResult.isCalendarCommand,
        executionResult: taskResult.executionResult,
        conversationId: conversation.conversationId,
        antiHallucinationFilter: {
          wasFiltered: filteredTaskResponse.wasRewritten,
          confidence: filteredTaskResponse.confidence,
          issues: filteredTaskResponse.issues || []
        }
      };
      
      // If the result requires clarification or confirmation, add context for next request
      if (taskResult.executionResult.requiresClarification) {
        response.requiresClarification = true;
        response.clarificationContext = {
          action: taskResult.commandAnalysis.action,
          matches: taskResult.executionResult.matches,
          newText: taskResult.commandAnalysis.newText || taskResult.commandAnalysis.taskText
        };
      } else if (taskResult.executionResult.requiresConfirmation) {
        response.requiresConfirmation = true;
        response.clarificationContext = {
          action: taskResult.commandAnalysis.action,
          matches: taskResult.executionResult.matches,
          newText: taskResult.commandAnalysis.newText || taskResult.commandAnalysis.taskText,
          requiresConfirmation: true,
          confidence: taskResult.executionResult.confidence
        };
      }
      
      return res.send(response);
    }

    // If not a task command, use conversation history for general AI response
    const calendarData = JSON.parse(fs.readFileSync('./calendar_plan.json', 'utf-8'));
    
    // Use the context we already built with conversation history
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: context.messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const assistantResponse = completion.choices[0].message.content;
    
    // Apply anti-hallucination filter to general AI response
    const filteredGeneralResponse = antiHallucinationFilter.filterResponse(
      assistantResponse, 
      { strict: false } // Less strict for general responses
    );
    
    // Add filtered assistant response to conversation
    await conversationManager.addMessage(
      conversation.conversationId,
      'assistant',
      filteredGeneralResponse.response,
      {
        tokensUsed: completion.usage?.total_tokens || 0,
        model: 'gpt-3.5-turbo',
        contextMessagesUsed: context.messagesIncluded,
        antiHallucinationFilter: {
          wasFiltered: filteredGeneralResponse.wasRewritten,
          originalResponse: filteredGeneralResponse.originalResponse,
          issues: filteredGeneralResponse.issues || [],
          confidence: filteredGeneralResponse.confidence
        }
      }
    );

    res.send({ 
      answer: filteredGeneralResponse.response,
      conversationId: conversation.conversationId,
      taskCommand: false,
      metadata: {
        tokensUsed: completion.usage?.total_tokens || 0,
        contextSize: context.messagesIncluded
      },
      antiHallucinationFilter: {
        wasFiltered: filteredGeneralResponse.wasRewritten,
        confidence: filteredGeneralResponse.confidence,
        issues: filteredGeneralResponse.issues || []
      }
    });
  } catch (err) {
    console.error("🔥 FULL ERROR:", err); // This line helps see errors on Render
    res.status(500).send({ error: "Error communicating with GPT." });
  }
});

// Debug endpoint for command analysis
app.post('/api/debug/analyze-command', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send({ error: "No prompt provided." });
  
  try {
    const analysis = await aiTaskAssistant.analyzeTaskCommand(prompt);
    res.json({
      input: prompt,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze command',
      details: error.message,
      input: prompt
    });
  }
});

// Anti-Hallucination Filter Endpoints

// Get system capabilities and filter status
app.get('/api/capabilities', (req, res) => {
  try {
    const capabilities = antiHallucinationFilter.getCapabilitiesSummary();
    res.json({
      capabilities,
      filterEnabled: true,
      filterVersion: '1.0.0',
      description: 'Anti-hallucination filter prevents AI from claiming capabilities it does not have'
    });
  } catch (error) {
    console.error('Error fetching capabilities:', error);
    res.status(500).json({ error: 'Failed to fetch capabilities' });
  }
});

// Test endpoint for anti-hallucination filter
app.post('/api/test-filter', (req, res) => {
  const { text, strict = true } = req.body;
  if (!text) return res.status(400).send({ error: "No text provided." });
  
  try {
    const result = antiHallucinationFilter.filterResponse(text, { strict });
    res.json({
      originalText: text,
      filteredText: result.response,
      wasFiltered: result.wasRewritten,
      issues: result.issues || [],
      confidence: result.confidence || 100,
      filterMetadata: {
        strict,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error testing filter:', error);
    res.status(500).json({ error: 'Failed to test filter' });
  }
});

// Conversation Management Endpoints

// Get all conversations for a session
app.get('/api/conversations', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).send({ error: "No sessionId provided." });
  
  try {
    const sessions = await conversationManager.loadSessions();
    const session = sessions.sessions[sessionId];
    const userId = session?.userId || 'default_user';
    
    const conversations = await conversationManager.getConversations(userId);
    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation
app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conversation = await conversationManager.loadConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Get conversation messages with pagination
app.get('/api/conversations/:id/messages', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  
  try {
    const result = await conversationManager.getMessages(
      req.params.id,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create new conversation
app.post('/api/conversations', async (req, res) => {
  const { sessionId, title } = req.body;
  if (!sessionId) return res.status(400).send({ error: "No sessionId provided." });
  
  try {
    const sessions = await conversationManager.loadSessions();
    const session = sessions.sessions[sessionId];
    const userId = session?.userId || 'default_user';
    
    const conversation = await conversationManager.createConversation(userId, title);
    
    // Update session with new conversation
    await conversationManager.updateSession(sessionId, {
      conversationId: conversation.conversationId,
      userId
    });
    
    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Archive conversation
app.put('/api/conversations/:id/archive', async (req, res) => {
  try {
    await conversationManager.archiveConversation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

// Sync session
app.post('/api/sessions/sync', async (req, res) => {
  const { sessionId, deviceInfo } = req.body;
  if (!sessionId) return res.status(400).send({ error: "No sessionId provided." });
  
  try {
    await conversationManager.updateSession(sessionId, { deviceInfo });
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing session:', error);
    res.status(500).json({ error: 'Failed to sync session' });
  }
});

// Google Calendar API Endpoints

// Create calendar event
app.post('/api/calendar/events', async (req, res) => {
  const { eventTitle, dateTime, duration, description, location, timeZone } = req.body;
  
  if (!eventTitle || !dateTime) {
    return res.status(400).json({ 
      error: "Event title and dateTime are required" 
    });
  }
  
  try {
    const result = await calendarIntegration.addEvent({
      eventTitle,
      dateTime,
      duration: duration || 60,
      description: description || '',
      location: location || '',
      timeZone: timeZone || 'America/New_York'
    });
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Get calendar events
app.get('/api/calendar/events', async (req, res) => {
  const { startDate, endDate } = req.query;
  
  try {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const result = await calendarIntegration.getEvents(start, end);
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Update calendar event
app.put('/api/calendar/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { eventTitle, dateTime, duration, description, location, timeZone } = req.body;
  
  try {
    const result = await calendarIntegration.updateEvent(eventId, {
      eventTitle,
      dateTime,
      duration,
      description,
      location,
      timeZone
    });
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// Delete calendar event
app.delete('/api/calendar/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    const result = await calendarIntegration.deleteEvent(eventId);
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

// Calendar capabilities endpoint
app.get('/api/calendar/capabilities', (req, res) => {
  try {
    const isAvailable = calendarIntegration.isCalendarAvailable();
    res.json({
      available: isAvailable,
      features: [
        'Create events',
        'List events',
        'Update events',
        'Delete events',
        'Natural language processing',
        'Timezone support'
      ],
      description: 'Google Calendar integration with natural language processing'
    });
  } catch (error) {
    console.error('Error fetching calendar capabilities:', error);
    res.status(500).json({ error: 'Failed to fetch calendar capabilities' });
  }
});

// OAuth 2.0 authentication endpoints

// Start OAuth flow - redirect user to Google consent screen
app.get('/api/calendar/auth', (req, res) => {
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return res.json({
        message: 'Calendar authentication endpoint',
        status: 'Service account authentication is configured via environment variables',
        note: 'Service account is already configured. OAuth flow not needed.',
        serviceAccountMode: true
      });
    }

    const authUrl = oauthFlow.getAuthUrl();
    res.json({
      authUrl,
      message: 'Visit the authUrl to authorize calendar access',
      instructions: 'After authorization, you will be redirected back with an authorization code'
    });
  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
});

// OAuth callback endpoint - exchange code for tokens
app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({
      error: 'OAuth authorization failed',
      details: error
    });
  }

  if (!code) {
    return res.status(400).json({
      error: 'No authorization code provided'
    });
  }

  try {
    const result = await oauthFlow.exchangeCodeForTokens(code);
    
    if (result.success) {
      // In production, you would store the refresh token securely
      console.log('OAuth Success - Refresh Token:', result.refreshToken);
      
      res.json({
        success: true,
        message: 'Calendar authorization successful!',
        refreshToken: result.refreshToken,
        note: 'Store this refresh token in your environment variables as GOOGLE_CALENDAR_REFRESH_TOKEN'
      });
    } else {
      res.status(500).json({
        error: 'Failed to exchange authorization code',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

// Check OAuth authentication status
app.get('/api/calendar/auth/status', async (req, res) => {
  try {
    const isAuthenticated = oauthFlow.isAuthenticated();
    
    if (isAuthenticated) {
      const profile = await oauthFlow.getUserProfile();
      const calendars = await oauthFlow.getCalendarList();
      
      res.json({
        authenticated: true,
        profile: profile.success ? profile.profile : null,
        calendars: calendars.success ? calendars.calendars : [],
        message: 'User is authenticated via OAuth 2.0'
      });
    } else {
      res.json({
        authenticated: false,
        message: 'User not authenticated. Use /api/calendar/auth to start OAuth flow',
        serviceAccountMode: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      });
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

// Revoke OAuth authentication
app.post('/api/calendar/auth/revoke', async (req, res) => {
  try {
    const result = await oauthFlow.revokeAuthentication();
    res.json(result);
  } catch (error) {
    console.error('Error revoking authentication:', error);
    res.status(500).json({ error: 'Failed to revoke authentication' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
