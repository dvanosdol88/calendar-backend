import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🧠 Debugging Command Parsing\n');

async function debugParsing() {
    try {
        // Test command parsing via debug endpoint
        console.log('Testing command parsing...');
        
        const response = await axios.post(`${API_BASE}/api/debug/analyze-command`, {
            prompt: "Please delete greek yogurt from the grocery list and add apples"
        });
        
        console.log('Command Analysis:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('❌ Debug endpoint not found - trying direct approach');
            
            // Try the main endpoint instead
            const mainResponse = await axios.post(`${API_BASE}/ask-gpt`, {
                prompt: "Please delete greek yogurt from the grocery list and add apples",
                sessionId: "debug_parsing"
            });
            
            console.log('Main endpoint response:');
            console.log(`List Command: ${mainResponse.data.listCommand}`);
            console.log(`Execution Result:`, mainResponse.data.executionResult);
            console.log(`AI Response: "${mainResponse.data.answer}"`);
            
        } else {
            console.error('Error:', error.response?.data || error.message);
        }
    }
}

debugParsing();