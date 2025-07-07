import AITaskAssistant from './ai-task-assistant.js';
import axios from 'axios';

/**
 * Test script for the AI Task Assistant
 * 
 * This script demonstrates how to use the AI task assistant to process
 * natural language task commands and integrate with the task management system.
 */

const BASE_URL = 'http://localhost:3000';

// Test commands to demonstrate the AI assistant capabilities
const testCommands = [
    // Adding tasks
    "Add 'Review Q4 reports' to my work tasks",
    "Create a personal task to buy groceries",
    "Add 'Call client about project' to work list",
    
    // Completing tasks
    "Mark 'Review Q4 reports' as done",
    "Complete the grocery task",
    "Finish the client call task",
    
    // Listing tasks
    "What's on my work task list?",
    "Show me my personal tasks",
    "List all my tasks",
    
    // Editing tasks
    "Change 'buy groceries' to 'buy groceries and milk'",
    "Update the client call task to include follow-up",
    
    // Deleting tasks
    "Delete the grocery task",
    "Remove the client call from my work tasks",
    
    // Status queries
    "How many tasks do I have?",
    "What's my task completion status?",
    
    // Non-task commands (should not be processed as tasks)
    "What's the weather today?",
    "How do I cook pasta?",
    "Tell me about artificial intelligence"
];

/**
 * Test the AI assistant with a single command
 */
async function testSingleCommand(command) {
    console.log(`\n🧪 Testing: "${command}"`);
    console.log('=' .repeat(50));
    
    try {
        const response = await axios.post(`${BASE_URL}/ai/task`, {
            input: command
        });
        
        const result = response.data.data;
        
        console.log(`✅ Task Command: ${result.isTaskCommand}`);
        
        if (result.isTaskCommand) {
            console.log(`📋 Action: ${result.commandAnalysis.action}`);
            console.log(`🎯 Confidence: ${result.commandAnalysis.confidence}%`);
            console.log(`✨ AI Response: ${result.aiResponse}`);
            console.log(`🔧 Execution Success: ${result.executionResult.success}`);
            console.log(`💬 Message: ${result.executionResult.message}`);
        } else {
            console.log(`💭 Response: ${result.message}`);
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    }
}

/**
 * Test the enhanced /ask-gpt endpoint
 */
async function testAskGPTEndpoint() {
    console.log('\n🚀 Testing Enhanced /ask-gpt Endpoint');
    console.log('=' .repeat(50));
    
    const testPrompts = [
        "Add 'Prepare presentation' to my work tasks",
        "What tasks do I have for today?",
        "How can I better organize my calendar?",
        "Show me my task completion progress"
    ];
    
    for (const prompt of testPrompts) {
        console.log(`\n🧪 Testing: "${prompt}"`);
        
        try {
            const response = await axios.post(`${BASE_URL}/ask-gpt`, {
                prompt: prompt
            });
            
            console.log(`✅ Task Command: ${response.data.taskCommand}`);
            console.log(`💬 Answer: ${response.data.answer}`);
            
            if (response.data.taskCommand && response.data.executionResult) {
                console.log(`🔧 Execution Success: ${response.data.executionResult.success}`);
            }
            
        } catch (error) {
            console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
        }
    }
}

/**
 * Test the analysis endpoint
 */
async function testAnalysisEndpoint() {
    console.log('\n🔍 Testing Analysis Endpoint');
    console.log('=' .repeat(50));
    
    const testInputs = [
        "Add task to work list",
        "What's the weather?",
        "Mark meeting as complete",
        "How do I cook pasta?"
    ];
    
    for (const input of testInputs) {
        console.log(`\n🧪 Analyzing: "${input}"`);
        
        try {
            const response = await axios.post(`${BASE_URL}/ai/task/analyze`, {
                input: input
            });
            
            const analysis = response.data.data;
            console.log(`✅ Is Task Command: ${analysis.isTaskCommand}`);
            console.log(`🎯 Confidence: ${analysis.confidence}%`);
            
            if (analysis.isTaskCommand) {
                console.log(`📋 Action: ${analysis.action}`);
                console.log(`🏷️ Task Type: ${analysis.taskType || 'auto-detect'}`);
                console.log(`📝 Task Text: ${analysis.taskText || 'N/A'}`);
            }
            
        } catch (error) {
            console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
        }
    }
}

/**
 * Test help and status endpoints
 */
async function testInfoEndpoints() {
    console.log('\n📚 Testing Info Endpoints');
    console.log('=' .repeat(50));
    
    try {
        // Test help endpoint
        console.log('\n🆘 Help Endpoint:');
        const helpResponse = await axios.get(`${BASE_URL}/ai/task/help`);
        console.log(`✅ Commands available: ${helpResponse.data.data.supportedCommands.length}`);
        
        // Test status endpoint
        console.log('\n📊 Status Endpoint:');
        const statusResponse = await axios.get(`${BASE_URL}/ai/task/status`);
        console.log(`✅ System Status: ${statusResponse.data.data.status}`);
        console.log(`🔑 OpenAI Configured: ${statusResponse.data.data.openaiConfigured}`);
        console.log(`🧪 Test Analysis Working: ${statusResponse.data.data.testAnalysis}`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🤖 AI Task Assistant - Comprehensive Test Suite');
    console.log('=' .repeat(60));
    
    try {
        // Test info endpoints first
        await testInfoEndpoints();
        
        // Test analysis endpoint
        await testAnalysisEndpoint();
        
        // Test a few key commands
        console.log('\n🎯 Testing Key Commands');
        console.log('=' .repeat(50));
        
        await testSingleCommand("Add 'Test task' to work tasks");
        await testSingleCommand("What are my work tasks?");
        await testSingleCommand("Mark 'Test task' as complete");
        await testSingleCommand("How many tasks do I have?");
        
        // Test enhanced ask-gpt endpoint
        await testAskGPTEndpoint();
        
        console.log('\n✅ All tests completed!');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
    }
}

/**
 * Interactive test mode
 */
async function interactiveMode() {
    console.log('\n🎮 Interactive Mode - Enter your commands (type "exit" to quit)');
    console.log('=' .repeat(60));
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askQuestion = () => {
        readline.question('\n💬 You: ', async (input) => {
            if (input.toLowerCase() === 'exit') {
                console.log('\n👋 Goodbye!');
                readline.close();
                return;
            }
            
            await testSingleCommand(input);
            askQuestion();
        });
    };
    
    askQuestion();
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const mode = process.argv[2] || 'all';
    
    switch (mode) {
        case 'interactive':
            interactiveMode();
            break;
        case 'help':
            testInfoEndpoints();
            break;
        case 'analysis':
            testAnalysisEndpoint();
            break;
        case 'askgpt':
            testAskGPTEndpoint();
            break;
        default:
            runAllTests();
    }
}

export { testSingleCommand, testAskGPTEndpoint, testAnalysisEndpoint, testInfoEndpoints };