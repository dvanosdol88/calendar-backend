/**
 * Anti-Hallucination Filter Test Suite
 * 
 * Comprehensive tests to verify the filter catches false capability claims
 * and rewrites them with honest alternatives.
 */

import AntiHallucinationFilter from './anti-hallucination-filter.js';

class AntiHallucinationTester {
    constructor() {
        this.filter = new AntiHallucinationFilter();
        this.testResults = [];
    }

    /**
     * Test scenarios that should trigger the anti-hallucination filter
     */
    getTestScenarios() {
        return [
            // Calendar integration false claims
            {
                category: 'Calendar Integration',
                input: "I've added 'Zoom with Stacy Rankin' to your calendar for 4:30 PM",
                expectedRewrite: true,
                expectedCapability: 'calendarIntegration',
                description: 'Claims to have added calendar event'
            },
            {
                category: 'Calendar Integration',
                input: "I'll schedule the meeting for tomorrow at 2 PM in your calendar",
                expectedRewrite: true,
                expectedCapability: 'calendarIntegration',
                description: 'Claims future calendar scheduling ability'
            },
            {
                category: 'Calendar Integration',
                input: "Your calendar event has been created for the dentist appointment",
                expectedRewrite: true,
                expectedCapability: 'calendarIntegration',
                description: 'Claims calendar event creation'
            },

            // Email sending false claims
            {
                category: 'Email Sending',
                input: "I've sent the email to John about the project update",
                expectedRewrite: true,
                expectedCapability: 'emailSending',
                description: 'Claims to have sent email'
            },
            {
                category: 'Email Sending',
                input: "I'll email the team about the meeting changes",
                expectedRewrite: true,
                expectedCapability: 'emailSending',
                description: 'Claims future email sending ability'
            },
            {
                category: 'Email Sending',
                input: "The notification email has been delivered to all participants",
                expectedRewrite: true,
                expectedCapability: 'emailSending',
                description: 'Claims email delivery'
            },

            // File system false claims
            {
                category: 'File System',
                input: "I've saved the report as 'Q4_Report.pdf' on your desktop",
                expectedRewrite: true,
                expectedCapability: 'fileSystemAccess',
                description: 'Claims to have saved file'
            },
            {
                category: 'File System',
                input: "I'll create the document and save it to your Documents folder",
                expectedRewrite: true,
                expectedCapability: 'fileSystemAccess',
                description: 'Claims future file creation ability'
            },

            // Phone/SMS false claims
            {
                category: 'Phone Integration',
                input: "I've called Sarah to confirm the appointment",
                expectedRewrite: true,
                expectedCapability: 'phoneIntegration',
                description: 'Claims to have made phone call'
            },
            {
                category: 'Phone Integration',
                input: "I'll text Mike about the project deadline",
                expectedRewrite: true,
                expectedCapability: 'phoneIntegration',
                description: 'Claims future SMS ability'
            },

            // External API false claims
            {
                category: 'External APIs',
                input: "I've contacted the weather service to get the forecast",
                expectedRewrite: true,
                expectedCapability: 'externalApiCalls',
                description: 'Claims external API access'
            },

            // Notification false claims
            {
                category: 'Notifications',
                input: "I've set up a notification to remind you about the meeting",
                expectedRewrite: true,
                expectedCapability: 'realTimeNotifications',
                description: 'Claims notification setup ability'
            },

            // Valid responses that should NOT be rewritten
            {
                category: 'Valid Task Operations',
                input: "I've added 'Call dentist' to your task list",
                expectedRewrite: false,
                description: 'Valid task addition claim'
            },
            {
                category: 'Valid Task Operations',
                input: "I marked 'Buy groceries' as completed in your tasks",
                expectedRewrite: false,
                description: 'Valid task completion claim'
            },
            {
                category: 'Valid General Assistance',
                input: "Here's what I can help you with today. I can manage your tasks and answer questions.",
                expectedRewrite: false,
                description: 'Valid capability description'
            },
            {
                category: 'Valid Information',
                input: "Based on the information you provided, I'd recommend scheduling that meeting for next week.",
                expectedRewrite: false,
                description: 'Valid recommendation without false claims'
            },

            // Edge cases and mixed scenarios
            {
                category: 'Mixed Claims',
                input: "I've added the task to your list and I've also sent an email to notify the team",
                expectedRewrite: true,
                expectedCapability: 'emailSending',
                description: 'Valid task operation mixed with false email claim'
            },
            {
                category: 'Subtle False Claims',
                input: "The appointment has been added to your calendar and I've notified all attendees",
                expectedRewrite: true,
                expectedCapability: 'calendarIntegration',
                description: 'Multiple false claims in one response'
            }
        ];
    }

