import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🧹 Clearing all tasks for fresh start...\n');

async function clearAllTasks() {
    try {
        // Get current tasks
        const response = await axios.get(`${API_BASE}/api/tasks`);
        const tasks = response.data.data;
        
        let deleteCount = 0;
        
        // Delete all work tasks
        if (tasks.work && tasks.work.length > 0) {
            console.log(`Deleting ${tasks.work.length} work tasks...`);
            for (const task of tasks.work) {
                await axios.delete(`${API_BASE}/api/tasks/work/${task.id}`);
                deleteCount++;
            }
        }
        
        // Delete all personal tasks
        if (tasks.personal && tasks.personal.length > 0) {
            console.log(`Deleting ${tasks.personal.length} personal tasks...`);
            for (const task of tasks.personal) {
                await axios.delete(`${API_BASE}/api/tasks/personal/${task.id}`);
                deleteCount++;
            }
        }
        
        console.log(`\n✅ Successfully deleted ${deleteCount} tasks`);
        console.log('🎯 Backend is now clean and ready for fresh start!');
        
    } catch (error) {
        console.error('Error clearing tasks:', error.response?.data || error.message);
    }
}

clearAllTasks();