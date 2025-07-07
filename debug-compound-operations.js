import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🔍 Debugging Compound Operations\n');

async function debugCompoundOperations() {
    try {
        const sessionId = "debug_compound_ops";
        
        // Step 1: Create grocery list with Greek yogurt
        console.log('1️⃣ Creating grocery list with Greek yogurt...');
        const step1 = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add Greek yogurt to grocery list",
            sessionId: sessionId
        });
        
        console.log(`✅ Greek yogurt added: ${step1.data.executionResult?.success}`);
        
        // Step 2: Test compound command with detailed logging
        console.log('\n2️⃣ Testing compound command...');
        const step2 = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Please delete greek yogurt from the grocery list and add apples",
            sessionId: sessionId
        });
        
        console.log('📊 Compound Operation Results:');
        console.log(`List Command Detected: ${step2.data.listCommand}`);
        console.log(`Execution Success: ${step2.data.executionResult?.success}`);
        console.log(`Execution Message: ${step2.data.executionResult?.message}`);
        console.log(`Operations:`, step2.data.executionResult?.operations);
        console.log(`AI Response: "${step2.data.answer}"`);
        
        // Step 3: Check what's actually in the grocery list
        console.log('\n3️⃣ Checking grocery list contents...');
        const step3 = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Show me my grocery list",
            sessionId: sessionId
        });
        
        console.log(`List Contents: "${step3.data.answer}"`);
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

debugCompoundOperations();