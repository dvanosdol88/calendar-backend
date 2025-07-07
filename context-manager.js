/**
 * Context Manager
 * Handles intelligent context windowing for AI conversations
 */
class ContextManager {
    constructor(conversationManager, config = {}) {
        this.conversationManager = conversationManager;
        this.maxMessages = config.maxMessages || 20;
        this.maxTokens = config.maxTokens || 3000;
        this.priorityKeywords = config.priorityKeywords || [
            'task', 'calendar', 'reminder', 'schedule', 'meeting',
            'YMCA', 'work', 'personal', 'todo', 'complete'
        ];
    }

    /**
     * Build context for a conversation
     */
    async buildContext(conversationId, newMessage) {
        const conversation = await this.conversationManager.loadConversation(conversationId);
        if (!conversation) {
            throw new Error(`Conversation ${conversationId} not found`);
        }

        let contextMessages = [];
        let totalTokens = 0;

        // Always include system message
        const systemMessage = {
            role: 'system',
            content: this.getSystemPrompt()
        };
        contextMessages.push(systemMessage);
        totalTokens += this.estimateTokens(systemMessage.content);

        // Include important task context if the message is task-related
        if (this.isTaskRelated(newMessage)) {
            const taskContext = await this.getTaskContext();
            if (taskContext) {
                contextMessages.push({
                    role: 'system',
                    content: taskContext
                });
                totalTokens += this.estimateTokens(taskContext);
            }
        }

        // Add recent messages
        const recentMessages = await this.selectRecentMessages(
            conversation.messages,
            this.maxTokens - totalTokens,
            newMessage
        );

        contextMessages.push(...recentMessages.messages);
        totalTokens += recentMessages.tokens;

        // Add the new message
        contextMessages.push({
            role: 'user',
            content: newMessage
        });

        return {
            messages: contextMessages,
            totalTokens: totalTokens + this.estimateTokens(newMessage),
            messagesIncluded: recentMessages.count,
            conversationId
        };
    }

    /**
     * Select recent messages intelligently
     */
    async selectRecentMessages(allMessages, tokenBudget, newMessage) {
        const messages = [];
        let totalTokens = 0;
        let messageCount = 0;

        // First pass: include priority messages
        const priorityMessages = this.identifyPriorityMessages(allMessages, newMessage);
        
        for (const msg of priorityMessages) {
            const tokens = this.estimateTokens(msg.content);
            if (totalTokens + tokens <= tokenBudget) {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
                totalTokens += tokens;
                messageCount++;
            }
        }

        // Second pass: fill with recent messages
        const remainingBudget = tokenBudget - totalTokens;
        const recentMessages = allMessages.slice(-this.maxMessages).reverse();

        for (const msg of recentMessages) {
            // Skip if already included as priority
            if (messages.find(m => m.content === msg.content)) continue;

            const tokens = this.estimateTokens(msg.content);
            if (totalTokens + tokens <= tokenBudget && messageCount < this.maxMessages) {
                messages.unshift({
                    role: msg.role,
                    content: msg.content
                });
                totalTokens += tokens;
                messageCount++;
            }
        }

        // Sort messages chronologically
        return {
            messages: messages.reverse(),
            tokens: totalTokens,
            count: messageCount
        };
    }

    /**
     * Identify priority messages based on relevance
     */
    identifyPriorityMessages(messages, newMessage) {
        const priorityMessages = [];
        const newMessageLower = newMessage.toLowerCase();
        
        // Look for messages with high relevance
        for (const msg of messages.slice(-50)) { // Check last 50 messages
            let relevanceScore = 0;

            // Check for keyword matches
            for (const keyword of this.priorityKeywords) {
                if (msg.content.toLowerCase().includes(keyword) && 
                    newMessageLower.includes(keyword)) {
                    relevanceScore += 10;
                }
            }

            // Check for direct references
            if (newMessageLower.includes('previous') || 
                newMessageLower.includes('earlier') ||
                newMessageLower.includes('last')) {
                relevanceScore += 5;
            }

            // Include if high relevance
            if (relevanceScore > 5) {
                priorityMessages.push({
                    ...msg,
                    relevanceScore
                });
            }
        }

        // Sort by relevance and take top messages
        return priorityMessages
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 5);
    }

    /**
     * Check if message is task-related
     */
    isTaskRelated(message) {
        const taskKeywords = ['task', 'todo', 'complete', 'done', 'finish', 
                             'add', 'delete', 'work', 'personal', 'list'];
        const messageLower = message.toLowerCase();
        
        return taskKeywords.some(keyword => messageLower.includes(keyword));
    }

    /**
     * Get current task context
     */
    async getTaskContext() {
        try {
            // Import axios if available, otherwise skip task context
            if (typeof axios !== 'undefined') {
                const response = await axios.get('http://localhost:3000/api/tasks-for-ai');
                if (response.data && response.data.data) {
                    return `Current tasks context:\n${response.data.data}`;
                }
            }
        } catch (error) {
            console.error('Error fetching task context:', error);
        }
        return null;
    }

    /**
     * Estimate token count for text
     */
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        // More accurate would be to use tiktoken library
        return Math.ceil(text.length / 4);
    }

    /**
     * Get system prompt with current context
     */
    getSystemPrompt() {
        const now = new Date();
        const timeContext = now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `You are David's personal AI assistant with persistent memory across conversations. 

Key context:
- Current time: ${timeContext}
- User: David (Financial Planner)
- Dashboard features: Tasks (work/personal), Calendar, Email, Weather
- You have access to conversation history and can reference previous messages
- You can help with task management using commands like "add task", "complete task", etc.
- When there are multiple matching tasks, you will ask for clarification

Important capabilities:
- Remember and reference previous conversations in this session
- Maintain context across multiple messages
- Help with task management, calendar planning, and productivity
- Provide personalized assistance based on conversation history`;
    }

    /**
     * Summarize conversation for context
     */
    async summarizeConversation(conversationId) {
        const conversation = await this.conversationManager.loadConversation(conversationId);
        if (!conversation || conversation.messages.length < 10) {
            return null;
        }

        // Create a summary of key points (this could use AI in the future)
        const topics = new Set();
        const tasks = [];
        
        for (const msg of conversation.messages) {
            const lower = msg.content.toLowerCase();
            
            // Extract topics
            for (const keyword of this.priorityKeywords) {
                if (lower.includes(keyword)) {
                    topics.add(keyword);
                }
            }
            
            // Extract task-related actions
            if (lower.includes('add') && lower.includes('task')) {
                tasks.push('Added tasks');
            }
            if (lower.includes('complete') || lower.includes('done')) {
                tasks.push('Completed tasks');
            }
        }

        return {
            messageCount: conversation.messages.length,
            topics: Array.from(topics),
            taskActions: tasks,
            duration: this.getConversationDuration(conversation)
        };
    }

    /**
     * Get conversation duration
     */
    getConversationDuration(conversation) {
        if (conversation.messages.length < 2) return '0 minutes';
        
        const first = new Date(conversation.messages[0].timestamp);
        const last = new Date(conversation.messages[conversation.messages.length - 1].timestamp);
        const minutes = Math.round((last - first) / 60000);
        
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.round(minutes / 60);
        return `${hours} hours`;
    }
}

export default ContextManager;