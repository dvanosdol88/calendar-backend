#!/usr/bin/env node

/**
 * Test API Integration for List Management
 * 
 * Tests the API endpoints for list management functionality
 */

import express from 'express';
import taskApiRoutes from './task-api.js';
import { saveTasks } from './task-storage.js';

// Create a test server
const app = express();
app.use(express.json());
app.use(taskApiRoutes);

const server = app.listen(3001, () => {
    console.log('🚀 Test server started on port 3001');
});

async function makeRequest(method, path, data = null) {
    const fetch = (await import('node-fetch')).default;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`http://localhost:3001${path}`, options);
        const result = await response.json();
        return { status: response.status, data: result };
    } catch (error) {
        console.error('Request failed:', error.message);
        return { status: 500, error: error.message };
    }
}

async function resetTestData() {
    console.log('🔄 Resetting test data...');
    
    const emptyTasks = {
        work: [],
        personal: [],
        lastUpdated: new Date().toISOString()
    };
    
    await saveTasks(emptyTasks);
    console.log('✅ Test data reset completed\n');
}

async function testApiEndpoints() {
    console.log('🧪 Testing API endpoints...\n');
    
    // Test 1: Create a grocery list task with sub-items
    console.log('1️⃣ Creating grocery list task with sub-items...');
    const createResponse = await makeRequest('POST', '/api/tasks/personal', {
        text: 'Grocery List',
        subItems: ['Greek yogurt', 'Milk', 'Bread', 'Eggs']
    });
    
    console.log('Status:', createResponse.status);
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));
    
    if (!createResponse.data.success) {
        throw new Error('Failed to create grocery list');
    }
    
    const taskId = createResponse.data.data.id;
    console.log('✅ Created task with ID:', taskId);
    
    // Test 2: Add item to list
    console.log('\n2️⃣ Adding apples to grocery list...');
    const addResponse = await makeRequest('POST', `/api/tasks/personal/${taskId}/items`, {
        text: 'Apples'
    });
    
    console.log('Status:', addResponse.status);
    console.log('Response:', JSON.stringify(addResponse.data, null, 2));
    
    // Test 3: Remove item from list
    console.log('\n3️⃣ Removing Greek yogurt from grocery list...');
    const removeResponse = await makeRequest('DELETE', `/api/tasks/personal/${taskId}/items/Greek%20yogurt`);
    
    console.log('Status:', removeResponse.status);
    console.log('Response:', JSON.stringify(removeResponse.data, null, 2));
    
    // Test 4: Toggle item completion
    console.log('\n4️⃣ Marking milk as bought...');
    const toggleResponse = await makeRequest('PATCH', `/api/tasks/personal/${taskId}/items/Milk/toggle`);
    
    console.log('Status:', toggleResponse.status);
    console.log('Response:', JSON.stringify(toggleResponse.data, null, 2));
    
    // Test 5: Get final state
    console.log('\n5️⃣ Getting final task state...');
    const getResponse = await makeRequest('GET', '/api/tasks/personal');
    
    console.log('Status:', getResponse.status);
    console.log('Final state:', JSON.stringify(getResponse.data, null, 2));
    
    return taskId;
}

async function testDavidScenarioWithApi(taskId) {
    console.log('\n🎯 Testing David\'s scenario with API...');
    
    // David's request: "Please take 'Greek yogurt' off the grocery list and add Apples"
    
    // Step 1: Remove Greek yogurt
    console.log('📝 API Call: Remove Greek yogurt');
    const removeResponse = await makeRequest('DELETE', `/api/tasks/personal/${taskId}/items/Greek%20yogurt`);
    console.log('Remove result:', removeResponse.data.message);
    
    // Step 2: Add Apples
    console.log('\n📝 API Call: Add Apples');
    const addResponse = await makeRequest('POST', `/api/tasks/personal/${taskId}/items`, {
        text: 'Apples'
    });
    console.log('Add result:', addResponse.data.message);
    
    // Step 3: Show final state
    console.log('\n📋 Final grocery list state:');
    const finalResponse = await makeRequest('GET', '/api/tasks/personal');
    
    if (finalResponse.data.success) {
        const groceryTask = finalResponse.data.data.personal.find(task => task.id === taskId);
        if (groceryTask && groceryTask.subItems) {
            console.log(`\n${groceryTask.text}:`);
            groceryTask.subItems.forEach(item => {
                console.log(`  ${item.completed ? '✓' : '○'} ${item.text}`);
            });
        }
    }
}

async function testErrorHandling() {
    console.log('\n⚠️ Testing API error handling...');
    
    // Test invalid task type
    console.log('\n1️⃣ Testing invalid task type...');
    const invalidTypeResponse = await makeRequest('POST', '/api/tasks/invalid', {
        text: 'Test Task'
    });
    console.log('Status:', invalidTypeResponse.status);
    console.log('Error:', invalidTypeResponse.data.error);
    
    // Test missing task text
    console.log('\n2️⃣ Testing missing task text...');
    const missingTextResponse = await makeRequest('POST', '/api/tasks/personal', {});
    console.log('Status:', missingTextResponse.status);
    console.log('Error:', missingTextResponse.data.error);
    
    // Test adding item to non-existent task
    console.log('\n3️⃣ Testing add item to non-existent task...');
    const invalidTaskResponse = await makeRequest('POST', '/api/tasks/personal/invalid-id/items', {
        text: 'Test Item'
    });
    console.log('Status:', invalidTaskResponse.status);
    console.log('Error:', invalidTaskResponse.data.error);
}

async function main() {
    console.log('🚀 API Integration Test Suite\n');
    
    try {
        // Reset test environment
        await resetTestData();
        
        // Test API endpoints
        const taskId = await testApiEndpoints();
        
        console.log('\n' + '='.repeat(60));
        
        // Reset and test David's scenario via API
        await resetTestData();
        
        // Create initial grocery list
        const createResponse = await makeRequest('POST', '/api/tasks/personal', {
            text: 'Grocery List',
            subItems: ['Greek yogurt', 'Milk', 'Bread', 'Eggs']
        });
        
        const newTaskId = createResponse.data.data.id;
        await testDavidScenarioWithApi(newTaskId);
        
        console.log('\n' + '='.repeat(60));
        
        // Test error handling
        await testErrorHandling();
        
        console.log('\n✅ All API tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    } finally {
        // Close the test server
        server.close(() => {
            console.log('🛑 Test server stopped');
        });
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}