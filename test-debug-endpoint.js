import axios from 'axios';

const API_BASE = 'https://calendar-backend-xwk6.onrender.com';

console.log('🔧 Testing Debug Endpoint\n');

async function testDebugEndpoint() {
    try {
        console.log('Testing debug endpoint...');
        
        const response = await axios.post(`${API_BASE}/api/debug/analyze-command`, {
            prompt: "Add milk to grocery list"
        });
        
        console.log('Debug response:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('❌ Debug endpoint not found - deployment may not be ready yet');
        } else {
            console.error('Error:', error.response?.data || error.message);
        }
    }
}

testDebugEndpoint();