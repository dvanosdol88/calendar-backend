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

// Initialize AI task assistant and conversation memory
const aiTaskAssistant = new AITaskAssistant();
const conversationManager = new ConversationManager();
const contextManager = new ContextManager(conversationManager);

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
    
    // First, check if this is a task-related command
    const taskResult = await aiTaskAssistant.processUserInput(prompt, clarificationContext);
    
    if (taskResult.isTaskCommand) {
      // Add assistant response to conversation
      await conversationManager.addMessage(
        conversation.conversationId,
        'assistant',
        taskResult.aiResponse,
        { 
          taskCommand: true,
          executionResult: taskResult.executionResult
        }
      );
      
      // Handle task commands and clarification responses
      const response = {
        answer: taskResult.aiResponse,
        taskCommand: true,
        executionResult: taskResult.executionResult,
        conversationId: conversation.conversationId
      };
      
      // If the result requires clarification, add clarification context for next request
      if (taskResult.executionResult.requiresClarification) {
        response.requiresClarification = true;
        response.clarificationContext = {
          action: taskResult.commandAnalysis.action,
          matches: taskResult.executionResult.matches,
          newText: taskResult.commandAnalysis.newText || taskResult.commandAnalysis.taskText
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
    
    // Add assistant response to conversation
    await conversationManager.addMessage(
      conversation.conversationId,
      'assistant',
      assistantResponse,
      {
        tokensUsed: completion.usage?.total_tokens || 0,
        model: 'gpt-3.5-turbo',
        contextMessagesUsed: context.messagesIncluded
      }
    );

    res.send({ 
      answer: assistantResponse,
      conversationId: conversation.conversationId,
      taskCommand: false,
      metadata: {
        tokensUsed: completion.usage?.total_tokens || 0,
        contextSize: context.messagesIncluded
      }
    });
  } catch (err) {
    console.error("🔥 FULL ERROR:", err); // This line helps see errors on Render
    res.status(500).send({ error: "Error communicating with GPT." });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
