import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🧪 Testing Production Analysis Deep Dive\n');

async function testAnalysis() {
    try {
        // Test a simple list command that should definitely be detected
        console.log('1️⃣ Testing simple list command...');
        const simpleResponse = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add apples to grocery list",
            sessionId: "test_simple_list"
        });
        
        console.log('Simple list command response:');
        console.log(`Task Command: ${simpleResponse.data.taskCommand}`);
        console.log(`Response: "${simpleResponse.data.answer}"`);
        
        // Test a calendar command to see if ANY command detection works
        console.log('\n2️⃣ Testing calendar command...');
        const calendarResponse = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add meeting tomorrow at 2pm",
            sessionId: "test_calendar"
        });
        
        console.log('Calendar command response:');
        console.log(`Task Command: ${calendarResponse.data.taskCommand}`);
        console.log(`Calendar Command: ${calendarResponse.data.calendarCommand || false}`);
        console.log(`Response: "${calendarResponse.data.answer}"`);
        
        // Test a task command to see if task detection works
        console.log('\n3️⃣ Testing task command...');
        const taskResponse = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add review documents to my work tasks",
            sessionId: "test_task"
        });
        
        console.log('Task command response:');
        console.log(`Task Command: ${taskResponse.data.taskCommand}`);
        console.log(`Response: "${taskResponse.data.answer}"`);
        
        // Summary
        console.log('\n📊 SUMMARY:');
        console.log('List command detected:', simpleResponse.data.taskCommand);
        console.log('Calendar command detected:', calendarResponse.data.calendarCommand || false);
        console.log('Task command detected:', taskResponse.data.taskCommand);
        
        if (!simpleResponse.data.taskCommand && !calendarResponse.data.calendarCommand && !taskResponse.data.taskCommand) {
            console.log('❌ MAJOR ISSUE: NO command detection is working in production!');
            console.log('This suggests the analyzeTaskCommand method is failing silently.');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testAnalysis();