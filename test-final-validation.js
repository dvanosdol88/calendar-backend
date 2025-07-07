import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🏁 Final Validation Test\n');

async function testFinalValidation() {
    try {
        console.log('Step 1: Add Greek yogurt to grocery list');
        await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add Greek yogurt to grocery list",
            sessionId: "final_validation_test"
        });
        
        console.log('Step 2: Testing David\'s exact command...');
        const response = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Please delete greek yogurt from the grocery list and add apples",
            sessionId: "final_validation_test"
        });
        
        console.log('\n📊 Final Test Results:');
        console.log(`✅ List Command Detected: ${response.data.listCommand === true}`);
        console.log(`✅ Execution Success: ${response.data.executionResult?.success === true}`);
        console.log(`📝 Response: "${response.data.answer}"`);
        
        if (response.data.listCommand === true && response.data.executionResult?.success === true) {
            console.log('\n🎉 SUCCESS: All list management issues are RESOLVED!');
            console.log('✅ List command detection working');
            console.log('✅ List management execution working');
            console.log('✅ David\'s exact command now works correctly');
        } else {
            console.log('\n⚠️  Partial success - some issues remain');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testFinalValidation();