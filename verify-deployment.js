import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🔍 Verifying Deployment Status\n');

async function verifyDeployment() {
    try {
        const sessionId = "verify_deployment_" + Date.now();
        
        // Test 1: Simple list add
        console.log('1️⃣ Testing simple list add...');
        const test1 = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Add salmon to grocery list",
            sessionId: sessionId
        });
        console.log(`✓ List command detected: ${test1.data.listCommand}`);
        console.log(`✓ Success: ${test1.data.executionResult?.success}`);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 2: Compound operation (the critical fix)
        console.log('\n2️⃣ Testing compound operation...');
        const test2 = await axios.post(`${API_BASE}/ask-gpt`, {
            prompt: "Please delete salmon from the grocery list and add apples",
            sessionId: sessionId
        });
        
        console.log(`✓ List command detected: ${test2.data.listCommand}`);
        console.log(`✓ Action: ${test2.data.executionResult?.message || 'N/A'}`);
        console.log(`✓ Success: ${test2.data.executionResult?.success}`);
        console.log(`✓ AI Response: "${test2.data.answer}"`);
        
        // Test 3: Check debug endpoint
        console.log('\n3️⃣ Testing command analysis...');
        const test3 = await axios.post(`${API_BASE}/api/debug/analyze-command`, {
            prompt: "Delete salmon from grocery list and add apples"
        });
        console.log(`✓ Detected action: ${test3.data.analysis.action}`);
        console.log(`✓ Is modify_list: ${test3.data.analysis.action === 'modify_list'}`);
        
        // Summary
        console.log('\n📊 DEPLOYMENT STATUS:');
        if (test2.data.executionResult?.success && test3.data.analysis.action === 'modify_list') {
            console.log('✅ All fixes are deployed and working!');
        } else {
            console.log('❌ Deployment may still be in progress or fixes not fully applied');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

verifyDeployment();