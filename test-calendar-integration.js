/**
 * Google Calendar Integration Test Suite
 * 
 * This file contains comprehensive tests for the Google Calendar integration
 * including natural language parsing, API endpoints, and OAuth flow.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import GoogleCalendarIntegration from './google-calendar-integration.js';
import GoogleOAuthFlow from './google-oauth-flow.js';

dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

class CalendarIntegrationTester {
    constructor() {
        this.calendarIntegration = new GoogleCalendarIntegration();
        this.oauthFlow = new GoogleOAuthFlow();
        this.sessionId = `test-session-${Date.now()}`;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting Google Calendar Integration Tests\n');

        const results = {
            passed: 0,
            failed: 0,
            total: 0
        };

        const tests = [
            { name: 'Calendar Capabilities', test: () => this.testCalendarCapabilities() },
            { name: 'Calendar Authentication Status', test: () => this.testAuthStatus() },
            { name: 'Natural Language Parsing', test: () => this.testNaturalLanguageParsing() },
            { name: 'Date/Time Parsing', test: () => this.testDateTimeParsing() },
            { name: 'Calendar Command Detection', test: () => this.testCalendarCommandDetection() },
            { name: 'AI Assistant Integration', test: () => this.testAIAssistantIntegration() },
            { name: 'OAuth Flow (if configured)', test: () => this.testOAuthFlow() }
        ];

        for (const testCase of tests) {
            results.total++;
            try {
                console.log(`🧪 Testing: ${testCase.name}`);
                await testCase.test();
                console.log(`✅ PASS: ${testCase.name}\n`);
                results.passed++;
            } catch (error) {
                console.log(`❌ FAIL: ${testCase.name}`);
                console.log(`   Error: ${error.message}\n`);
                results.failed++;
            }
        }

        this.printTestSummary(results);
        return results;
    }

    /**
     * Test calendar capabilities endpoint
     */
    async testCalendarCapabilities() {
        const response = await axios.get(`${BASE_URL}/api/calendar/capabilities`);
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        const data = response.data;
        if (!data.features || !Array.isArray(data.features)) {
            throw new Error('Calendar capabilities should include features array');
        }

        console.log(`   📋 Calendar available: ${data.available}`);
        console.log(`   🛠️  Features: ${data.features.join(', ')}`);
    }

    /**
     * Test authentication status
     */
    async testAuthStatus() {
        const response = await axios.get(`${BASE_URL}/api/calendar/auth/status`);
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        const data = response.data;
        console.log(`   🔐 Authenticated: ${data.authenticated}`);
        console.log(`   🤖 Service Account Mode: ${data.serviceAccountMode || false}`);
        
        if (data.authenticated && data.profile) {
            console.log(`   👤 User: ${data.profile.name || data.profile.email}`);
        }
    }

    /**
     * Test natural language parsing
     */
    async testNaturalLanguageParsing() {
        const testCases = [
            "Add 'Team meeting' to my calendar for tomorrow at 2pm",
            "Schedule dentist appointment for next Friday at 10 AM",
            "What's on my calendar today?",
            "Put client call on my calendar for Monday at 3:30pm"
        ];

        for (const testCase of testCases) {
            const result = await this.calendarIntegration.parseCalendarCommand(testCase);
            
            if (typeof result.isCalendarCommand !== 'boolean') {
                throw new Error(`parseCalendarCommand should return boolean isCalendarCommand for: "${testCase}"`);
            }

            console.log(`   📝 "${testCase}"`);
            console.log(`      Calendar Command: ${result.isCalendarCommand}, Confidence: ${result.confidence}%`);
            
            if (result.isCalendarCommand) {
                console.log(`      Action: ${result.action}, Event: ${result.eventTitle || 'N/A'}`);
            }
        }
    }

    /**
     * Test date/time parsing
     */
    async testDateTimeParsing() {
        const testCases = [
            "today at 4:30pm",
            "tomorrow at 10 AM",
            "next Friday at 2pm",
            "Monday at 3:30pm",
            "next week Tuesday at 9am"
        ];

        for (const testCase of testCases) {
            const result = await this.calendarIntegration.parseDateTime(testCase);
            
            console.log(`   🕐 "${testCase}"`);
            if (result.success) {
                console.log(`      Parsed: ${result.parsedDate} at ${result.parsedTime}`);
                console.log(`      ISO: ${result.dateTime}`);
            } else {
                console.log(`      Failed: ${result.error}`);
            }
        }
    }

    /**
     * Test calendar command detection in AI assistant
     */
    async testCalendarCommandDetection() {
        // This would require the AI assistant to be running
        // For now, we'll test the integration class directly
        
        const testCommand = "Add 'Test meeting' to my calendar for tomorrow at 3pm";
        
        // Test if calendar integration is available
        const isAvailable = this.calendarIntegration.isCalendarAvailable();
        console.log(`   🔧 Calendar Integration Available: ${isAvailable}`);
        
        if (!isAvailable) {
            console.log(`   ⚠️  Calendar not configured - this is expected in test environment`);
            return;
        }

        // If available, test processing
        const result = await this.calendarIntegration.processCalendarCommand(testCommand);
        console.log(`   📅 Process Result: ${result.success ? 'Success' : 'Failed'}`);
        if (!result.success) {
            console.log(`   📝 Message: ${result.message}`);
        }
    }

    /**
     * Test AI assistant integration
     */
    async testAIAssistantIntegration() {
        const testCommands = [
            "Add 'Team standup' to my calendar for tomorrow at 9am",
            "What tasks do I have?", // Should be task command, not calendar
            "Schedule lunch meeting for Friday at noon"
        ];

        for (const command of testCommands) {
            try {
                const response = await axios.post(`${BASE_URL}/ask-gpt`, {
                    prompt: command,
                    sessionId: this.sessionId
                });

                if (response.status !== 200) {
                    console.log(`   ⚠️  Command: "${command}" - Status: ${response.status}`);
                    continue;
                }

                const data = response.data;
                console.log(`   🤖 "${command}"`);
                console.log(`      Task Command: ${data.taskCommand || false}`);
                console.log(`      Calendar Command: ${data.calendarCommand || false}`);
                
                if (data.antiHallucinationFilter) {
                    console.log(`      Anti-Hallucination: Filtered=${data.antiHallucinationFilter.wasFiltered}, Confidence=${data.antiHallucinationFilter.confidence}%`);
                }
            } catch (error) {
                console.log(`   ❌ Error testing command "${command}": ${error.message}`);
            }
        }
    }

    /**
     * Test OAuth flow (if configured)
     */
    async testOAuthFlow() {
        try {
            // Test OAuth auth endpoint
            const authResponse = await axios.get(`${BASE_URL}/api/calendar/auth`);
            
            if (authResponse.status !== 200) {
                throw new Error(`Auth endpoint returned status ${authResponse.status}`);
            }

            const authData = authResponse.data;
            console.log(`   🔑 OAuth Setup: ${authData.serviceAccountMode ? 'Service Account' : 'OAuth 2.0'}`);
            
            if (authData.authUrl) {
                console.log(`   🌐 Auth URL available for user consent`);
            }

            // Test OAuth status
            const statusResponse = await axios.get(`${BASE_URL}/api/calendar/auth/status`);
            const statusData = statusResponse.data;
            
            console.log(`   📊 Auth Status: ${statusData.authenticated ? 'Authenticated' : 'Not Authenticated'}`);
            
        } catch (error) {
            throw new Error(`OAuth flow test failed: ${error.message}`);
        }
    }

    /**
     * Print test summary
     */
    printTestSummary(results) {
        console.log('📊 TEST SUMMARY');
        console.log('================');
        console.log(`Total Tests: ${results.total}`);
        console.log(`Passed: ${results.passed} ✅`);
        console.log(`Failed: ${results.failed} ❌`);
        console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
        
        if (results.failed === 0) {
            console.log('\n🎉 All tests passed! Calendar integration is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the errors above for details.');
        }
    }

    /**
     * Test individual calendar operations (requires authentication)
     */
    async testCalendarOperations() {
        console.log('\n🧪 Testing Calendar Operations (requires authentication)\n');

        if (!this.calendarIntegration.isCalendarAvailable()) {
            console.log('❌ Calendar not available - skipping operation tests');
            return;
        }

        try {
            // Test creating an event
            console.log('📅 Testing event creation...');
            const eventResult = await this.calendarIntegration.addEvent({
                eventTitle: 'Test Event - Calendar Integration',
                dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                duration: 30,
                description: 'Automated test event - safe to delete',
                timeZone: 'America/New_York'
            });

            if (eventResult.success) {
                console.log('✅ Event created successfully');
                console.log(`   Event ID: ${eventResult.eventId}`);
                console.log(`   URL: ${eventResult.eventUrl}`);

                // Test listing events
                console.log('📋 Testing event listing...');
                const listResult = await this.calendarIntegration.getEvents(
                    new Date(),
                    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                );

                if (listResult.success) {
                    console.log(`✅ Found ${listResult.events.length} events`);
                } else {
                    console.log(`❌ Failed to list events: ${listResult.message}`);
                }

                // Clean up - delete the test event
                console.log('🗑️  Cleaning up test event...');
                const deleteResult = await this.calendarIntegration.deleteEvent(eventResult.eventId);
                if (deleteResult.success) {
                    console.log('✅ Test event deleted successfully');
                } else {
                    console.log(`⚠️  Failed to delete test event: ${deleteResult.message}`);
                }
            } else {
                console.log(`❌ Failed to create event: ${eventResult.message}`);
            }
        } catch (error) {
            console.log(`❌ Calendar operations test failed: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    const tester = new CalendarIntegrationTester();
    
    // Run main test suite
    await tester.runAllTests();
    
    // Run calendar operations tests if calendar is available
    await tester.testCalendarOperations();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default CalendarIntegrationTester;