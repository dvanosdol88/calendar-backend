import AITaskAssistant from './ai-task-assistant.js';

/**
 * Test script for the enhanced task matching system
 * 
 * This tests the scenarios mentioned in the requirements:
 * - "completed review of client portfolios" should NOT match "Complete CFA study session"
 * - Should require confirmation for low-confidence matches
 * - Should show confidence scores
 */

async function testEnhancedMatching() {
    console.log('🧪 Testing Enhanced Task Matching System\n');
    
    const assistant = new AITaskAssistant('http://localhost:3000');
    
    // Test cases that demonstrate the enhanced matching
    const testCases = [
        {
            search: "completed review of client portfolios",
            description: "Should NOT match 'Complete CFA study session' with high confidence"
        },
        {
            search: "review client portfolios", 
            description: "Should match 'Review client portfolios (work)' with high confidence"
        },
        {
            search: "CFA study",
            description: "Should match 'Complete CFA study session' with high confidence"
        },
        {
            search: "meeting",
            description: "Might match multiple tasks - should require clarification"
        },
        {
            search: "study session",
            description: "Should have moderate confidence for 'Complete CFA study session'"
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📝 Testing: "${testCase.search}"`);
        console.log(`Expected: ${testCase.description}`);
        console.log('---');
        
        try {
            const result = await assistant.findTasksByText(testCase.search);
            
            console.log(`Found: ${result.found}`);
            console.log(`Matches: ${result.matches.length}`);
            console.log(`Ambiguous: ${result.ambiguous}`);
            console.log(`Requires Confirmation: ${result.requiresConfirmation}`);
            console.log(`Highest Confidence: ${result.highestConfidence}%`);
            
            if (result.matches.length > 0) {
                console.log('\nTop matches:');
                result.matches.slice(0, 3).forEach((match, index) => {
                    console.log(`  ${index + 1}. "${match.text}" (${match.type}) - ${match.confidence}% confidence`);
                    if (match.matchDetails) {
                        console.log(`     Words found: [${match.matchDetails.wordsFound.join(', ')}]`);
                        console.log(`     Words not found: [${match.matchDetails.wordsNotFound.join(', ')}]`);
                    }
                });
            }
            
            // Test the complete task action
            console.log('\n🎯 Testing complete task action...');
            const completeResult = await assistant.completeTask(testCase.search);
            console.log(`Success: ${completeResult.success}`);
            console.log(`Message: ${completeResult.message}`);
            if (completeResult.confidence) {
                console.log(`Confidence: ${completeResult.confidence}%`);
            }
            if (completeResult.requiresConfirmation) {
                console.log('❗ REQUIRES CONFIRMATION');
            }
            if (completeResult.requiresClarification) {
                console.log('❗ REQUIRES CLARIFICATION');
            }
            
        } catch (error) {
            console.error(`Error testing "${testCase.search}":`, error.message);
        }
        
        console.log('\n' + '='.repeat(60));
    }
    
    // Test confirmation flow
    console.log('\n🔄 Testing Confirmation Flow');
    console.log('Simulating low-confidence match requiring confirmation...');
    
    try {
        // First, get a low-confidence match
        const searchResult = await assistant.findTasksByText("portfolio");
        if (searchResult.found && searchResult.requiresConfirmation) {
            console.log('✅ Got confirmation request as expected');
            
            // Test "Yes" response
            const yesResult = await assistant.handleConfirmationResponse(
                "Y", 
                searchResult.matches, 
                "complete"
            );
            console.log(`Yes response: ${yesResult.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`Message: ${yesResult.message}`);
            
            // Test "No" response  
            const noResult = await assistant.handleConfirmationResponse(
                "N", 
                searchResult.matches, 
                "complete"
            );
            console.log(`No response: ${noResult.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`Message: ${noResult.message}`);
        }
    } catch (error) {
        console.error('Error testing confirmation flow:', error.message);
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testEnhancedMatching().catch(console.error);
}

export default testEnhancedMatching;