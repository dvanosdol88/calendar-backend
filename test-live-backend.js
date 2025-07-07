import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🧪 Testing Live Backend for List Management\n');

async function testListManagement() {
    try {
        // First, let's see what tasks exist
        console.log('1️⃣ Getting current tasks...');
        const tasksResponse = await axios.get(`${API_BASE}/api/tasks`);
        console.log('Current tasks:', JSON.stringify(tasksResponse.data, null, 2));
        
        // Test the AI endpoint directly
        console.log('\n2️⃣ Testing AI list command...');
        const aiResponse = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Please delete greek yogurt from the grocery list and add apples",
            sessionId: "test_session_123"
        });
        
        console.log('AI Response:', JSON.stringify(aiResponse.data, null, 2));
        
        // Check tasks again to see if anything changed
        console.log('\n3️⃣ Checking tasks after AI command...');
        const tasksAfter = await axios.get(`${API_BASE}/api/tasks`);
        console.log('Tasks after:', JSON.stringify(tasksAfter.data, null, 2));
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testListManagement();