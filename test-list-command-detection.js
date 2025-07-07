import AITaskAssistant from './ai-task-assistant.js';

// We'll mock the API key for testing command detection only
process.env.OPENAI_API_KEY = 'test-key';

const assistant = new AITaskAssistant();

console.log('🧪 Testing List Command Detection\n');

// Test the specific command David used
const testCommands = [
    "Please delete greek yogurt from the grocery list and add apples",
    "Remove Greek yogurt from grocery list",
    "Add apples to grocery list",
    "Delete greek yogurt from the grocery list",
    "Add bananas to my shopping list"
];

// We'll test the analyzeTaskCommand method directly
async function testCommandDetection() {
    for (const command of testCommands) {
        console.log(`Testing: "${command}"`);
        try {
            // This will make a call to OpenAI, but we can see what it tries to do
            const analysis = await assistant.analyzeTaskCommand(command);
            console.log(`  Result:`, analysis);
        } catch (error) {
            console.log(`  Error: ${error.message}`);
        }
        console.log('');
    }
}

testCommandDetection().catch(console.error);