import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🧪 Testing Production Command Detection\n');

async function testCommandDetection() {
    try {
        console.log('Testing the exact command David used:');
        const testCommand = "Please delete greek yogurt from the grocery list and add apples";
        
        // Make the same request as the live test
        const response = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: testCommand,
            sessionId: "test_session_command_detection"
        });
        
        console.log('🔍 Response Analysis:');
        console.log(`Command: "${testCommand}"`);
        console.log(`Task Command: ${response.data.taskCommand}`);
        console.log(`Calendar Command: ${response.data.calendarCommand || false}`);
        console.log(`Response: "${response.data.answer}"`);
        
        // Check if it's being treated as a general response instead of a list command
        if (!response.data.taskCommand && !response.data.calendarCommand) {
            console.log('❌ ISSUE: Command is being treated as general conversation, not as a list command!');
            console.log('This explains why the list management isn\'t working.');
        } else {
            console.log('✅ Command is being properly detected as a task/calendar command');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testCommandDetection();