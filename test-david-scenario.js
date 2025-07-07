#!/usr/bin/env node

/**
 * Test David's Specific Scenario
 * 
 * Tests the exact request: "Please take 'Greek yogurt' off the grocery list and add Apples"
 */

import AITaskAssistant from './ai-task-assistant.js';
import { addTask, loadTasks, saveTasks } from './task-storage.js';

async function setupTestData() {
    console.log('🔧 Setting up test data...');
    
    // Create a grocery list task with Greek yogurt, milk, and bread
    const groceryList = await addTask('personal', 'Grocery List', [
        'Greek yogurt',
        'Milk', 
        'Bread',
        'Eggs'
    ]);
    
    console.log('✅ Created grocery list:', groceryList);
    return groceryList;
}

async function testDavidRequest() {
    console.log('\n🎯 Testing David\'s specific request...');
    
    const assistant = new AITaskAssistant();
    
    // Test the exact command David used
    const command = "Please take 'Greek yogurt' off the grocery list and add Apples";
    console.log(`📝 Command: "${command}"`);
    
    // First, let's see how the command is analyzed
    const analysis = await assistant.analyzeTaskCommand(command);
    console.log('\n🔍 Command Analysis:', JSON.stringify(analysis, null, 2));
    
    // Process the full command
    const result = await assistant.processUserInput(command);
    console.log('\n📊 Processing Result:', JSON.stringify(result, null, 2));
    
    // Show current state of tasks
    const currentTasks = await assistant.getCurrentTasks();
    console.log('\n📋 Current Tasks State:');
    console.log(currentTasks);
    
    return result;
}

async function testIndividualCommands() {
    console.log('\n🔧 Testing individual commands...');
    
    const assistant = new AITaskAssistant();
    
    // Test removing Greek yogurt
    console.log('\n1️⃣ Testing: Remove Greek yogurt');
    const removeResult = await assistant.processUserInput('Remove Greek yogurt from grocery list');
    console.log('Remove result:', removeResult.executionResult?.message || 'No message');
    
    // Test adding apples
    console.log('\n2️⃣ Testing: Add apples');
    const addResult = await assistant.processUserInput('Add apples to grocery list');
    console.log('Add result:', addResult.executionResult?.message || 'No message');
    
    // Show final state
    const finalTasks = await assistant.getCurrentTasks();
    console.log('\n📋 Final State:');
    console.log(finalTasks);
}

async function testListManagementDirect() {
    console.log('\n🧪 Testing List Management System directly...');
    
    const assistant = new AITaskAssistant();
    const listSystem = assistant.listManagement;
    
    // Test parsing commands
    const commands = [
        "Please take 'Greek yogurt' off the grocery list and add Apples",
        "Remove Greek yogurt from grocery list",
        "Add apples to grocery list"
    ];
    
    for (const cmd of commands) {
        console.log(`\n🎤 Testing: "${cmd}"`);
        const parsed = await listSystem.parseListCommand(cmd);
        console.log('Parsed:', JSON.stringify(parsed, null, 2));
        
        if (parsed.isListCommand) {
            const processed = await listSystem.processListCommand(cmd);
            console.log('Processed:', JSON.stringify(processed, null, 2));
        }
    }
}

async function main() {
    console.log('🎬 David\'s Grocery List Scenario Test\n');
    
    try {
        // Reset and setup test data
        await setupTestData();
        
        // Test David's exact request
        await testDavidRequest();
        
        console.log('\n' + '='.repeat(50));
        
        // Reset and test individual commands
        await setupTestData();
        await testIndividualCommands();
        
        console.log('\n' + '='.repeat(50));
        
        // Test list management system directly
        await setupTestData();
        await testListManagementDirect();
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}