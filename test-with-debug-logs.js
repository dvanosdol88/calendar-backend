import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🐛 Testing with Debug Logs\n');

async function testWithDebugLogs() {
    try {
        const sessionId = "debug_logs_test";
        
        // First ensure we have a grocery list
        console.log('1️⃣ Creating grocery list with Greek yogurt...');
        await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add Greek yogurt to grocery list",
            sessionId: sessionId
        });
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test compound command - this should trigger debug logs on server
        console.log('\n2️⃣ Testing compound command (check server logs for debug output)...');
        const response = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Please delete greek yogurt from the grocery list and add apples",
            sessionId: sessionId
        });
        
        console.log('Response:');
        console.log(`List Command: ${response.data.listCommand}`);
        console.log(`Execution Success: ${response.data.executionResult?.success}`);
        console.log(`Message: ${response.data.executionResult?.message}`);
        console.log(`AI Response: "${response.data.answer}"`);
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testWithDebugLogs();