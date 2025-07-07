#!/usr/bin/env node

/**
 * Test script for semantic task matching and ambiguity resolution
 */

import AITaskAssistant from './ai-task-assistant.js';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';
const assistant = new AITaskAssistant(API_BASE);

console.log('🧪 Testing Semantic Task Matching and Ambiguity Resolution\n');

async function setupTestTasks() {
    console.log('📝 Setting up test tasks...');
    
    const testTasks = [
        { type: 'work', text: 'YMCA board meeting preparation' },
        { type: 'personal', text: 'YMCA gym membership renewal' },
        { type: 'work', text: 'Review Q4 financial reports' },
        { type: 'personal', text: 'Plan weekend YMCA volunteer work' },
        { type: 'work', text: 'Meeting with client tomorrow' },
        { type: 'personal', text: 'Buy groceries for the week' }
    ];
    
    // Clear existing tasks first
    try {
        const response = await axios.get(`${API_BASE}/api/tasks`);
        const allTasks = response.data.data;
        
        for (const [type, tasks] of Object.entries(allTasks)) {
            for (const task of tasks) {
                await axios.delete(`${API_BASE}/api/tasks/${type}/${task.id}`);
            }
        }
    } catch (e) {
        console.log('No existing tasks to clear');
    }
    
    // Add test tasks
    for (const task of testTasks) {
        try {
            await axios.post(`${API_BASE}/api/tasks/${task.type}`, { text: task.text });
            console.log(`  ✅ Added ${task.type}: "${task.text}"`);
        } catch (e) {
            console.log(`  ❌ Failed to add task: ${e.message}`);
        }
    }
    
    console.log('\n');
}

async function testSemanticMatching() {
    console.log('🔍 Testing semantic matching scenarios:\n');
    
    const tests = [
        {
            name: 'Single YMCA match (should work)',
            command: 'YMCA task completed',
            expectAmbiguous: true // Multiple YMCA tasks exist
        },
        {
            name: 'Specific YMCA match',
            command: 'YMCA gym completed',
            expectAmbiguous: false // Only one gym task
        },
        {
            name: 'Meeting match',
            command: 'meeting task done',
            expectAmbiguous: true // Board meeting + client meeting
        },
        {
            name: 'Unique grocery match',
            command: 'grocery task completed',
            expectAmbiguous: false // Only one grocery task
        },
        {
            name: 'Q4 match',
            command: 'Q4 task finished',
            expectAmbiguous: false // Only one Q4 task
        }
    ];
    
    for (const test of tests) {
        console.log(`📋 ${test.name}`);
        console.log(`   Command: "${test.command}"`);
        
        try {
            const result = await assistant.processUserInput(test.command);
            
            if (result.isTaskCommand) {
                const execution = result.executionResult;
                
                if (execution.requiresClarification) {
                    console.log(`   ✅ Correctly identified ambiguity`);
                    console.log(`   📝 Clarification options:`);
                    execution.matches.forEach((match, i) => {
                        console.log(`      ${String.fromCharCode(65 + i)}. ${match.text} (${match.type})`);
                    });
                    
                    if (!test.expectAmbiguous) {
                        console.log(`   ⚠️  Expected single match but got ambiguity`);
                    }
                } else if (execution.success) {
                    console.log(`   ✅ Successfully executed: ${execution.message}`);
                    
                    if (test.expectAmbiguous) {
                        console.log(`   ⚠️  Expected ambiguity but got single match`);
                    }
                } else {
                    console.log(`   ❌ Failed: ${execution.message}`);
                }
            } else {
                console.log(`   ❌ Not recognized as task command`);
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }
        
        console.log('');
    }
}

async function testClarificationFlow() {
    console.log('🔄 Testing clarification flow:\n');
    
    console.log('1️⃣ First command: "YMCA task completed"');
    const firstResult = await assistant.processUserInput('YMCA task completed');
    
    if (firstResult.executionResult.requiresClarification) {
        console.log('✅ Got clarification request:');
        console.log(firstResult.executionResult.message);
        
        console.log('\n2️⃣ Clarification response: "A"');
        const clarificationContext = {
            action: 'complete',
            matches: firstResult.executionResult.matches
        };
        
        const secondResult = await assistant.processUserInput('A', clarificationContext);
        console.log('✅ Clarification result:', secondResult.executionResult.message);
    } else {
        console.log('❌ Expected clarification but got direct result');
    }
}

async function runTests() {
    try {
        await setupTestTasks();
        await testSemanticMatching();
        await testClarificationFlow();
        
        console.log('🎉 All tests completed!');
        console.log('\n💡 Try these commands in your dashboard:');
        console.log('   • "YMCA task completed"');
        console.log('   • "meeting done"'); 
        console.log('   • "grocery task finished"');
        console.log('   • Then respond with A, B, C when prompted');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.log('\n🔧 Make sure your server is running on localhost:3000');
    }
}

// Check if server is running
async function checkServer() {
    try {
        await axios.get(`${API_BASE}/api/tasks`);
        console.log('✅ Server is running\n');
        return true;
    } catch (e) {
        console.log('❌ Server not running. Please start with: npm start\n');
        return false;
    }
}

async function main() {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await runTests();
    }
}

main();