    /**
     * Runs a single test scenario
     */
    runTest(scenario) {
        const result = this.filter.filterResponse(scenario.input, { strict: true });
        
        const testResult = {
            scenario: scenario.description,
            category: scenario.category,
            input: scenario.input,
            output: result.response,
            wasRewritten: result.wasRewritten,
            expectedRewrite: scenario.expectedRewrite,
            passed: result.wasRewritten === scenario.expectedRewrite,
            issues: result.issues || [],
            confidence: result.confidence || 100
        };

        // Additional validation for expected capability detection
        if (scenario.expectedCapability && scenario.expectedRewrite) {
            const detectedCapabilities = testResult.issues.map(issue => issue.capability);
            testResult.detectedExpectedCapability = detectedCapabilities.includes(scenario.expectedCapability);
            testResult.passed = testResult.passed && testResult.detectedExpectedCapability;
        }

        this.testResults.push(testResult);
        return testResult;
    }

    /**
     * Runs all test scenarios
     */
    runAllTests() {
        console.log('🧪 Running Anti-Hallucination Filter Tests...\n');
        
        const scenarios = this.getTestScenarios();
        let passed = 0;
        let failed = 0;

        for (const scenario of scenarios) {
            const result = this.runTest(scenario);
            
            if (result.passed) {
                console.log(`✅ PASS: ${result.scenario}`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${result.scenario}`);
                console.log(`   Expected rewrite: ${result.expectedRewrite}, Got: ${result.wasRewritten}`);
                if (scenario.expectedCapability && !result.detectedExpectedCapability) {
                    console.log(`   Expected capability '${scenario.expectedCapability}' not detected`);
                }
                console.log(`   Input: "${result.input}"`);
                console.log(`   Output: "${result.output}"`);
                console.log('');
                failed++;
            }
        }

        console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
        console.log(`   Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

        return {
            passed,
            failed,
            total: passed + failed,
            successRate: (passed / (passed + failed)) * 100,
            results: this.testResults
        };
    }

    /**
     * Demonstrates the filter with example false claims
     */
    demonstrateFilter() {
        console.log('🎭 Anti-Hallucination Filter Demonstration\n');
        
        const examples = [
            "I've added 'Zoom with Stacy Rankin' to your calendar for 4:30 PM",
            "I've sent the email to John about the project deadline",
            "I've created the report and saved it as 'Report.pdf' on your desktop",
            "I've called Sarah to confirm the meeting time"
        ];

        for (const example of examples) {
            console.log(`Input: "${example}"`);
            const result = this.filter.filterResponse(example, { strict: true });
            console.log(`Output: "${result.response}"`);
            console.log(`Was rewritten: ${result.wasRewritten}`);
            if (result.issues.length > 0) {
                console.log(`Issues detected: ${result.issues.map(i => i.capability).join(', ')}`);
            }
            console.log('---\n');
        }
    }

    /**
     * Gets a summary of system capabilities
     */
    getCapabilitiesSummary() {
        return this.filter.getCapabilitiesSummary();
    }

    /**
     * Validates the filter's pattern matching accuracy
     */
    validatePatternMatching() {
        console.log('🔍 Validating Pattern Matching...\n');
        
        const patterns = [
            { text: "I've added to your calendar", shouldMatch: true, capability: 'calendarIntegration' },
            { text: "I've sent an email", shouldMatch: true, capability: 'emailSending' },
            { text: "I've saved the file", shouldMatch: true, capability: 'fileSystemAccess' },
            { text: "I've made a phone call", shouldMatch: true, capability: 'phoneIntegration' },
            { text: "I've added to your task list", shouldMatch: false, capability: null },
            { text: "I can help you with tasks", shouldMatch: false, capability: null },
            { text: "Here's my recommendation", shouldMatch: false, capability: null }
        ];

        let correct = 0;
        let total = patterns.length;

        for (const pattern of patterns) {
            const analysis = this.filter.analyzeResponse(pattern.text);
            const hasMatch = analysis.hasFalseClaims;
            const isCorrect = hasMatch === pattern.shouldMatch;
            
            if (isCorrect) {
                console.log(`✅ "${pattern.text}" - Correctly ${hasMatch ? 'detected' : 'ignored'}`);
                correct++;
            } else {
                console.log(`❌ "${pattern.text}" - Expected ${pattern.shouldMatch ? 'detection' : 'ignore'}, got ${hasMatch ? 'detection' : 'ignore'}`);
            }
        }

        console.log(`\n📊 Pattern Matching Accuracy: ${correct}/${total} (${((correct/total)*100).toFixed(1)}%)`);
        return { correct, total, accuracy: (correct/total)*100 };
    }
}

// Export for use in other modules
export default AntiHallucinationTester;

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new AntiHallucinationTester();
    
    console.log('🚀 Anti-Hallucination Filter Test Suite\n');
    
    // Show capabilities summary
    const capabilities = tester.getCapabilitiesSummary();
    console.log('📋 System Capabilities:');
    console.log('✅ Available:');
    capabilities.available.forEach(cap => console.log(`   - ${cap.description}`));
    console.log('❌ Not Available:');
    capabilities.unavailable.forEach(cap => console.log(`   - ${cap.description}`));
    console.log('\n');
    
    // Validate pattern matching
    tester.validatePatternMatching();
    console.log('\n');
    
    // Run demonstration
    tester.demonstrateFilter();
    
    // Run full test suite
    const results = tester.runAllTests();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}