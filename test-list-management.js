#!/usr/bin/env node

/**
 * Test Script for List Management System
 * 
 * This script tests the enhanced list management functionality
 * to ensure David's grocery list scenario works correctly.
 */

import AITaskAssistant from './ai-task-assistant.js';
import ListManagementSystem from './list-management-system.js';
import { loadTasks, saveTasks } from './task-storage.js';

class ListManagementTester {
    constructor() {
        this.assistant = new AITaskAssistant();
        this.listSystem = new ListManagementSystem();
    }

    async runTests() {
        console.log('🧪 Starting List Management System Tests\n');

        try {
            // Test 1: Create a grocery list with initial items
            await this.testCreateGroceryList();
            
            // Test 2: Test David's specific scenario
            await this.testDavidScenario();
            
            // Test 3: Test various list commands
            await this.testListCommands();
            
            // Test 4: Test error handling
            await this.testErrorHandling();
            
            console.log('\n✅ All tests completed successfully!');
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    async testCreateGroceryList() {
        console.log('📝 Test 1: Creating a grocery list with initial items...');
        
        // Create a grocery list task with sub-items
        const result = await this.assistant.processUserInput('Create a grocery list with Greek yogurt, milk, bread, and apples');
        
        console.log('Result:', JSON.stringify(result, null, 2));
        console.log('✅ Grocery list creation test completed\n');
    }

    async testDavidScenario() {
        console.log('🎯 Test 2: David\'s specific scenario...');
        
        // First, let's get the current tasks to see the grocery list
        const currentTasks = await this.assistant.getCurrentTasks();
        console.log('Current tasks before changes:', currentTasks);
        
        // Step 1: Remove Greek yogurt from grocery list
        console.log('\n📋 Removing Greek yogurt from grocery list...');
        const removeResult = await this.assistant.processUserInput('Please take Greek yogurt off the grocery list');
        console.log('Remove result:', JSON.stringify(removeResult, null, 2));
        
        // Step 2: Add apples to grocery list
        console.log('\n📋 Adding apples to grocery list...');
        const addResult = await this.assistant.processUserInput('Add apples to the grocery list');
        console.log('Add result:', JSON.stringify(addResult, null, 2));
        
        // Verify final state
        const finalTasks = await this.assistant.getCurrentTasks();
        console.log('\nFinal tasks after changes:', finalTasks);
        
        console.log('✅ David scenario test completed\n');
    }

    async testListCommands() {
        console.log('🔧 Test 3: Testing various list commands...');
        
        const commands = [
            'Show my grocery list',
            'What\'s on my grocery list?',
            'Mark milk as bought from grocery list',
            'Add bananas to grocery list',
            'Remove bread from grocery list'
        ];
        
        for (const command of commands) {
            console.log(`\n🎤 Testing command: "${command}"`);
            const result = await this.assistant.processUserInput(command);
            
            if (result.isListCommand) {
                console.log('✅ Recognized as list command');
                console.log('Execution result:', result.executionResult?.message || 'No message');
                console.log('AI Response:', result.aiResponse);
            } else {
                console.log('⚠️ Not recognized as list command');
                console.log('Analysis:', result.commandAnalysis);
            }
        }
        
        console.log('✅ List commands test completed\n');
    }

    async testErrorHandling() {
        console.log('⚠️ Test 4: Testing error handling...');
        
        const errorCommands = [
            'Remove chocolate from grocery list',  // Item not in list
            'Add items to shopping list',         // List doesn't exist
            'Mark cookies as done'                // Ambiguous command
        ];
        
        for (const command of errorCommands) {
            console.log(`\n🎤 Testing error case: "${command}"`);
            const result = await this.assistant.processUserInput(command);
            console.log('Result:', result.executionResult?.message || result.message || 'No message');
        }
        
        console.log('✅ Error handling test completed\n');
    }

    async resetTestData() {
        console.log('🔄 Resetting test data...');
        
        // Reset tasks to empty state for testing
        const emptyTasks = {
            work: [],
            personal: [],
            lastUpdated: new Date().toISOString()
        };
        
        await saveTasks(emptyTasks);
        console.log('✅ Test data reset completed\n');
    }
}

// Helper function to analyze list commands directly
async function testListCommandAnalysis() {
    console.log('🔍 Testing list command analysis...');
    
    const assistant = new AITaskAssistant();
    const testCommands = [
        'Please take Greek yogurt off the grocery list',
        'Add apples to grocery list',
        'Remove Greek yogurt from grocery list',
        'Mark milk as bought from grocery list',
        'Show my grocery list',
        'What\'s on my shopping list?',
        'Create grocery list with milk, bread, eggs'
    ];
    
    for (const command of testCommands) {
        console.log(`\n📝 Analyzing: "${command}"`);
        const analysis = await assistant.analyzeTaskCommand(command);
        console.log('Analysis result:', JSON.stringify(analysis, null, 2));
    }
}

// Run the tests
async function main() {
    console.log('🚀 List Management System Test Suite\n');
    
    // First test command analysis
    await testListCommandAnalysis();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Then run comprehensive tests
    const tester = new ListManagementTester();
    
    // Reset test data first
    await tester.resetTestData();
    
    // Run all tests
    await tester.runTests();
}

// Check if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default ListManagementTester;