import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🔧 Testing List Command Fix\n');

async function testListCommandFix() {
    try {
        // Test David's exact command
        console.log('Testing David\'s exact command: "Please delete greek yogurt from the grocery list and add apples"');
        
        const response = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Please delete greek yogurt from the grocery list and add apples",
            sessionId: "test_list_fix"
        });
        
        console.log('\n📊 Response Analysis:');
        console.log(`Task Command: ${response.data.taskCommand}`);
        console.log(`Calendar Command: ${response.data.calendarCommand || false}`);
        console.log(`List Command: ${response.data.listCommand || false}`);
        console.log(`Response: "${response.data.answer}"`);
        
        // Check if the fix worked
        if (response.data.listCommand === true) {
            console.log('\n✅ SUCCESS: List command detection is working!');
        } else {
            console.log('\n❌ STILL BROKEN: List command detection not working');
            console.log('Deployment may still be in progress...');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testListCommandFix();