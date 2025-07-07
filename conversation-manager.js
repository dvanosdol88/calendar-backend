import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Conversation Manager
 * Handles persistent storage and retrieval of conversation history
 */
class ConversationManager {
    constructor(dataDir = './data') {
        this.dataDir = path.join(__dirname, dataDir);
        this.conversationsDir = path.join(this.dataDir, 'conversations');
        this.metadataFile = path.join(this.dataDir, 'conversation_metadata.json');
        this.sessionsFile = path.join(this.dataDir, 'user_sessions.json');
        this.initialized = false;
    }
    
    async initialize() {
        if (!this.initialized) {
            await this.ensureDirectories();
            this.initialized = true;
        }
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(this.conversationsDir, { recursive: true });
            
            // Initialize metadata file if it doesn't exist
            try {
                await fs.access(this.metadataFile);
            } catch {
                await fs.writeFile(this.metadataFile, JSON.stringify({
                    conversations: [],
                    stats: {
                        totalConversations: 0,
                        totalMessages: 0,
                        totalTokensUsed: 0
                    }
                }, null, 2));
            }
            
            // Initialize sessions file if it doesn't exist
            try {
                await fs.access(this.sessionsFile);
            } catch {
                await fs.writeFile(this.sessionsFile, JSON.stringify({
                    sessions: {}
                }, null, 2));
            }
        } catch (error) {
            console.error('Error creating directories:', error);
        }
    }

    /**
     * Generate a unique conversation ID
     */
    generateConversationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `conv_${timestamp}_${random}`;
    }

    /**
     * Create a new conversation
     */
    async createConversation(userId, title = 'New Conversation') {
        await this.initialize();
        const conversationId = this.generateConversationId();
        const conversation = {
            conversationId,
            userId,
            title,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            metadata: {
                totalMessages: 0,
                tokensUsed: 0,
                lastContext: null,
                tags: []
            },
            messages: []
        };

        await this.saveConversation(conversation);
        return conversation;
    }

    /**
     * Save conversation to file
     */
    async saveConversation(conversation) {
        const filePath = path.join(
            this.conversationsDir,
            `${conversation.conversationId}.json`
        );
        
        await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
        await this.updateMetadata(conversation);
    }

    /**
     * Load conversation from file
     */
    async loadConversation(conversationId) {
        const filePath = path.join(
            this.conversationsDir,
            `${conversationId}.json`
        );
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Conversation ${conversationId} not found:`, error);
            return null;
        }
    }

    /**
     * Add a message to a conversation
     */
    async addMessage(conversationId, role, content, metadata = {}) {
        const conversation = await this.loadConversation(conversationId);
        if (!conversation) {
            throw new Error(`Conversation ${conversationId} not found`);
        }

        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role,
            content,
            timestamp: new Date().toISOString(),
            metadata
        };

        conversation.messages.push(message);
        conversation.lastUpdated = new Date().toISOString();
        conversation.metadata.totalMessages = conversation.messages.length;
        
        if (metadata.tokensUsed) {
            conversation.metadata.tokensUsed += metadata.tokensUsed;
        }

        await this.saveConversation(conversation);
        return message;
    }

    /**
     * Update conversation metadata
     */
    async updateMetadata(conversation) {
        const metadata = await this.loadMetadata();
        
        const existingIndex = metadata.conversations.findIndex(
            c => c.conversationId === conversation.conversationId
        );

        const metadataEntry = {
            conversationId: conversation.conversationId,
            userId: conversation.userId,
            title: conversation.title,
            lastActive: conversation.lastUpdated,
            messageCount: conversation.messages.length,
            filePath: `conversations/${conversation.conversationId}.json`,
            isArchived: false,
            tags: conversation.metadata.tags || []
        };

        if (existingIndex >= 0) {
            metadata.conversations[existingIndex] = metadataEntry;
        } else {
            metadata.conversations.push(metadataEntry);
            metadata.stats.totalConversations++;
        }

        metadata.stats.totalMessages = metadata.conversations.reduce(
            (sum, conv) => sum + conv.messageCount, 0
        );

        await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
    }

    /**
     * Load metadata
     */
    async loadMetadata() {
        try {
            const data = await fs.readFile(this.metadataFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return {
                conversations: [],
                stats: {
                    totalConversations: 0,
                    totalMessages: 0,
                    totalTokensUsed: 0
                }
            };
        }
    }

    /**
     * Get conversations for a user
     */
    async getConversations(userId, includeArchived = false) {
        const metadata = await this.loadMetadata();
        return metadata.conversations.filter(conv => 
            conv.userId === userId && (includeArchived || !conv.isArchived)
        );
    }

    /**
     * Get or create conversation for a session
     */
    async getOrCreateConversation(sessionId, conversationId = null) {
        // If conversationId provided, load it
        if (conversationId) {
            const conversation = await this.loadConversation(conversationId);
            if (conversation) return conversation;
        }

        // Otherwise get active conversation for session
        const sessions = await this.loadSessions();
        const session = sessions.sessions[sessionId];
        
        if (session && session.conversationId) {
            const conversation = await this.loadConversation(session.conversationId);
            if (conversation) return conversation;
        }

        // Create new conversation
        const userId = session?.userId || 'default_user';
        const newConversation = await this.createConversation(userId);
        
        // Update session
        await this.updateSession(sessionId, {
            conversationId: newConversation.conversationId,
            userId
        });

        return newConversation;
    }

    /**
     * Load sessions
     */
    async loadSessions() {
        try {
            const data = await fs.readFile(this.sessionsFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return { sessions: {} };
        }
    }

    /**
     * Update session
     */
    async updateSession(sessionId, updates) {
        const sessions = await this.loadSessions();
        
        if (!sessions.sessions[sessionId]) {
            sessions.sessions[sessionId] = {
                sessionId,
                createdAt: new Date().toISOString()
            };
        }

        sessions.sessions[sessionId] = {
            ...sessions.sessions[sessionId],
            ...updates,
            lastActive: new Date().toISOString()
        };

        await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
    }

    /**
     * Get messages with pagination
     */
    async getMessages(conversationId, page = 1, limit = 50) {
        const conversation = await this.loadConversation(conversationId);
        if (!conversation) return { messages: [], pagination: {} };

        const totalMessages = conversation.messages.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        return {
            messages: conversation.messages.slice(startIndex, endIndex),
            pagination: {
                page,
                limit,
                totalMessages,
                totalPages: Math.ceil(totalMessages / limit),
                hasMore: endIndex < totalMessages
            }
        };
    }

    /**
     * Archive a conversation
     */
    async archiveConversation(conversationId) {
        const metadata = await this.loadMetadata();
        const conversation = metadata.conversations.find(
            c => c.conversationId === conversationId
        );
        
        if (conversation) {
            conversation.isArchived = true;
            await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
        }
    }

    /**
     * Clean up old conversations (optional)
     */
    async cleanupOldConversations(daysToKeep = 30) {
        const metadata = await this.loadMetadata();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        for (const conv of metadata.conversations) {
            const lastActive = new Date(conv.lastActive);
            if (lastActive < cutoffDate && !conv.isArchived) {
                await this.archiveConversation(conv.conversationId);
            }
        }
    }
}

export default ConversationManager;