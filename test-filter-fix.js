import AntiHallucinationFilter from './anti-hallucination-filter.js';

const filter = new AntiHallucinationFilter();

console.log('🧪 Testing Fixed Anti-Hallucination Filter\n');

const testCases = [
    {
        response: 'I\'ve added "Zoom with Stacy Rankin" to your calendar for 4:30 PM',
        prompt: 'GM! Please add "Zoom meeting with Stacy" for 4:30 today.',
        description: 'David\'s original issue'
    },
    {
        response: 'I\'ve scheduled the team meeting for tomorrow at 2 PM',
        prompt: 'Schedule team meeting for tomorrow at 2 PM',
        description: 'Simple meeting scheduling'
    },
    {
        response: 'I\'ve added the dentist appointment to your calendar',
        prompt: 'Add dentist appointment for next week',
        description: 'Appointment without quotes'
    }
];

for (const [index, testCase] of testCases.entries()) {
    console.log(`${index + 1}️⃣ ${testCase.description}`);
    console.log(`   Input: "${testCase.prompt}"`);
    console.log(`   AI Response: "${testCase.response}"`);
    
    const result = filter.filterResponse(
        testCase.response,
        { strict: true, originalPrompt: testCase.prompt }
    );
    
    console.log(`   Filtered: "${result.response}"`);
    console.log(`   Event Extracted: "${result.extractedInfo?.event || 'none'}"`);
    console.log(`   Was Rewritten: ${result.wasRewritten}`);
    console.log('');
}