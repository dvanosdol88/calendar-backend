import fetch from 'node-fetch';

const BACKEND_URL = 'https://calendar-backend-xwk6.onrender.com';

async function testCompoundOperation() {
    console.log('Testing compound list operation on live backend...\n');
    
    // Test 1: Delete salmon and add apples
    console.log('Test 1: "Delete salmon from the grocery list and add apples"');
    try {
        const response = await fetch(`${BACKEND_URL}/ask-gpt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: "Delete salmon from the grocery list and add apples",
                sessionId: "test-deployment-" + Date.now()
            })
        });
        
        const result = await response.json();
        
        console.log('Response received:');
        console.log('- isListCommand:', result.isListCommand);
        console.log('- success:', result.executionResult?.success);
        console.log('- message:', result.executionResult?.message);
        console.log('- operations count:', result.executionResult?.operations?.length);
        
        if (result.executionResult?.operations) {
            console.log('\nOperations executed:');
            result.executionResult.operations.forEach((op, i) => {
                console.log(`  ${i + 1}. ${op.message} (success: ${op.success})`);
            });
        }
        
        console.log('\n---\n');
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    // Test 2: Just delete salmon
    console.log('Test 2: "Delete salmon fillets from the grocery list"');
    try {
        const response = await fetch(`${BACKEND_URL}/ask-gpt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: "Delete salmon fillets from the grocery list",
                sessionId: "test-deployment-" + Date.now()
            })
        });
        
        const result = await response.json();
        
        console.log('Response received:');
        console.log('- isListCommand:', result.isListCommand);
        console.log('- success:', result.executionResult?.success);
        console.log('- message:', result.executionResult?.message);
        
        console.log('\n---\n');
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    // Test 3: Check what's in the list
    console.log('Test 3: "Show my grocery list"');
    try {
        const response = await fetch(`${BACKEND_URL}/ask-gpt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: "Show my grocery list",
                sessionId: "test-deployment-" + Date.now()
            })
        });
        
        const result = await response.json();
        
        console.log('Response received:');
        console.log('- isListCommand:', result.isListCommand);
        console.log('- success:', result.executionResult?.success);
        console.log('- message:', result.executionResult?.message);
        
        console.log('\n---\n');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the test
testCompoundOperation().catch(console.error);