import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🔧 Debug API Test\n');

async function testDebug() {
    try {
        // Test the actual analyzeTaskCommand method if we had a debug endpoint
        console.log('Testing if server is responding...');
        
        const healthCheck = await axios.get(`${API_BASE}/api/capabilities`);
        console.log('✅ Server is responding');
        console.log('Anti-hallucination filter enabled:', healthCheck.data.filterEnabled);
        
        // Try with a simple list command that should definitely work
        console.log('\nTesting simple list command that should work:');
        const response = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add milk to grocery list",
            sessionId: "debug_test_123"
        });
        
        console.log('Response for "Add milk to grocery list":');
        console.log(`Task Command: ${response.data.taskCommand}`);
        console.log(`Response: "${response.data.answer}"`);
        
        if (!response.data.taskCommand) {
            console.log('❌ Even simple list commands are not being detected as task commands!');
            console.log('This suggests the analyzeTaskCommand method is failing completely.');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testDebug();