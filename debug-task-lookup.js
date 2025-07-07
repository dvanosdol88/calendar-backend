import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🔍 Debugging Task Lookup\n');

async function debugTaskLookup() {
    try {
        // Check what tasks actually exist
        console.log('📋 Checking all tasks...');
        const tasksResponse = await axios.get(`${API_BASE}/api/tasks`);
        
        console.log('All tasks:');
        console.log(JSON.stringify(tasksResponse.data, null, 2));
        
        // Look for grocery lists specifically
        const allTasks = tasksResponse.data.data;
        let groceryLists = [];
        
        for (const [taskType, tasks] of Object.entries(allTasks)) {
            for (const task of tasks) {
                if (task.text.toLowerCase().includes('grocery')) {
                    groceryLists.push({
                        taskType,
                        task: task
                    });
                }
            }
        }
        
        console.log('\n🛒 Found grocery lists:');
        console.log(JSON.stringify(groceryLists, null, 2));
        
        if (groceryLists.length === 0) {
            console.log('❌ No grocery lists found!');
        } else {
            console.log(`✅ Found ${groceryLists.length} grocery list(s)`);
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

debugTaskLookup();