/**
 * Anti-Hallucination Safeguards
 * Prevents AI from claiming capabilities it doesn't have
 */

import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

export class AntiHallucinationSafeguards {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Define available capabilities
        this.capabilities = {
            // Core capabilities
            task_management: {
                available: true,
                description: 'Add, complete, delete, and manage tasks'
            },
            conversation_memory: {
                available: true,
                description: 'Remember conversation context and history'
            },
            
            // Calendar capabilities (conditional)
            calendar_integration: {
                available: false, // Will be set based on configuration
                description: 'Add, update, and retrieve Google Calendar events'
            },
            
            // Explicitly unavailable capabilities
            email_integration: {
                available: false,
                description: 'Send, receive, or manage emails'
            },
            file_system_access: {
                available: false,
                description: 'Read, write, or manage files on the system'
            },
            external_api_calls: {
                available: false,
                description: 'Make calls to external APIs or services'
            },
            database_management: {
                available: false,
                description: 'Directly access or modify databases'
            },
            system_commands: {
                available: false,
                description: 'Execute system commands or scripts'
            },
            web_browsing: {
                available: false,
                description: 'Browse the internet or access web pages'
            },
            real_time_data: {
                available: false,
                description: 'Access real-time data feeds or live information'
            }
        };
    }

    /**
     * Set calendar integration availability
     */
    setCalendarIntegration(isAvailable) {
        this.capabilities.calendar_integration.available = isAvailable;
    }

    /**
     * Analyze user input for capability claims
     */
    async analyzeCapabilityClaims(userInput, proposedResponse) {
        const systemPrompt = `You are a capability claims detector. Analyze the AI response to identify any claims about capabilities or actions.

        Look for claims like:
        - "I will send an email..."
        - "I have added this to your calendar..."
        - "I will access the database..."
        - "I can browse the web..."
        - "I will download the file..."
        - "I have executed the command..."

        Response format (JSON only):
        {
            "containsClaims": boolean,
            "claims": [
                {
                    "capability": "email_integration|calendar_integration|file_system_access|etc",
                    "claimText": "exact text of the claim",
                    "confidence": 0-100
                }
            ],
            "riskLevel": "low|medium|high"
        }`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `User input: "${userInput}"\n\nProposed AI response: "${proposedResponse}"` }
                ],
                temperature: 0.1,
                max_tokens: 300
            });

            const response = completion.choices[0].message.content.trim();
            return JSON.parse(response);
        } catch (error) {
            console.error('Error analyzing capability claims:', error);
            return { 
                containsClaims: false, 
                claims: [], 
                riskLevel: 'low' 
            };
        }
    }

    /**
     * Validate claimed capabilities against available ones
     */
    validateClaims(claims) {
        const violations = [];
        
        for (const claim of claims) {
            const capability = this.capabilities[claim.capability];
            
            if (!capability || !capability.available) {
                violations.push({
                    ...claim,
                    reason: capability 
                        ? `${claim.capability} is not available`
                        : `${claim.capability} is not a recognized capability`
                });
            }
        }
        
        return {
            isValid: violations.length === 0,
            violations,
            totalClaims: claims.length,
            invalidClaims: violations.length
        };
    }

    /**
     * Generate corrected response that removes false claims
     */
    async generateCorrectedResponse(userInput, originalResponse, violations) {
        const availableCapabilities = Object.entries(this.capabilities)
            .filter(([_, cap]) => cap.available)
            .map(([name, cap]) => `${name}: ${cap.description}`)
            .join('\n');

        const systemPrompt = `You are a helpful AI assistant. Rewrite the response to remove false capability claims.

        RULES:
        1. Remove any claims about capabilities that are not available
        2. Be honest about limitations
        3. Suggest alternatives using available capabilities
        4. Maintain a helpful tone

        Available capabilities:
        ${availableCapabilities}

        Violations to fix:
        ${violations.map(v => `- ${v.claimText} (${v.reason})`).join('\n')}`;

        const userPrompt = `User asked: "${userInput}"
        
        Original response: "${originalResponse}"
        
        Rewrite this response to remove false claims and be honest about capabilities.`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 300
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error generating corrected response:', error);
            return this.generateFallbackResponse(violations);
        }
    }

    /**
     * Generate fallback response for severe violations
     */
    generateFallbackResponse(violations) {
        const unavailableCapabilities = violations.map(v => v.capability).join(', ');
        
        const availableCapabilities = Object.entries(this.capabilities)
            .filter(([_, cap]) => cap.available)
            .map(([name, cap]) => `• ${cap.description}`)
            .join('\n');

        return `I apologize, but I cannot ${unavailableCapabilities.replace(/_/g, ' ')} as that capability is not available to me.

Here's what I can help you with:
${availableCapabilities}

Please let me know how I can assist you using my available capabilities.`;
    }

    /**
     * Validate response before sending to user
     */
    async validateResponse(userInput, proposedResponse, actionTaken = null) {
        // Skip validation for simple acknowledgments
        if (proposedResponse.length < 50 && !proposedResponse.includes('I will') && !proposedResponse.includes('I have')) {
            return {
                isValid: true,
                response: proposedResponse,
                warnings: []
            };
        }

        // Analyze for capability claims
        const analysis = await this.analyzeCapabilityClaims(userInput, proposedResponse);
        
        if (!analysis.containsClaims) {
            return {
                isValid: true,
                response: proposedResponse,
                warnings: []
            };
        }

        // Validate claims
        const validation = this.validateClaims(analysis.claims);
        
        if (validation.isValid) {
            return {
                isValid: true,
                response: proposedResponse,
                warnings: []
            };
        }

        // Generate corrected response
        const correctedResponse = await this.generateCorrectedResponse(
            userInput, 
            proposedResponse, 
            validation.violations
        );

        return {
            isValid: false,
            response: correctedResponse,
            violations: validation.violations,
            warnings: validation.violations.map(v => 
                `Removed false claim: ${v.claimText} (${v.reason})`
            )
        };
    }

    /**
     * Validate specific action before execution
     */
    async validateAction(action, details) {
        const actionCapabilityMap = {
            'send_email': 'email_integration',
            'add_calendar_event': 'calendar_integration',
            'read_file': 'file_system_access',
            'write_file': 'file_system_access',
            'execute_command': 'system_commands',
            'browse_web': 'web_browsing',
            'access_database': 'database_management',
            'external_api': 'external_api_calls'
        };

        const requiredCapability = actionCapabilityMap[action];
        
        if (!requiredCapability) {
            return {
                allowed: false,
                reason: `Unknown action: ${action}`
            };
        }

        const capability = this.capabilities[requiredCapability];
        
        if (!capability || !capability.available) {
            return {
                allowed: false,
                reason: `${requiredCapability.replace(/_/g, ' ')} is not available`,
                suggestion: this.suggestAlternative(action)
            };
        }

        return {
            allowed: true,
            capability: requiredCapability
        };
    }

    /**
     * Suggest alternative actions for unavailable capabilities
     */
    suggestAlternative(action) {
        const alternatives = {
            'send_email': 'I can help you draft an email or add a reminder to contact someone',
            'add_calendar_event': 'I can add this as a task reminder instead',
            'read_file': 'I can help you create a task to review the file',
            'write_file': 'I can help you organize information in a task list',
            'execute_command': 'I can help you plan the steps or add this as a task',
            'browse_web': 'I can help you add a task to research this information',
            'access_database': 'I can help you organize this information in tasks',
            'external_api': 'I can help you track this as a task or reminder'
        };

        return alternatives[action] || 'I can help you manage this through my available task management capabilities';
    }

    /**
     * Get list of available capabilities for user
     */
    getAvailableCapabilities() {
        return Object.entries(this.capabilities)
            .filter(([_, cap]) => cap.available)
            .map(([name, cap]) => ({
                name: name.replace(/_/g, ' '),
                description: cap.description
            }));
    }

    /**
     * Get capability status report
     */
    getCapabilityStatus() {
        const available = Object.entries(this.capabilities)
            .filter(([_, cap]) => cap.available)
            .map(([name, _]) => name);
            
        const unavailable = Object.entries(this.capabilities)
            .filter(([_, cap]) => !cap.available)
            .map(([name, _]) => name);

        return {
            available: available.length,
            unavailable: unavailable.length,
            total: available.length + unavailable.length,
            availableCapabilities: available,
            unavailableCapabilities: unavailable
        };
    }
}

export default AntiHallucinationSafeguards;