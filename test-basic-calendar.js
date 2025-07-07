/**
 * Basic Calendar Integration Test
 * 
 * This test verifies the basic structure and imports without requiring
 * full API configuration.
 */

import { google } from 'googleapis';

console.log('🚀 Basic Calendar Integration Test\n');

const tests = [];

// Test 1: Google APIs import
try {
    console.log('📦 Testing Google APIs import...');
    if (google && google.calendar && google.auth) {
        console.log('✅ Google APIs imported successfully');
        console.log(`   Calendar API version: ${google.calendar ? 'available' : 'not available'}`);
        console.log(`   Auth API: ${google.auth ? 'available' : 'not available'}`);
        tests.push({ name: 'Google APIs import', result: 'PASS' });
    } else {
        throw new Error('Google APIs not properly imported');
    }
} catch (error) {
    console.log(`❌ Google APIs import failed: ${error.message}`);
    tests.push({ name: 'Google APIs import', result: 'FAIL', error: error.message });
}

// Test 2: Calendar integration file structure
try {
    console.log('\n📁 Testing file structure...');
    
    const fs = await import('fs');
    const requiredFiles = [
        'google-calendar-integration.js',
        'google-oauth-flow.js',
        'GOOGLE_CALENDAR_SETUP.md',
        '.env.example'
    ];
    
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            console.log(`   ✅ ${file} exists`);
        } else {
            throw new Error(`Required file ${file} is missing`);
        }
    }
    
    tests.push({ name: 'File structure', result: 'PASS' });
} catch (error) {
    console.log(`❌ File structure test failed: ${error.message}`);
    tests.push({ name: 'File structure', result: 'FAIL', error: error.message });
}

// Test 3: Environment configuration
try {
    console.log('\n🔧 Testing environment configuration...');
    
    const fs = await import('fs');
    const envExample = fs.readFileSync('.env.example', 'utf8');
    
    const requiredVars = [
        'OPENAI_API_KEY',
        'GOOGLE_SERVICE_ACCOUNT_KEY',
        'GOOGLE_CLIENT_ID',
        'DEFAULT_TIMEZONE'
    ];
    
    for (const envVar of requiredVars) {
        if (envExample.includes(envVar)) {
            console.log(`   ✅ ${envVar} documented in .env.example`);
        } else {
            throw new Error(`Environment variable ${envVar} not documented`);
        }
    }
    
    tests.push({ name: 'Environment configuration', result: 'PASS' });
} catch (error) {
    console.log(`❌ Environment configuration test failed: ${error.message}`);
    tests.push({ name: 'Environment configuration', result: 'FAIL', error: error.message });
}

// Test 4: Calendar integration class import (without instantiation)
try {
    console.log('\n📚 Testing calendar integration class import...');
    
    const { GoogleCalendarIntegration } = await import('./google-calendar-integration.js');
    
    if (typeof GoogleCalendarIntegration === 'function') {
        console.log('   ✅ GoogleCalendarIntegration class imported successfully');
        
        // Check if it's a proper class
        const classString = GoogleCalendarIntegration.toString();
        if (classString.includes('class') || classString.includes('constructor')) {
            console.log('   ✅ GoogleCalendarIntegration appears to be a proper class');
        }
        
        tests.push({ name: 'Calendar integration class', result: 'PASS' });
    } else {
        throw new Error('GoogleCalendarIntegration is not a function/class');
    }
} catch (error) {
    console.log(`❌ Calendar integration class test failed: ${error.message}`);
    tests.push({ name: 'Calendar integration class', result: 'FAIL', error: error.message });
}

// Test 5: OAuth flow class import (without instantiation)
try {
    console.log('\n🔐 Testing OAuth flow class import...');
    
    const { GoogleOAuthFlow } = await import('./google-oauth-flow.js');
    
    if (typeof GoogleOAuthFlow === 'function') {
        console.log('   ✅ GoogleOAuthFlow class imported successfully');
        tests.push({ name: 'OAuth flow class', result: 'PASS' });
    } else {
        throw new Error('GoogleOAuthFlow is not a function/class');
    }
} catch (error) {
    console.log(`❌ OAuth flow class test failed: ${error.message}`);
    tests.push({ name: 'OAuth flow class', result: 'FAIL', error: error.message });
}

// Test 6: Package.json scripts
try {
    console.log('\n📋 Testing package.json scripts...');
    
    const fs = await import('fs');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = ['start', 'test-calendar'];
    
    for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
            console.log(`   ✅ Script '${script}' defined`);
        } else {
            throw new Error(`Script '${script}' not defined in package.json`);
        }
    }
    
    tests.push({ name: 'Package.json scripts', result: 'PASS' });
} catch (error) {
    console.log(`❌ Package.json scripts test failed: ${error.message}`);
    tests.push({ name: 'Package.json scripts', result: 'FAIL', error: error.message });
}

// Print test summary
console.log('\n📊 TEST SUMMARY');
console.log('================');

const passed = tests.filter(t => t.result === 'PASS').length;
const failed = tests.filter(t => t.result === 'FAIL').length;

console.log(`Total Tests: ${tests.length}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

if (failed === 0) {
    console.log('\n🎉 All basic tests passed! Calendar integration structure is correct.');
    console.log('\n📝 Next Steps:');
    console.log('1. Configure environment variables in .env file');
    console.log('2. Set up Google Calendar API credentials');
    console.log('3. Run full integration tests with npm run test-calendar');
} else {
    console.log('\n⚠️  Some tests failed. Calendar integration may not work correctly.');
    console.log('\nFailed tests:');
    tests.filter(t => t.result === 'FAIL').forEach(test => {
        console.log(`- ${test.name}: ${test.error}`);
    });
}

console.log('\n📖 For setup instructions, see GOOGLE_CALENDAR_SETUP.md');