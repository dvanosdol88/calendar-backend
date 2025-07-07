import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🛒 Testing Simple List Add\n');

async function testSimpleListAdd() {
    try {
        // Test a simple add command
        console.log('Testing simple add: "Add bread to grocery list"');
        
        const response = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add bread to grocery list",
            sessionId: "test_simple_add"
        });
        
        console.log('\n📊 Response Analysis:');
        console.log(`Task Command: ${response.data.taskCommand}`);
        console.log(`Calendar Command: ${response.data.calendarCommand || false}`);
        console.log(`List Command: ${response.data.listCommand || false}`);
        console.log(`Execution Result:`, response.data.executionResult);
        console.log(`Response: "${response.data.answer}"`);
        
        // Check if list management is working
        if (response.data.listCommand === true) {
            console.log('\n✅ List command detection: WORKING');
            
            if (response.data.executionResult && response.data.executionResult.success) {
                console.log('✅ List management execution: WORKING');
            } else {
                console.log('❌ List management execution: NEEDS DEBUGGING');
                console.log('Execution result:', response.data.executionResult);
            }
        } else {
            console.log('\n❌ List command detection: NOT WORKING');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testSimpleListAdd();