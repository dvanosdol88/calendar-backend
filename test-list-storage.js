#!/usr/bin/env node

/**
 * Test List Storage Functionality (without AI)
 * 
 * Tests the core list management storage functionality
 * without requiring OpenAI API keys.
 */

import { addTask, loadTasks, saveTasks, addItemToList, removeItemFromList, toggleSubItem } from './task-storage.js';

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

async function testSubItemOperations() {
    console.log('🧪 Testing sub-item operations...\n');
    
    // Step 1: Create a grocery list with initial items
    console.log('1️⃣ Creating grocery list with sub-items...');
    const groceryList = await addTask('personal', 'Grocery List', [
        'Greek yogurt',
        'Milk',
        'Bread',
        'Eggs'
    ]);
    
    console.log('✅ Created grocery list:', JSON.stringify(groceryList, null, 2));
    
    // Step 2: Add a new item (Apples)
    console.log('\n2️⃣ Adding apples to grocery list...');
    const addedItem = await addItemToList('personal', groceryList.id, 'Apples');
    console.log('✅ Added item:', JSON.stringify(addedItem, null, 2));
    
    // Step 3: Remove Greek yogurt
    console.log('\n3️⃣ Removing Greek yogurt from grocery list...');
    const removedItem = await removeItemFromList('personal', groceryList.id, 'Greek yogurt');
    console.log('✅ Removed item:', JSON.stringify(removedItem, null, 2));
    
    // Step 4: Toggle milk as completed
    console.log('\n4️⃣ Marking milk as bought...');
    const toggledItem = await toggleSubItem('personal', groceryList.id, 'Milk');
    console.log('✅ Toggled item:', JSON.stringify(toggledItem, null, 2));
    
    // Step 5: Show final state
    console.log('\n5️⃣ Final state of all tasks...');
    const allTasks = await loadTasks();
    console.log('✅ All tasks:', JSON.stringify(allTasks, null, 2));
    
    return groceryList.id;
}

async function testDavidScenarioSimulation(taskId) {
    console.log('\n🎯 Simulating David\'s scenario...');
    
    // David's request: "Please take 'Greek yogurt' off the grocery list and add Apples"
    
    console.log('📝 Simulating: Remove Greek yogurt from grocery list');
    const removeResult = await removeItemFromList('personal', taskId, 'Greek yogurt');
    console.log('Result:', removeResult ? `Removed: ${removeResult.text}` : 'Item not found');
    
    console.log('\n📝 Simulating: Add Apples to grocery list');
    const addResult = await addItemToList('personal', taskId, 'Apples');
    console.log('Result:', addResult ? `Added: ${addResult.text}` : 'Failed to add');
    
    // Show final result
    console.log('\n📋 Final grocery list state:');
    const allTasks = await loadTasks();
    const groceryTask = allTasks.personal.find(task => task.id === taskId);
    
    if (groceryTask && groceryTask.subItems) {
        console.log(`\n${groceryTask.text}:`);
        groceryTask.subItems.forEach(item => {
            console.log(`  ${item.completed ? '✓' : '○'} ${item.text}`);
        });
    }
}

async function testErrorCases() {
    console.log('\n⚠️ Testing error cases...');
    
    // Test removing non-existent item
    console.log('\n1️⃣ Testing remove non-existent item...');
    const noRemove = await removeItemFromList('personal', 'invalid-id', 'chocolate');
    console.log('Result:', noRemove ? 'Unexpected success' : 'Correctly failed');
    
    // Test adding to non-existent task
    console.log('\n2️⃣ Testing add to non-existent task...');
    const noAdd = await addItemToList('personal', 'invalid-id', 'test item');
    console.log('Result:', noAdd ? 'Unexpected success' : 'Correctly failed');
    
    // Test toggle non-existent item
    console.log('\n3️⃣ Testing toggle non-existent item...');
    const noToggle = await toggleSubItem('personal', 'invalid-id', 'test item');
    console.log('Result:', noToggle ? 'Unexpected success' : 'Correctly failed');
}

async function testListFormats() {
    console.log('\n📝 Testing different list formats...');
    
    // Test comma-separated format
    console.log('1️⃣ Testing comma-separated list creation...');
    const list1 = await addTask('personal', 'Shopping List: milk, bread, eggs');
    console.log('Created task:', list1.text);
    
    // Test bullet format simulation
    console.log('\n2️⃣ Testing list with individual items...');
    const list2 = await addTask('personal', 'Reading List', [
        'The Great Gatsby',
        'To Kill a Mockingbird',
        '1984'
    ]);
    console.log('Created reading list with', list2.subItems.length, 'books');
    
    // Test mixed operations
    console.log('\n3️⃣ Testing mixed operations on reading list...');
    await addItemToList('personal', list2.id, 'Animal Farm');
    await toggleSubItem('personal', list2.id, '1984');
    await removeItemFromList('personal', list2.id, 'The Great Gatsby');
    
    // Show final state
    const updatedTasks = await loadTasks();
    const readingList = updatedTasks.personal.find(t => t.id === list2.id);
    console.log('\nFinal reading list:');
    readingList.subItems.forEach(item => {
        console.log(`  ${item.completed ? '✓' : '○'} ${item.text}`);
    });
}

async function main() {
    console.log('🚀 List Storage System Test Suite\n');
    
    try {
        // Reset test environment
        await resetTestData();
        
        // Test core sub-item operations
        const taskId = await testSubItemOperations();
        
        console.log('\n' + '='.repeat(60));
        
        // Reset and test David's scenario
        await resetTestData();
        const groceryList = await addTask('personal', 'Grocery List', [
            'Greek yogurt',
            'Milk',
            'Bread',
            'Eggs'
        ]);
        await testDavidScenarioSimulation(groceryList.id);
        
        console.log('\n' + '='.repeat(60));
        
        // Test error cases
        await testErrorCases();
        
        console.log('\n' + '='.repeat(60));
        
        // Test different list formats
        await resetTestData();
        await testListFormats();
        
        console.log('\n✅ All storage tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}