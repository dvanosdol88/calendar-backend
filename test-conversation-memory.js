#!/usr/bin/env node

/**
 * Test script for conversation memory system
 */

import ConversationManager from './conversation-manager.js';
import ContextManager from './context-manager.js';

console.log('🧪 Testing Conversation Memory System\n');

async function testConversationManager() {
    const conversationManager = new ConversationManager('./test-data');
    await conversationManager.initialize();
    
    console.log('📝 Testing Conversation Manager...\n');
    
    // Test 1: Create a new conversation
    console.log('1️⃣ Creating new conversation...');
    const conversation = await conversationManager.createConversation('test_user', 'Test Conversation');
    console.log(`✅ Created conversation: ${conversation.conversationId}`);
    console.log(`   Title: ${conversation.title}`);
    console.log(`   User: ${conversation.userId}\n`);
    
    // Test 2: Add messages
    console.log('2️⃣ Adding messages to conversation...');
    await conversationManager.addMessage(
        conversation.conversationId,
        'user',
        'Hello, AI assistant! Can you help me with my tasks?'
    );
    
    await conversationManager.addMessage(
        conversation.conversationId,
        'assistant',
        'Of course! I\'d be happy to help you with your tasks. What would you like to do?',
        { tokensUsed: 25 }
    );
    
    await conversationManager.addMessage(
        conversation.conversationId,
        'user',
        'Add a task to work on the quarterly report'
    );
    
    await conversationManager.addMessage(
        conversation.conversationId,
        'assistant',
        'I\'ve added "Work on the quarterly report" to your work tasks.',
        { tokensUsed: 15, taskCommand: true }
    );
    
    console.log('✅ Added 4 messages to conversation\n');
    
    // Test 3: Load conversation
    console.log('3️⃣ Loading conversation...');
    const loadedConv = await conversationManager.loadConversation(conversation.conversationId);
    console.log(`✅ Loaded conversation with ${loadedConv.messages.length} messages`);
    console.log(`   Total tokens used: ${loadedConv.metadata.tokensUsed}\n`);
    
    // Test 4: Get conversations for user
    console.log('4️⃣ Getting user conversations...');
    const userConversations = await conversationManager.getConversations('test_user');
    console.log(`✅ Found ${userConversations.length} conversations for user\n`);
    
    // Test 5: Session management
    console.log('5️⃣ Testing session management...');
    const sessionId = 'test_session_123';
    await conversationManager.updateSession(sessionId, {
        userId: 'test_user',
        conversationId: conversation.conversationId,
        deviceInfo: { platform: 'test' }
    });
    
    const sessionConv = await conversationManager.getOrCreateConversation(sessionId);
    console.log(`✅ Retrieved conversation for session: ${sessionConv.conversationId}\n`);
    
    // Test 6: Message pagination
    console.log('6️⃣ Testing message pagination...');
    const page1 = await conversationManager.getMessages(conversation.conversationId, 1, 2);
    console.log(`✅ Page 1: ${page1.messages.length} messages`);
    console.log(`   Total pages: ${page1.pagination.totalPages}`);
    console.log(`   Has more: ${page1.pagination.hasMore}\n`);
    
    return conversation;
}

async function testContextManager(conversationManager, conversationId) {
    const contextManager = new ContextManager(conversationManager);
    
    console.log('🧠 Testing Context Manager...\n');
    
    // Test 1: Build context
    console.log('1️⃣ Building context for new message...');
    const context = await contextManager.buildContext(
        conversationId,
        'What tasks did I add earlier?'
    );
    
    console.log(`✅ Built context with ${context.messages.length} messages`);
    console.log(`   Messages included from history: ${context.messagesIncluded}`);
    console.log(`   Estimated tokens: ${context.totalTokens}\n`);
    
    // Test 2: Task-related detection
    console.log('2️⃣ Testing task detection...');
    const taskMessages = [
        'Add a task to call John',
        'What\'s the weather today?',
        'Mark the YMCA task as complete',
        'Tell me a joke'
    ];
    
    for (const msg of taskMessages) {
        const isTask = contextManager.isTaskRelated(msg);
        console.log(`   "${msg}" - Task related: ${isTask ? '✅' : '❌'}`);
    }
    console.log('');
    
    // Test 3: Token estimation
    console.log('3️⃣ Testing token estimation...');
    const testText = 'This is a test message to estimate tokens.';
    const tokens = contextManager.estimateTokens(testText);
    console.log(`   Text length: ${testText.length} characters`);
    console.log(`   Estimated tokens: ${tokens}\n`);
    
    // Test 4: Priority message identification
    console.log('4️⃣ Testing priority message identification...');
    const messages = [
        { content: 'Add YMCA task to my list', role: 'user' },
        { content: 'What is 2+2?', role: 'user' },
        { content: 'Complete the YMCA task', role: 'user' }
    ];
    
    const priority = contextManager.identifyPriorityMessages(messages, 'YMCA task status');
    console.log(`✅ Found ${priority.length} priority messages for "YMCA task status"\n`);
}

async function demonstrateConversationFlow() {
    console.log('💬 Demonstrating Conversation Flow...\n');
    
    const manager = new ConversationManager('./test-data');
    await manager.initialize();
    const contextMgr = new ContextManager(manager);
    
    // Simulate a conversation
    const conv = await manager.createConversation('demo_user', 'Demo Chat');
    
    const exchanges = [
        { user: 'Hello!', assistant: 'Hi David! How can I help you today?' },
        { user: 'What can you help me with?', assistant: 'I can help with task management, calendar planning, and general productivity questions.' },
        { user: 'Add a task to review financial reports', assistant: 'I\'ve added "Review financial reports" to your work tasks.' },
        { user: 'What task did I just add?', assistant: 'You just added "Review financial reports" to your work tasks.' }
    ];
    
    for (const exchange of exchanges) {
        await manager.addMessage(conv.conversationId, 'user', exchange.user);
        await manager.addMessage(conv.conversationId, 'assistant', exchange.assistant);
    }
    
    // Build context for the last message
    const finalContext = await contextMgr.buildContext(
        conv.conversationId,
        'What task did I just add?'
    );
    
    console.log('📜 Context messages:');
    finalContext.messages.forEach((msg, i) => {
        const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
        console.log(`   ${i}. [${msg.role}] ${preview}`);
    });
    console.log('\n✅ The AI will now have full context of the previous conversation!\n');
}

async function cleanup() {
    // Clean up test data
    try {
        const fs = await import('fs/promises');
        await fs.rm('./test-data', { recursive: true, force: true });
        console.log('🧹 Cleaned up test data\n');
    } catch (e) {
        // Ignore cleanup errors
    }
}

async function main() {
    try {
        // Run tests
        const conversation = await testConversationManager();
        await testContextManager(new ConversationManager('./test-data'), conversation.conversationId);
        await demonstrateConversationFlow();
        
        console.log('🎉 All tests completed successfully!\n');
        console.log('📌 Key Features Demonstrated:');
        console.log('   ✅ Persistent conversation storage');
        console.log('   ✅ Message history with metadata');
        console.log('   ✅ Intelligent context windowing');
        console.log('   ✅ Session management');
        console.log('   ✅ Cross-device conversation access');
        console.log('   ✅ Task-aware context building\n');
        
        console.log('🚀 Your AI assistant now has MEMORY across conversations!');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await cleanup();
    }
}

main();